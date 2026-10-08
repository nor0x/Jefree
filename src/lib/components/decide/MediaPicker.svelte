<script lang="ts">
  import { loadAsset, MAX_AUDIO_SECONDS, MAX_VIDEO_FRAMES, type MediaAsset } from '../../media'
  import Icon from '../Icon.svelte'

  type Kind = 'image' | 'audio' | 'video'

  interface Props {
    kind: Kind
    media: MediaAsset | null
    onchange: (media: MediaAsset | null) => void
    disabled?: boolean
  }
  let { kind, media, onchange, disabled = false }: Props = $props()

  const COPY: Record<Kind, { noun: string; hint: string }> = {
    image: { noun: 'a photo', hint: 'JPG, PNG, WebP…' },
    audio: { noun: 'a sound', hint: `Speech, music or noise · first ${MAX_AUDIO_SECONDS} s are used` },
    video: { noun: 'a video', hint: `Short clips work best · up to ${MAX_VIDEO_FRAMES} frames are sampled` },
  }

  let dragging = $state(false)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let fileInput = $state<HTMLInputElement>()
  let recorder: MediaRecorder | null = null
  let recording = $state(false)
  let seconds = $state(0)
  let timer: ReturnType<typeof setInterval> | undefined

  const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  async function use(blob: Blob, name: string) {
    busy = true
    error = null
    try {
      const asset = await loadAsset(blob, name)
      if (asset.meta.modality !== kind) {
        asset.release()
        throw new Error(`That file is not ${COPY[kind].noun}.`)
      }
      media?.release()
      onchange(asset)
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function pick(files: FileList | null | undefined) {
    const file = files?.[0]
    if (file && !disabled) use(file, file.name)
  }

  function remove() {
    media?.release()
    onchange(null)
  }

  async function startRecording() {
    error = null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timer)
        recording = false
        const type = rec.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        use(new Blob(chunks, { type }), `Recording.${ext}`)
      }
      rec.start()
      recorder = rec
      recording = true
      seconds = 0
      timer = setInterval(() => {
        seconds++
        if (seconds >= MAX_AUDIO_SECONDS) stopRecording()
      }, 1000)
    } catch (e) {
      error = (e as Error).name === 'NotAllowedError' ? 'Microphone access was blocked.' : (e as Error).message
    }
  }

  function stopRecording() {
    recorder?.stop()
    recorder = null
  }

  const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>

{#if media}
  <div class="preview glass">
    {#if media.meta.modality === 'image'}
      <img src={media.meta.mediaUrl} alt={media.meta.label} />
    {:else if media.meta.modality === 'video'}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={media.meta.mediaUrl} poster={media.meta.poster} controls playsinline></video>
    {:else}
      <div class="wave"><Icon name="audio" size={28} /></div>
    {/if}
    <div class="info">
      <div class="row">
        <span class="name">{media.meta.label}</span>
        <button class="icon" aria-label="Remove {media.meta.label}" onclick={remove} {disabled}><Icon name="close" /></button>
      </div>
      {#if media.meta.detail}<span class="muted small">{media.meta.detail}</span>{/if}
      {#if media.meta.modality === 'audio'}<audio src={media.meta.mediaUrl} controls></audio>{/if}
      {#if media.meta.note}<span class="muted small">{media.meta.note}</span>{/if}
    </div>
  </div>
{:else}
  <div
    class="drop"
    class:dragging
    class:disabled
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled}
    ondragover={(e) => {
      e.preventDefault()
      if (!disabled) dragging = true
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(e) => {
      e.preventDefault()
      dragging = false
      pick(e.dataTransfer?.files)
    }}
    onclick={() => !disabled && !recording && fileInput?.click()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && fileInput?.click()}
  >
    {#if busy}
      <span class="spinner"></span>
      <span>Preparing…</span>
    {:else if recording}
      <span class="rec"></span>
      <span>Recording · {clock(seconds)}</span>
    {:else}
      <Icon name="upload" size={20} />
      <span>Drop {COPY[kind].noun} or <u>browse</u></span>
      <span class="muted small">{COPY[kind].hint}</span>
    {/if}
  </div>
  {#if kind === 'audio' && canRecord}
    <div class="actions">
      {#if recording}
        <button onclick={stopRecording}><Icon name="stop" /> Stop recording</button>
      {:else}
        <button onclick={startRecording} disabled={disabled || busy}><Icon name="mic" /> Record with microphone</button>
      {/if}
    </div>
  {/if}
  <input
    bind:this={fileInput}
    type="file"
    accept="{kind}/*"
    hidden
    onchange={(e) => {
      pick(e.currentTarget.files)
      e.currentTarget.value = ''
    }}
  />
{/if}
{#if error}<p class="error">{error}</p>{/if}

<style>
  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 148px;
    padding: 20px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius);
    background: var(--glass);
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .drop:hover:not(.disabled),
  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .drop.disabled {
    cursor: not-allowed;
  }
  .drop u {
    text-decoration-color: var(--accent);
    text-underline-offset: 3px;
  }
  .rec {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      box-shadow: 0 0 0 8px transparent;
    }
  }
  .actions {
    display: flex;
    margin-top: 10px;
  }
  .preview {
    display: flex;
    gap: 14px;
    padding: 10px;
    align-items: flex-start;
  }
  .preview img,
  .preview video,
  .wave {
    width: 132px;
    max-height: 132px;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 8px;
    background: var(--surface-2);
    flex: none;
  }
  .wave {
    display: grid;
    place-items: center;
    color: var(--accent-ink);
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  audio {
    width: 100%;
    height: 36px;
    margin-top: 4px;
  }
  .error {
    margin-top: 10px;
  }
  @media (max-width: 480px) {
    .preview {
      flex-direction: column;
    }
    .preview img,
    .preview video,
    .wave {
      width: 100%;
      max-height: 220px;
      aspect-ratio: auto;
    }
    .wave {
      height: 72px;
    }
  }
</style>
