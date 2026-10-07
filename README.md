# EmbeddingGemma 2 Playground

Embed text, images, audio and video with [EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2) entirely in the browser (WebGPU, WASM fallback) and compare the vectors. No backend: the [ONNX weights](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) are downloaded once and cached by the browser.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
```

- **Text**: pick a task prefix (search query, document, classification, …); the exact model input is previewed.
- **Media**: drop images, audio (resampled to 16 kHz mono, first 90 s) or video (1 fps, max 16 frames). The caps keep inputs under the ~2,700-token WebGPU limit.
- **Results**: per-item heatmap, stats and JSON export; cosine-similarity matrix and nearest-neighbour ranking. The 768/512/256/128 switch applies Matryoshka truncation + re-normalization.

The model runs in a Web Worker (`src/lib/worker/embed.worker.ts`); audio/video are decoded on the main thread (`src/lib/media.ts`) because those browser APIs are unavailable in workers.
