import type { Backend, Dtype, EmbedInput, WorkerRequest, WorkerResponse } from './worker/protocol'

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface EmbedResult {
  values: Float32Array
  tokens: number
  elapsedMs: number
}

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void }

class Embedder {
  status = $state<ModelStatus>('idle')
  progress = $state(0)
  loadedBytes = $state(0)
  totalBytes = $state(0)
  backend = $state<Backend | null>(null)
  dtype = $state<Dtype>('q4')
  error = $state<string | null>(null)

  #worker: Worker | undefined
  #nextId = 0
  #pending = new Map<number, Pending>()

  #getWorker() {
    if (!this.#worker) {
      this.#worker = new Worker(new URL('./worker/embed.worker.ts', import.meta.url), { type: 'module' })
      this.#worker.addEventListener('message', ({ data }: MessageEvent<WorkerResponse>) => this.#onMessage(data))
      this.#worker.addEventListener('error', (event) => {
        this.status = 'error'
        this.error = event.message || 'The model worker crashed.'
        for (const { reject } of this.#pending.values()) reject(new Error(this.error))
        this.#pending.clear()
      })
    }
    return this.#worker
  }

  #onMessage(message: WorkerResponse) {
    if (message.type === 'progress') {
      this.progress = message.progress
      this.loadedBytes = message.loaded
      this.totalBytes = message.total
      return
    }
    const pending = this.#pending.get(message.id)
    if (!pending) return
    this.#pending.delete(message.id)
    if (message.type === 'error') pending.reject(new Error(message.message))
    else pending.resolve(message as never)
  }

  #request<T extends WorkerResponse>(request: WorkerRequest, transfer: Transferable[] = []): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(request.id, { resolve: resolve as (value: never) => void, reject })
      this.#getWorker().postMessage(request, transfer)
    })
  }

  async load(dtype: Dtype = this.dtype) {
    this.dtype = dtype
    this.status = 'loading'
    this.error = null
    this.progress = 0
    try {
      const { backend } = await this.#request<Extract<WorkerResponse, { type: 'loaded' }>>({
        type: 'load',
        id: this.#nextId++,
        dtype,
      })
      this.backend = backend
      this.status = 'ready'
    } catch (error) {
      this.status = 'error'
      this.error = (error as Error).message
    }
  }

  async embed(input: EmbedInput): Promise<EmbedResult> {
    const transfer: Transferable[] = []
    if (input.type === 'audio') transfer.push(input.samples.buffer as ArrayBuffer)
    if (input.type === 'video') transfer.push(...input.frames.map((f) => f.data.buffer as ArrayBuffer))
    const { values, tokens, elapsedMs } = await this.#request<Extract<WorkerResponse, { type: 'embedded' }>>(
      { type: 'embed', id: this.#nextId++, input },
      transfer,
    )
    return { values, tokens, elapsedMs }
  }
}

export const embedder = new Embedder()
