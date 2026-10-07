import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths so `dist/` can be hosted from any sub-path (e.g. a static HF Space).
  base: './',
  worker: { format: 'es' },
  // transformers.js loads the ONNX Runtime wasm at runtime; keep Vite from pre-bundling it.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
})
