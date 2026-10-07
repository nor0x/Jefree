export type Modality = 'text' | 'image' | 'audio' | 'video'

export interface ItemMeta {
  modality: Modality
  /** Short name shown in the matrix and card title. */
  label: string
  /** Secondary line, e.g. the prefixed text or the media duration. */
  detail?: string
  /** Object URL of the original file, for previews. */
  mediaUrl?: string
  /** First video frame as a data URL. */
  poster?: string
  /** Warning about how the input was trimmed. */
  note?: string
}

export interface Item extends ItemMeta {
  id: number
  /** Full 768-d, L2-normalized embedding. */
  vector: Float32Array
  tokens: number
  elapsedMs: number
}
