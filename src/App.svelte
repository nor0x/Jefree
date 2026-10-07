<script lang="ts">
  import DecidePanel from './lib/components/DecidePanel.svelte'
  import EmbeddingCard from './lib/components/EmbeddingCard.svelte'
  import InputPanel from './lib/components/InputPanel.svelte'
  import ModelStatus from './lib/components/ModelStatus.svelte'
  import SimilarityMatrix from './lib/components/SimilarityMatrix.svelte'
  import { embedder } from './lib/embedder.svelte'
  import { EXAMPLE_MEDIA, fetchMedia } from './lib/media'
  import { TASKS } from './lib/prefixes'
  import type { Item, ItemMeta } from './lib/types'
  import { DIMENSIONS, type Dimension } from './lib/vector'
  import type { EmbedInput } from './lib/worker/protocol'

  let view = $state<'embed' | 'decide'>('embed')
  let items = $state.raw<Item[]>([])
  let dim = $state<Dimension>(768)
  let pending = $state(0)
  let error = $state<string | null>(null)
  let nextId = 0

  const ready = $derived(embedder.status === 'ready')

  async function embed(input: EmbedInput, meta: ItemMeta) {
    pending++
    try {
      const result = await embedder.embed(input)
      items = [...items, { ...meta, id: nextId++, vector: result.values, tokens: result.tokens, elapsedMs: result.elapsedMs }]
    } finally {
      pending--
    }
  }

  function embedText(taskId: string, text: string, title = '') {
    const prefixed = TASKS.find((t) => t.id === taskId)!.format(text, title)
    return embed({ type: 'text', text: prefixed }, { modality: 'text', label: text, detail: prefixed })
  }

  async function runExample(work: () => Promise<void>) {
    error = null
    try {
      await work()
    } catch (e) {
      error = (e as Error).message
    }
  }

  const textExample = () =>
    runExample(async () => {
      await embedText('search', 'Which planet is known as the Red Planet?')
      for (const doc of [
        "Venus is often called Earth's twin because of its similar size and proximity.",
        'Mars, known for its reddish appearance, is often referred to as the Red Planet.',
        'Jupiter, the largest planet in our solar system, has a prominent red spot.',
        'Saturn, famous for its rings, is sometimes mistaken for the Red Planet.',
      ]) {
        await embedText('document', doc)
      }
    })

  const crossModalExample = () =>
    runExample(async () => {
      for (const query of [
        'cats sleeping on a couch',
        "a president's speech about serving your country",
        'a turtle swimming in the ocean',
      ]) {
        await embedText('search', query)
      }
      for (const file of ['cats.jpg', 'jfk.wav', 'sea-turtle.mp4']) {
        const { input, meta } = await fetchMedia(`${EXAMPLE_MEDIA}/${file}`)
        await embed(input, meta)
      }
    })

  function release(item: Item) {
    if (item.mediaUrl) URL.revokeObjectURL(item.mediaUrl)
  }

  function remove(item: Item) {
    release(item)
    items = items.filter((i) => i !== item)
  }

  function clear() {
    items.forEach(release)
    items = []
  }
</script>

<header class="top">
  <div class="brand">
    <h1>EmbeddingGemma 2 Playground</h1>
    <p class="muted">
      Text, images, audio and video in one 768-d space, embedded entirely in your browser with WebGPU. Nothing is uploaded.
      Model: <a href="https://huggingface.co/google/embeddinggemma-2" target="_blank" rel="noreferrer">google/embeddinggemma-2</a>
      (<a href="https://huggingface.co/onnx-community/embeddinggemma-2-ONNX" target="_blank" rel="noreferrer">ONNX</a>).
    </p>
    <div class="segmented views" role="tablist" aria-label="View">
      <button role="tab" aria-selected={view === 'embed'} class:active={view === 'embed'} onclick={() => (view = 'embed')}>Embed</button>
      <button role="tab" aria-selected={view === 'decide'} class:active={view === 'decide'} onclick={() => (view = 'decide')}>Decide</button>
    </div>
  </div>
  <div class="panel">
    <ModelStatus />
  </div>
</header>

{#if view === 'decide'}
  <DecidePanel />
{:else}
  <main>
    <aside>
      <InputPanel disabled={!ready} onembed={embed} />
      <section class="panel examples">
        <h2>Examples</h2>
        <p class="muted small">From the model card. Media downloads from huggingface.co.</p>
        <div class="row">
          <button disabled={!ready} onclick={textExample}>Text search</button>
          <button disabled={!ready} onclick={crossModalExample}>Cross-modal</button>
        </div>
      </section>
    </aside>

    <div class="results">
      <section class="panel">
        <div class="toolbar">
          <h2>Similarity</h2>
          {#if pending}<span class="muted small spinner">Embedding {pending} input{pending > 1 ? 's' : ''}…</span>{/if}
          <div class="spacer"></div>
          <div class="segmented" role="radiogroup" aria-label="Embedding dimensions">
            {#each DIMENSIONS as d (d)}
              <button role="radio" aria-checked={dim === d} class:active={dim === d} onclick={() => (dim = d)}>{d}d</button>
            {/each}
          </div>
          <button disabled={!items.length} onclick={clear}>Clear</button>
        </div>
        {#if error}<p class="error">{error}</p>{/if}
        <SimilarityMatrix {items} {dim} />
      </section>

      {#if items.length}
        <section class="cards">
          {#each items as item, index (item.id)}
            <div class="panel"><EmbeddingCard {item} {index} {dim} onremove={() => remove(item)} /></div>
          {/each}
        </section>
      {/if}
    </div>
  </main>
{/if}

<style>
  .top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 16px 24px;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 16px 16px;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    letter-spacing: -0.01em;
  }
  .brand p {
    margin: 0;
    font-size: 0.9rem;
  }
  main {
    display: grid;
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 16px 48px;
  }
  aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 16px;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
  }
  .examples p {
    margin: 4px 0 10px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .row button {
    flex: 1;
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 12px;
  }
  .spacer {
    flex: 1;
  }
  .views {
    width: fit-content;
    margin-top: 12px;
  }
  .segmented {
    display: flex;
    padding: 3px;
    gap: 2px;
    border-radius: 9px;
    background: var(--surface-2);
  }
  .segmented button {
    border: none;
    background: transparent;
    padding: 4px 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .segmented button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .error {
    color: var(--danger);
    font-size: 0.9rem;
  }
  .spinner::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 6px;
    border: 2px solid var(--accent);
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    vertical-align: -1px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 900px) {
    .top,
    main {
      grid-template-columns: minmax(0, 1fr);
    }
    aside {
      position: static;
    }
  }
</style>
