<script lang="ts">
  import Brand from './lib/components/Brand.svelte'
  import AnswerCard from './lib/components/decide/AnswerCard.svelte'
  import ExamplePicker from './lib/components/decide/ExamplePicker.svelte'
  import JsonDrawer from './lib/components/decide/JsonDrawer.svelte'
  import ModelLoader from './lib/components/decide/ModelLoader.svelte'
  import QuestionEditor from './lib/components/decide/QuestionEditor.svelte'
  import SituationInput from './lib/components/decide/SituationInput.svelte'
  import Icon from './lib/components/Icon.svelte'
  import ThemeToggle from './lib/components/ThemeToggle.svelte'
  import { decider } from './lib/decider'
  import { DEFAULT_TEMPERATURE, mediaRef, parseRequest, statePrompt, toJev, type DecisionResponse, type QuestionKind } from './lib/decision'
  import { USER_EXAMPLES, type UserExample } from './lib/decision-examples'
  import { buildQuestions, formFromQuestions, newQuestion, type AnsweredQuestion, type FormQuestion } from './lib/decision-form'
  import { embedder } from './lib/embedder.svelte'
  import { cloneInput, EXAMPLE_MEDIA, loadAsset, type MediaAsset } from './lib/media'
  import type { Modality } from './lib/types'
  import type { EmbedInput } from './lib/worker/protocol'

  type MediaKind = Exclude<Modality, 'text'>

  let mode = $state<Modality>('text')
  let text = $state('')
  let media = $state<Record<MediaKind, MediaAsset | null>>({ image: null, audio: null, video: null })
  let questions = $state<FormQuestion[]>([newQuestion('choice')])
  let temperature = $state(DEFAULT_TEMPERATURE)
  let activeExample = $state<string | null>(null)
  let loadingExample = $state<string | null>(null)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let response = $state.raw<DecisionResponse | null>(null)
  let answered = $state.raw<AnsweredQuestion[]>([])

  const ready = $derived(embedder.status === 'ready')
  const built = $derived(buildQuestions(questions))
  const situation = $derived(mode === 'text' ? null : media[mode])
  const hasSituation = $derived(mode === 'text' ? !!text.trim() : !!situation)
  const problems = $derived([...(hasSituation ? [] : [mode === 'text' ? 'Describe the situation.' : 'Add a file for the situation.']), ...built.errors])
  const canDecide = $derived(ready && !busy && !loadingExample && !problems.length)
  const request = $derived(
    toJev(
      situation ? mediaRef(situation) : text.trim(),
      built.answered.map((a) => a.question),
    ),
  )
  const decisiveness = $derived(temperature <= 0.03 ? 'decisive' : temperature >= 0.1 ? 'cautious' : 'balanced')

  async function decide() {
    if (!canDecide) return
    const next = built.answered
    const state: EmbedInput = situation ? cloneInput(situation.input) : { type: 'text', text: statePrompt(text.trim()) }
    busy = true
    error = null
    try {
      response = await decider.evaluate(state, next.map((a) => a.question), temperature)
      answered = next
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function releaseAll() {
    for (const kind of ['image', 'audio', 'video'] as const) media[kind]?.release()
    for (const q of questions) for (const o of [...q.options, ...q.levels]) o.media?.release()
  }

  async function pickExample(example: UserExample) {
    loadingExample = example.id
    error = null
    try {
      const parsed = parseRequest(JSON.stringify(example.request))
      const optionMedia: Record<string, Record<string, MediaAsset>> = {}
      const jobs = Object.entries(example.optionMedia ?? {}).flatMap(([name, files]) =>
        Object.entries(files).map(async ([key, file]) => {
          ;(optionMedia[name] ??= {})[key] = await loadAsset(`${EXAMPLE_MEDIA}/${file}`)
        }),
      )
      const [stateAsset] = await Promise.all([example.media ? loadAsset(`${EXAMPLE_MEDIA}/${example.media}`) : null, ...jobs])

      releaseAll()
      media = { image: null, audio: null, video: null }
      questions = formFromQuestions(parsed.questions, optionMedia)
      if (stateAsset) {
        mode = stateAsset.meta.modality
        media[stateAsset.meta.modality as MediaKind] = stateAsset
      } else {
        mode = 'text'
        text = parsed.state ?? ''
      }
      activeExample = example.id
      response = null
    } catch (e) {
      error = (e as Error).message
    } finally {
      loadingExample = null
    }
    await decide()
  }

  function addQuestion(kind: QuestionKind) {
    questions.push(newQuestion(kind))
    activeExample = null
  }

  function removeQuestion(i: number) {
    for (const o of [...questions[i].options, ...questions[i].levels]) o.media?.release()
    questions.splice(i, 1)
  }
</script>

<nav class="nav">
  <Brand />
  <div class="spacer"></div>
  <a class="link" href="./playground.html">Playground <Icon name="arrow" size={14} /></a>
  <ThemeToggle />
</nav>
<hr class="hairline" />

<div class="page">
  <header class="hero">
    <h1>Quick gut calls, <em>made on-device.</em></h1>
    <p class="muted">
      A lightweight, local-first experiment inspired by decision models like Jev, not a match for them. Under the hood,
      EmbeddingGemma 2, an embedding model, is repurposed to weigh fixed answers against your situation. Describe it or
      share a photo, sound or video, ask your questions, and get rough probabilities back. Nothing leaves your browser.
    </p>
    <ModelLoader dtype="fp16" />
  </header>

  <ExamplePicker examples={USER_EXAMPLES} active={activeExample} loading={loadingExample} disabled={!ready || !!loadingExample || busy} onpick={pickExample} />

  <hr class="hairline" />

  <fieldset class="layout" disabled={!ready} aria-busy={!ready}>
    <div class="form">
      <section>
        <h2 class="eyebrow"><span class="step">01</span> The situation</h2>
        <SituationInput bind:mode bind:text bind:media disabled={!ready} onsubmit={decide} />
      </section>

      <hr class="hairline" />

      <section>
        <h2 class="eyebrow"><span class="step">02</span> Your questions</h2>
        <div class="questions">
          {#each questions as question, i (question.id)}
            <QuestionEditor bind:question={questions[i]} index={i} canRemove={questions.length > 1} disabled={!ready} onremove={() => removeQuestion(i)} />
          {/each}
        </div>
        <div class="adders">
          <span class="muted small">Add a question:</span>
          <button onclick={() => addQuestion('choice')}><Icon name="plus" /> Pick one</button>
          <button onclick={() => addQuestion('boolean')}><Icon name="plus" /> Yes / No</button>
          <button onclick={() => addQuestion('score')}><Icon name="plus" /> Rate</button>
        </div>
      </section>

      <hr class="hairline" />

      <section class="go">
        <h2 class="eyebrow"><span class="step">03</span> Decide</h2>
        <details class="advanced">
          <summary>Fine-tune</summary>
          <label class="field">
            <span>Decisiveness <small class="muted">{decisiveness} · lower spreads the odds, higher commits to one answer</small></span>
            <input type="range" min="0.01" max="0.2" step="0.005" value={0.21 - temperature} oninput={(e) => (temperature = 0.21 - Number(e.currentTarget.value))} />
          </label>
        </details>
        <button class="primary big" disabled={!canDecide} onclick={decide}>
          {#if busy}<span class="spinner dark"></span> Thinking…{:else}Decide{/if}
        </button>
        {#if ready && problems.length}
          <ul class="problems muted small">
            {#each problems as problem (problem)}<li>{problem}</li>{/each}
          </ul>
        {/if}
        {#if error}<p class="error">{error}</p>{/if}
      </section>
    </div>

    <aside class="answers" aria-live="polite">
      <h2 class="eyebrow">Answers</h2>
      {#if response}
        {#each answered as a (a.question.name)}
          {#if response.results[a.question.name]}
            <AnswerCard answered={a} result={response.results[a.question.name]} />
          {/if}
        {/each}
        <p class="muted small meta">
          Decided in {response.elapsed_ms} ms · {response.usage.cached_options} of
          {answered.reduce((n, a) => n + a.question.options.length, 0)} answers were already known
        </p>
      {:else}
        <div class="empty">
          <p class="muted serif">{ready ? (busy || loadingExample ? 'Working…' : 'Fill in the form and press Decide, or pick an example.') : 'Answers appear here once the model is ready.'}</p>
        </div>
      {/if}
    </aside>
  </fieldset>

  <hr class="hairline" />

  <JsonDrawer {request} {response} />

  <footer class="muted small">
    Model: <a href="https://huggingface.co/google/embeddinggemma-2" target="_blank" rel="noreferrer">google/embeddinggemma-2</a>
    · Method: <a href="https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker" target="_blank" rel="noreferrer">MediaPipe Decision Maker</a>
    · Sample media from <a href="https://huggingface.co/datasets/Xenova/transformers.js-docs" target="_blank" rel="noreferrer">transformers.js docs</a>
  </footer>
</div>

<style>
  .nav {
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 1180px;
    margin: 0 auto;
    padding: 12px 16px;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9rem;
    text-decoration: none;
  }
  .link:hover {
    color: var(--accent-ink);
  }
  .spacer {
    flex: 1;
  }
  .nav + .hairline {
    max-width: 1180px;
    margin: 0 auto;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1180px;
    margin: 0 auto;
    padding: 28px 16px 56px;
  }
  .hero {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    max-width: 720px;
  }
  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.01em;
    word-spacing: 0.04em;
  }
  .hero p {
    margin: 0;
    font-size: 1.02rem;
  }
  .hero :global(.loader:not(.ready)) {
    align-self: stretch;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
    gap: 40px;
    align-items: start;
  }
  .layout:disabled .form {
    opacity: 0.5;
    filter: saturate(0.4);
    pointer-events: none;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    transition: opacity 0.3s;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  h2.eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .step {
    color: var(--accent-ink);
    font-family: var(--mono);
  }
  .questions {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .adders {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .adders button {
    padding: 6px 12px;
    font-size: 0.88rem;
  }
  .advanced summary {
    cursor: pointer;
    color: var(--text-muted);
    font-size: 0.88rem;
  }
  .advanced[open] summary {
    margin-bottom: 12px;
  }
  .big {
    padding: 13px 20px;
    font-size: 1.02rem;
    border-radius: 12px;
  }
  .spinner.dark {
    border-color: var(--on-accent);
    border-right-color: transparent;
  }
  .problems {
    margin: 0;
    padding-left: 18px;
  }
  .answers {
    position: sticky;
    top: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: calc(100vh - 40px);
    overflow: auto;
    padding: 2px 4px 12px;
    margin: -2px -4px 0;
  }
  .empty {
    display: grid;
    place-items: center;
    min-height: 200px;
    padding: 24px;
    border: 1px dashed var(--border);
    border-radius: 16px;
    text-align: center;
  }
  .empty p,
  .meta {
    margin: 0;
  }
  footer {
    line-height: 1.8;
  }
  @media (max-width: 960px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .answers {
      position: static;
      max-height: none;
      overflow: visible;
    }
  }
  @media (max-width: 480px) {
    .page {
      padding-top: 20px;
      gap: 20px;
    }
  }
</style>
