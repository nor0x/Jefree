<script lang="ts" module>
  import { Decider } from '../decision'
  import { embedder } from '../embedder.svelte'

  // Module-level so cached option embeddings survive switching tabs.
  const decider = new Decider(
    (input) => embedder.embed(input),
    () => `embeddinggemma-2-onnx-${embedder.dtype}`,
  )
</script>

<script lang="ts">
  import { DECISION_EXAMPLES, type DecisionExample } from '../decision-examples'
  import { DEFAULT_TEMPERATURE, optionText, parseRequest, statePrompt, type DecisionResponse, type Question } from '../decision'
  import { EXAMPLE_MEDIA, fetchMedia, prepareMedia, type PreparedMedia } from '../media'
  import type { EmbedInput } from '../worker/protocol'
  import DecisionResult from './DecisionResult.svelte'

  let source = $state(JSON.stringify(DECISION_EXAMPLES[0].request, null, 2))
  let media = $state.raw<PreparedMedia | null>(null)
  let temperature = $state(DEFAULT_TEMPERATURE)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let response = $state.raw<DecisionResponse | null>(null)
  let evaluated = $state.raw<Question[]>([])
  let copied = $state(false)
  let dragging = $state(false)
  let fileInput = $state<HTMLInputElement>()

  const ready = $derived(embedder.status === 'ready')
  const parsed = $derived.by(() => {
    try {
      return { request: parseRequest(source), error: null }
    } catch (e) {
      return { request: null, error: (e as Error).message }
    }
  })
  const hasState = $derived(!!media || !!parsed.request?.state)
  const canEvaluate = $derived(ready && !busy && !!parsed.request && hasState)

  /** Audio and video buffers are transferred to the worker, so send a copy and keep the original reusable. */
  function cloneInput(input: EmbedInput): EmbedInput {
    if (input.type === 'audio') return { ...input, samples: input.samples.slice() }
    if (input.type === 'video') return { ...input, frames: input.frames.map((f) => ({ ...f, data: f.data.slice() })) }
    return input
  }

  async function evaluate() {
    const request = parsed.request
    if (!request || !canEvaluate) return
    busy = true
    error = null
    try {
      const state: EmbedInput = media ? cloneInput(media.input) : { type: 'text', text: statePrompt(request.state!) }
      response = await decider.evaluate(state, request.questions, temperature)
      evaluated = request.questions
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function setMedia(next: PreparedMedia | null) {
    if (media?.meta.mediaUrl) URL.revokeObjectURL(media.meta.mediaUrl)
    media = next
  }

  async function pickFile(files: FileList | null | undefined) {
    const file = files?.[0]
    if (!file) return
    error = null
    try {
      setMedia(await prepareMedia(file, file.name))
    } catch (e) {
      error = (e as Error).message
    }
  }

  async function loadExample(example: DecisionExample) {
    source = JSON.stringify(example.request, null, 2)
    response = null
    error = null
    busy = true
    try {
      setMedia(example.media ? await fetchMedia(`${EXAMPLE_MEDIA}/${example.media}`) : null)
    } catch (e) {
      error = (e as Error).message
      return
    } finally {
      busy = false
    }
    if (ready) await evaluate()
  }

  async function copy() {
    if (!response) return
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    copied = true
    setTimeout(() => (copied = false), 1500)
  }
</script>

<main class="decide">
  <aside>
    <section class="panel stack">
      <div>
        <h2>Request</h2>
        <p class="muted small">
          A Jev-style payload: a <code>state</code> and <code>questions</code> of type <code>choice</code>,
          <code>boolean</code> or <code>score</code>. Ctrl+Enter evaluates.
        </p>
      </div>

      <div class="row">
        {#each DECISION_EXAMPLES as example (example.id)}
          <button onclick={() => loadExample(example)} disabled={busy}>{example.label}</button>
        {/each}
      </div>

      <textarea
        class="json"
        rows="18"
        spellcheck="false"
        aria-label="Decision request JSON"
        bind:value={source}
        onkeydown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) evaluate()
        }}
      ></textarea>
      {#if parsed.error}<p class="error">{parsed.error}</p>{/if}

      <div class="field">
        <span>Media state <small class="muted">(optional, replaces the text <code>state</code>)</small></span>
        {#if media}
          <div class="media">
            {#if media.meta.modality === 'image'}
              <img src={media.meta.mediaUrl} alt={media.meta.label} />
            {:else if media.meta.poster}
              <img src={media.meta.poster} alt={media.meta.label} />
            {/if}
            <span class="badge {media.meta.modality}">{media.meta.modality}</span>
            <span class="name">{media.meta.label}</span>
            <button class="icon" aria-label="Remove media state" onclick={() => setMedia(null)}>×</button>
          </div>
          {#if media.meta.note}<small class="muted">{media.meta.note}</small>{/if}
        {:else}
          <div
            class="drop"
            class:dragging
            role="button"
            tabindex="0"
            ondragover={(e) => {
              e.preventDefault()
              dragging = true
            }}
            ondragleave={() => (dragging = false)}
            ondrop={(e) => {
              e.preventDefault()
              dragging = false
              pickFile(e.dataTransfer?.files)
            }}
            onclick={() => fileInput?.click()}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
          >
            Drop an image, audio or video file, or click to choose
          </div>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/*,audio/*,video/*"
            hidden
            onchange={(e) => {
              pickFile(e.currentTarget.files)
              e.currentTarget.value = ''
            }}
          />
        {/if}
      </div>

      <label class="field">
        <span>Temperature <small class="muted">{temperature.toFixed(3)} · lower is sharper</small></span>
        <input type="range" min="0.01" max="0.2" step="0.005" bind:value={temperature} />
      </label>

      <button class="primary" disabled={!canEvaluate} onclick={evaluate}>{busy ? 'Evaluating…' : 'Evaluate'}</button>
      {#if !ready}
        <p class="muted small">Load the model to start.</p>
      {:else if parsed.request && !hasState}
        <p class="muted small">Add a <code>state</code> to the request or drop a media file.</p>
      {/if}
      {#if error}<p class="error">{error}</p>{/if}
    </section>

    <section class="panel how">
      <h2>How it works</h2>
      <p class="muted small">
        Like MediaPipe Decision Maker's EmbeddingGemma backend: every option is embedded once and cached
        (<em>prewarm</em>), centered on its question's centroid and re-normalized. Each request then embeds only the
        state, and one dot product per option goes through a softmax. Booleans are a two-option question
        (<code>condition</code> vs. <code>false</code>). Embeddings handle negation poorly, so write an explicit
        <code>false</code> description.
      </p>
    </section>
  </aside>

  <div class="results">
    {#if response}
      <section class="cards">
        {#each evaluated as question (question.name)}
          {#if response.results[question.name]}
            <DecisionResult {question} result={response.results[question.name]} />
          {/if}
        {/each}
      </section>

      <section class="panel stack">
        <div class="toolbar">
          <h2>Response</h2>
          <span class="muted small">
            {response.elapsed_ms} ms · state {response.usage.state_tokens} tokens · options {response.usage.option_tokens}
            new tokens, {response.usage.cached_options} cached
          </span>
          <div class="spacer"></div>
          <button onclick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
        </div>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </section>

      <details class="panel">
        <summary>Embedded texts</summary>
        <div class="texts">
          <code>{media ? `[${media.meta.modality}] ${media.meta.label}` : statePrompt(parsed.request?.state ?? '')}</code>
          {#each evaluated as question (question.name)}
            {#each question.options as option (option.key)}
              <code>{optionText(question, option)}</code>
            {/each}
          {/each}
        </div>
      </details>
    {:else}
      <section class="panel empty muted">
        {busy ? 'Working…' : 'Pick an example or edit the request, then Evaluate.'}
      </section>
    {/if}
  </div>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 16px 48px;
  }
  aside,
  .results {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 1rem;
  }
  p {
    margin: 0;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .row button {
    flex: 1;
  }
  .json {
    font-family: var(--mono);
    font-size: 0.8rem;
    line-height: 1.4;
    resize: vertical;
    tab-size: 2;
  }
  .media {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-weight: normal;
  }
  .media img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }
  .media .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drop {
    padding: 14px;
    text-align: center;
    border: 2px dashed var(--border);
    border-radius: 10px;
    color: var(--text-muted);
    font-weight: normal;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .drop:hover,
  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .toolbar h2 {
    margin: 0;
  }
  .spacer {
    flex: 1;
  }
  pre {
    margin: 0;
    padding: 12px;
    max-height: 360px;
    overflow: auto;
    border-radius: 8px;
    background: var(--surface-2);
    font-family: var(--mono);
    font-size: 0.8rem;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  .texts {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 10px;
    font-size: 0.8rem;
  }
  .texts code {
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface-2);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .empty {
    padding: 48px 16px;
    text-align: center;
  }
  .error {
    color: var(--danger);
    font-size: 0.9rem;
  }
  @media (max-width: 900px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
