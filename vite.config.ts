import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths so `dist/` can be hosted from any sub-path (e.g. a static HF Space).
  base: './',
  // Two pages: the Jevfree app (index) and the developer playground.
  build: {
    rollupOptions: {
      input: { main: page('index.html'), playground: page('playground.html') },
    },
  },
  worker: { format: 'es' },
  // transformers.js loads the ONNX Runtime wasm at runtime; keep Vite from pre-bundling it.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
})
