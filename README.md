# Jevfree

A lightweight, local-first experiment inspired by decision models like [Jev](https://typesafe.ai): typed questions in, rough probabilities out, no server involved. It is not a Jev replacement; it repurposes an embedding model for the decision use case.

Structured decisions and embeddings with [EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2), entirely in the browser (WebGPU, WASM fallback). No backend: the [ONNX weights](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) are downloaded once and cached by the browser.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/ (index.html + playground.html)
```

## Jevfree (`index.html`)

A no-code page for end users, modelled on [MediaPipe Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker). It downloads the fp16 model (~1.5 GB) on load and unlocks the form once it is ready; without WebGPU `shader-f16` support it loads q4 instead.

- **Situation**: text, a photo, a sound (file or microphone recording) or a video.
- **Questions**: *Pick one* (`choice`), *Yes / No* (`boolean`, with a strictness threshold) or *Rate* (`score`, ordered levels 1..K → expected score). Answers can be text or media files.
- **Examples** for everyday situations, including media answers ("Which photo fits my mood?").
- The generated Jev request and the response JSON sit in a collapsed drawer at the bottom.

## Playground (`playground.html`)

- **Text**: pick a task prefix (search query, document, classification, …); the exact model input is previewed.
- **Media**: drop images, audio (resampled to 16 kHz mono, first 90 s) or video (1 fps, max 16 frames). The caps keep inputs under the ~2,700-token WebGPU limit.
- **Decide**: Jev-style JSON requests (`choice`, `boolean`, `score` questions against a text or media `state`).
- **Results**: per-item heatmap, stats and JSON export; cosine-similarity matrix and nearest-neighbour ranking. The 768/512/256/128 switch applies Matryoshka truncation + re-normalization.

## How decisions work

MediaPipe Decision Maker's bi-encoder recipe (`src/lib/decision.ts`): options are embedded once, centroid-whitened per question and cached; each request embeds only the state and returns softmax probabilities, a confidence score and, for ratings, an expected score. Media options are embedded as media in the same space.

The model runs in a Web Worker (`src/lib/worker/embed.worker.ts`); audio/video are decoded on the main thread (`src/lib/media.ts`) because those browser APIs are unavailable in workers.
