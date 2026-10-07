export const MODEL_ID = 'onnx-community/embeddinggemma-2-ONNX'
export const EMBEDDING_DIM = 768

export type Dtype = 'q4' | 'q4f16' | 'q8' | 'fp16'
export type Backend = 'webgpu' | 'wasm'

export interface VideoFrameData {
  data: Uint8ClampedArray
  width: number
  height: number
  timestamp: number
}

export type EmbedInput =
  | { type: 'text'; text: string }
  | { type: 'image'; blob: Blob }
  | { type: 'audio'; samples: Float32Array }
  | { type: 'video'; frames: VideoFrameData[]; duration: number }

export type WorkerRequest =
  | { type: 'load'; id: number; dtype: Dtype }
  | { type: 'embed'; id: number; input: EmbedInput }

export type WorkerResponse =
  | { type: 'progress'; progress: number; loaded: number; total: number }
  | { type: 'loaded'; id: number; backend: Backend }
  | { type: 'embedded'; id: number; values: Float32Array; tokens: number; elapsedMs: number }
  | { type: 'error'; id: number; message: string }
