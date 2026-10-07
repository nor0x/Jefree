<script lang="ts">
  import type { Item } from '../types'
  import { stats, truncateNormalize } from '../vector'
  import Heatmap from './Heatmap.svelte'

  interface Props {
    item: Item
    index: number
    dim: number
    onremove: () => void
  }
  let { item, index, dim, onremove }: Props = $props()

  const vector = $derived(truncateNormalize(item.vector, dim))
  const summary = $derived(stats(vector))
  let copied = $state(false)

  // Near-square grids (48×16, 32×16, 32×8, 16×8) so every dimension stays readable.
  const HEATMAP_COLUMNS: Record<number, number> = { 768: 48, 512: 32, 256: 32, 128: 16 }

  const json = () => JSON.stringify(Array.from(vector, (x) => +x.toFixed(7)))

  async function copy() {
    await navigator.clipboard.writeText(json())
    copied = true
    setTimeout(() => (copied = false), 1200)
  }

  function download() {
    const payload = {
      model: 'google/embeddinggemma-2',
      modality: item.modality,
      label: item.label,
      input: item.modality === 'text' ? item.detail : undefined,
      dimensions: dim,
      embedding: JSON.parse(json()),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `embedding-${index + 1}-${item.modality}-${dim}d.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<article class="card">
  <header>
    <span class="index">#{index + 1}</span>
    <span class="badge {item.modality}">{item.modality}</span>
    <h3 title={item.label}>{item.label}</h3>
    <button class="icon" onclick={onremove} aria-label="Remove">×</button>
  </header>

  {#if item.modality === 'image' && item.mediaUrl}
    <img src={item.mediaUrl} alt={item.label} />
  {:else if item.modality === 'video' && item.mediaUrl}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video src={item.mediaUrl} poster={item.poster} controls preload="none"></video>
  {:else if item.modality === 'audio' && item.mediaUrl}
    <audio src={item.mediaUrl} controls preload="none"></audio>
  {/if}

  {#if item.detail}
    <p class="detail" class:mono={item.modality === 'text'}>{item.detail}</p>
  {/if}
  {#if item.note}
    <p class="note">{item.note}</p>
  {/if}

  <Heatmap {vector} columns={HEATMAP_COLUMNS[dim] ?? 32} />

  <dl class="stats">
    <div><dt>dims</dt><dd>{dim}</dd></div>
    <div><dt>tokens</dt><dd>{item.tokens}</dd></div>
    <div><dt>time</dt><dd>{item.elapsedMs.toFixed(0)} ms</dd></div>
    <div><dt>norm</dt><dd>{summary.norm.toFixed(3)}</dd></div>
    <div><dt>mean</dt><dd>{summary.mean.toFixed(4)}</dd></div>
    <div><dt>std</dt><dd>{summary.std.toFixed(4)}</dd></div>
    <div><dt>min</dt><dd>{summary.min.toFixed(4)}</dd></div>
    <div><dt>max</dt><dd>{summary.max.toFixed(4)}</dd></div>
  </dl>

  <code class="values">[{Array.from(vector.subarray(0, 6), (x) => x.toFixed(4)).join(', ')}, …]</code>

  <footer>
    <button onclick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
    <button onclick={download}>Download</button>
  </footer>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  h3 {
    flex: 1;
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .index {
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  img,
  video {
    width: 100%;
    max-height: 180px;
    object-fit: cover;
    border-radius: 8px;
    background: var(--surface-2);
  }
  audio {
    width: 100%;
  }
  .detail {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .mono {
    font-family: var(--mono);
  }
  .note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--warn);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin: 0;
  }
  .stats div {
    padding: 4px 6px;
    border-radius: 6px;
    background: var(--surface-2);
  }
  dt {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  dd {
    margin: 0;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .values {
    font-size: 0.75rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  footer {
    display: flex;
    gap: 8px;
  }
  footer button {
    flex: 1;
  }
</style>
