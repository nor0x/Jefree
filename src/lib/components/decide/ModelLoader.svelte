<script lang="ts">
  import { onMount } from 'svelte'
  import { embedder } from '../../embedder.svelte'
  import type { Dtype } from '../../worker/protocol'

  interface Props {
    dtype: Dtype
  }
  let { dtype }: Props = $props()

  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
  const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024).toLocaleString()} MB`
  const warming = $derived(embedder.status === 'loading' && embedder.progress >= 100)

  // Start downloading once the page has rendered; weights are cached by the browser after the first visit.
  onMount(() => {
    if (embedder.status === 'idle') embedder.load(dtype)
  })
</script>

{#if embedder.status === 'loading' || embedder.status === 'idle'}
  <div class="topline" class:indeterminate={warming || !embedder.totalBytes} aria-hidden="true">
    <div style:width="{embedder.progress}%"></div>
  </div>
{/if}

<div class="loader glass" class:ready={embedder.status === 'ready'} aria-live="polite">
  {#if embedder.status === 'ready'}
    <span class="dot"></span>
    <span>Model ready</span>
    <span class="muted small">{embedder.backend === 'webgpu' ? 'WebGPU' : 'WASM (slow)'} · {embedder.dtype}</span>
    {#if embedder.fallback}<span class="muted small note">{embedder.fallback}</span>{/if}
  {:else if embedder.status === 'error'}
    <span class="dot err"></span>
    <span class="msg">Could not load the model: {embedder.error}</span>
    <button onclick={() => embedder.load(dtype)}>Retry</button>
  {:else}
    <span class="spinner"></span>
    <div class="body">
      <div class="line">
        <span class="serif title">{warming ? 'Warming up the model…' : 'Downloading the model'}</span>
        <span class="muted small num">
          {#if embedder.totalBytes && !warming}{mb(embedder.loadedBytes)} / {mb(embedder.totalBytes)}{:else if !warming}Preparing…{/if}
        </span>
      </div>
      <div class="bar" role="progressbar" aria-label="Model download" aria-valuenow={Math.round(embedder.progress)} aria-valuemin={0} aria-valuemax={100}>
        <div style:width="{embedder.progress}%"></div>
      </div>
      <span class="muted small">
        About 1.5 GB, downloaded once and cached in your browser. Everything runs on this device; nothing is uploaded.
        {#if !hasWebGPU}Your browser has no WebGPU, so a smaller model runs on the CPU.{/if}
      </span>
    </div>
  {/if}
</div>

<style>
  .topline {
    position: fixed;
    inset: 0 0 auto;
    z-index: 10;
    height: 2px;
    overflow: hidden;
  }
  .topline div {
    height: 100%;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
    transition: width 0.3s ease;
  }
  .topline.indeterminate div {
    width: 30% !important;
    animation: slide 1.2s ease-in-out infinite;
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(340%);
    }
  }
  .loader {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
  }
  .loader.ready {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 7px 14px;
    border-radius: 999px;
    font-size: 0.88rem;
  }
  .loader .spinner {
    margin-top: 4px;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-weight: 500;
  }
  .title {
    font-size: 1.15rem;
    line-height: 1.2;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .bar {
    height: 4px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .bar div {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
    flex: none;
  }
  .dot.err {
    background: var(--text);
    box-shadow: none;
    margin-top: 7px;
  }
  .msg {
    flex: 1;
  }
  .note {
    flex-basis: 100%;
  }
</style>
