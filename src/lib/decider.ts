import { Decider } from './decision'
import { embedder } from './embedder.svelte'

// Module-level so cached option embeddings survive switching views.
export const decider = new Decider(
  (input) => embedder.embed(input),
  () => `embeddinggemma-2-onnx-${embedder.dtype}`,
)
