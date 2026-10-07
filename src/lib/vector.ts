export const DIMENSIONS = [768, 512, 256, 128] as const
export type Dimension = (typeof DIMENSIONS)[number]

/** Matryoshka truncation: keep the leading dims, then re-normalize to unit length. */
export function truncateNormalize(vector: Float32Array, dim: number): Float32Array {
  const out = vector.slice(0, dim)
  let norm = 0
  for (const x of out) norm += x * x
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < out.length; i++) out[i] /= norm
  return out
}

/** Cosine similarity of two unit vectors. */
export function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

export function stats(vector: Float32Array) {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let squares = 0
  for (const x of vector) {
    if (x < min) min = x
    if (x > max) max = x
    sum += x
    squares += x * x
  }
  const mean = sum / vector.length
  return {
    min,
    max,
    mean,
    std: Math.sqrt(Math.max(0, squares / vector.length - mean * mean)),
    norm: Math.sqrt(squares),
  }
}
