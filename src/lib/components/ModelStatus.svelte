<script lang="ts">
  import { embedder } from '../embedder.svelte'
  import type { Dtype } from '../worker/protocol'

  const DTYPES: { value: Dtype; label: string }[] = [
    { value: 'q4', label: 'q4 · 473 MB (recommended)' },
    { value: 'q4f16', label: 'q4f16 · 426 MB' },
    { value: 'q8', label: 'q8 · 850 MB' },
    { value: 'fp16', label: 'fp16 · 1.5 GB' },
  ]

  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
  let dtype = $state<Dtype>(embedder.dtype)

  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`
  const needsLoad = $derived(embedder.status !== 'loading' && (embedder.status !== 'ready' || dtype !== embedder.dtype))
</script>

<div class="status">
  <label class="field">
    <span>Precision</span>
    <select bind:value={dtype} disabled={embedder.status === 'loading'}>
      {#each DTYPES as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <button class="primary" disabled={!needsLoad} onclick={() => embedder.load(dtype)}>
    {embedder.status === 'ready' ? 'Reload model' : 'Load model'}
  </button>

  <div class="state" aria-live="polite">
    {#if embedder.status === 'idle'}
      <span class="dot"></span>
      {hasWebGPU ? 'Not loaded. Weights are cached in your browser after the first download.' : 'WebGPU unavailable: the model will run on WASM (slow).'}
    {:else if embedder.status === 'loading'}
      <div class="progress" role="progressbar" aria-valuenow={Math.round(embedder.progress)} aria-valuemin={0} aria-valuemax={100}>
        <div class="bar" style:width="{embedder.progress}%"></div>
      </div>
      <span class="muted">
        {#if embedder.totalBytes}
          {mb(embedder.loadedBytes)} / {mb(embedder.totalBytes)}
        {:else}
          Preparing…
        {/if}
        {embedder.progress >= 100 ? '· warming up' : ''}
      </span>
    {:else if embedder.status === 'ready'}
      <span class="dot ok"></span>
      Ready · <strong>{embedder.backend}</strong> · {embedder.dtype}
    {:else}
      <span class="dot err"></span>
      <span class="error">{embedder.error}</span>
    {/if}
  </div>
</div>

<style>
  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 12px 16px;
  }
  .state {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    flex: 1 1 260px;
    font-size: 0.9rem;
  }
  .progress {
    flex: 1;
    max-width: 280px;
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .bar {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s ease;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    flex: none;
  }
  .dot.ok {
    background: var(--ok);
  }
  .dot.err {
    background: var(--danger);
  }
  .error {
    color: var(--danger);
  }
</style>
