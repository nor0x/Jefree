import type { EmbedInput, VideoFrameData } from './worker/protocol'
import type { ItemMeta } from './types'

export const AUDIO_SAMPLE_RATE = 16_000
// Keep inputs under ~2,700 tokens: ONNX Runtime WebGPU kernels hit a dispatch limit above that.
// Audio costs 25 tokens/s, video 140 tokens/frame.
export const MAX_AUDIO_SECONDS = 90
export const MAX_VIDEO_FRAMES = 16
const MAX_FRAME_SIDE = 768

export interface PreparedMedia {
  input: EmbedInput
  meta: ItemMeta
}

export async function decodeAudio16kMono(blob: Blob, maxSeconds = MAX_AUDIO_SECONDS) {
  const context = new OfflineAudioContext(1, 1, AUDIO_SAMPLE_RATE)
  const buffer = await context.decodeAudioData(await blob.arrayBuffer())
  const length = Math.min(buffer.length, Math.round(maxSeconds * buffer.sampleRate))
  const samples = new Float32Array(length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channel = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) samples[i] += channel[i] / buffer.numberOfChannels
  }
  return { samples, duration: buffer.duration, truncated: length < buffer.length }
}

function once(target: EventTarget, event: string) {
  return new Promise<void>((resolve, reject) => {
    const onError = () => {
      cleanup()
      reject(new Error('Could not decode this video in the browser.'))
    }
    const onEvent = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      target.removeEventListener(event, onEvent)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onEvent)
    target.addEventListener('error', onError)
  })
}

export async function sampleVideoFrames(blob: Blob, { fps = 1, maxFrames = MAX_VIDEO_FRAMES } = {}) {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await once(video, 'loadedmetadata')
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('This video has no readable duration.')

    const wanted = Math.max(1, Math.floor(duration * fps))
    const count = Math.min(wanted, maxFrames)
    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const frames: VideoFrameData[] = []
    let poster = ''
    for (let i = 0; i < count; i++) {
      // 1 frame per second when it fits, otherwise spread `maxFrames` uniformly over the clip.
      const timestamp = wanted <= maxFrames ? Math.min(i / fps, duration - 0.001) : ((i + 0.5) * duration) / count
      video.currentTime = timestamp
      await once(video, 'seeked')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      frames.push({ data, width: canvas.width, height: canvas.height, timestamp })
      if (i === 0) poster = canvas.toDataURL('image/jpeg', 0.8)
    }
    return { frames, duration, poster, truncated: wanted > maxFrames }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

function seconds(value: number) {
  return `${value.toFixed(1)} s`
}

const EXTENSIONS: Record<string, 'image' | 'audio' | 'video'> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', bmp: 'image', avif: 'image',
  wav: 'audio', mp3: 'audio', ogg: 'audio', oga: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio', opus: 'audio',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video', mkv: 'video',
}

/** MIME type first; servers often send media as application/octet-stream, so fall back to the extension. */
export function mediaKind(blob: Blob, name: string) {
  const fromMime = blob.type.split('/')[0]
  if (fromMime === 'image' || fromMime === 'audio' || fromMime === 'video') return fromMime
  return EXTENSIONS[name.split('.').pop()?.toLowerCase() ?? '']
}

export async function prepareMedia(blob: Blob, name: string): Promise<PreparedMedia> {
  const kind = mediaKind(blob, name)
  if (kind === 'image') {
    return {
      input: { type: 'image', blob },
      meta: { modality: 'image', label: name, mediaUrl: URL.createObjectURL(blob) },
    }
  }
  if (kind === 'audio') {
    const { samples, duration, truncated } = await decodeAudio16kMono(blob)
    return {
      input: { type: 'audio', samples },
      meta: {
        modality: 'audio',
        label: name,
        detail: seconds(duration),
        mediaUrl: URL.createObjectURL(blob),
        note: truncated ? `Only the first ${MAX_AUDIO_SECONDS} s were embedded (WebGPU token limit).` : undefined,
      },
    }
  }
  if (kind === 'video') {
    const { frames, duration, poster, truncated } = await sampleVideoFrames(blob)
    return {
      input: { type: 'video', frames, duration },
      meta: {
        modality: 'video',
        label: name,
        detail: `${seconds(duration)} · ${frames.length} frames`,
        mediaUrl: URL.createObjectURL(blob),
        poster,
        note: truncated ? `Sampled ${frames.length} frames evenly instead of 1 per second (WebGPU token limit).` : undefined,
      },
    }
  }
  throw new Error(`Unsupported file type "${blob.type || 'unknown'}" for ${name}.`)
}

export async function fetchMedia(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status}).`)
  const blob = await response.blob()
  return prepareMedia(blob, decodeURIComponent(url.split('/').pop() ?? url))
}
