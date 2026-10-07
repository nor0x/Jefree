/// <reference lib="webworker" />
import {
  AutoModel,
  AutoProcessor,
  RawImage,
  RawVideo,
  RawVideoFrame,
  Tensor,
  type PreTrainedModel,
  type Processor,
} from '@huggingface/transformers'
import { MODEL_ID, type Backend, type Dtype, type EmbedInput, type WorkerRequest, type WorkerResponse } from './protocol'

declare const self: DedicatedWorkerGlobalScope

interface Loaded {
  processor: Processor
  model: PreTrainedModel
  backend: Backend
  dtype: Dtype
}

let current: Loaded | undefined
// Requests run one at a time: the model is not safe to call concurrently.
let queue: Promise<unknown> = Promise.resolve()

function post(message: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, transfer)
}

async function detectBackend(): Promise<Backend> {
  try {
    const adapter = await (navigator as Navigator & { gpu?: GPU }).gpu?.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

function disposeTensors(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (value instanceof Tensor) {
    try {
      value.dispose()
    } catch {
      // already released
    }
  } else if (Array.isArray(value)) {
    for (const item of value) disposeTensors(item, seen)
  } else if (!ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer)) {
    for (const item of Object.values(value)) disposeTensors(item, seen)
  }
}

async function load(dtype: Dtype): Promise<Loaded> {
  if (current?.dtype === dtype) return current
  if (current) {
    await current.model.dispose().catch(() => undefined)
    current = undefined
  }

  const backend = await detectBackend()
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID),
    AutoModel.from_pretrained(MODEL_ID, {
      device: backend,
      dtype,
      progress_callback: (info) => {
        if (info.status === 'progress_total') {
          post({ type: 'progress', progress: info.progress, loaded: info.loaded, total: info.total })
        }
      },
    }),
  ])
  const result = { processor, model, backend, dtype }
  await run(result, { type: 'text', text: 'task: search result | query: warm up' })
  current = result
  return result
}

async function prepare(processor: Processor, input: EmbedInput) {
  switch (input.type) {
    case 'text':
      return processor(input.text)
    case 'image':
      return processor(null, await RawImage.fromBlob(input.blob))
    case 'audio':
      return processor(null, null, input.samples)
    case 'video': {
      const frames = input.frames.map(
        (f) => new RawVideoFrame(new RawImage(f.data, f.width, f.height, 4), f.timestamp),
      )
      return processor(null, null, null, new RawVideo(frames, input.duration))
    }
  }
}

async function run({ processor, model }: Loaded, input: EmbedInput) {
  let inputs: Record<string, unknown> | undefined
  let outputs: Record<string, unknown> | undefined
  try {
    inputs = await prepare(processor, input)
    const tokens = (inputs!.input_ids as Tensor).dims.at(-1) ?? 0
    outputs = await model(inputs)
    const embedding = outputs!.sentence_embedding as Tensor
    const values = Float32Array.from((embedding.tolist() as number[][])[0])
    return { values, tokens }
  } finally {
    disposeTensors([inputs, outputs])
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task)
  queue = next.catch(() => undefined)
  return next
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'number') return `ONNX Runtime error code ${error}`
  return String(error)
}

self.addEventListener('message', async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      const { backend } = await enqueue(() => load(data.dtype))
      post({ type: 'loaded', id: data.id, backend })
    } else if (data.type === 'embed') {
      const { values, tokens, elapsedMs } = await enqueue(async () => {
        if (!current) throw new Error('Load the model before embedding.')
        const start = performance.now()
        const result = await run(current, data.input)
        return { ...result, elapsedMs: performance.now() - start }
      })
      post({ type: 'embedded', id: data.id, values, tokens, elapsedMs }, [values.buffer])
    }
  } catch (error) {
    post({ type: 'error', id: data.id, message: errorMessage(error) })
  }
})
