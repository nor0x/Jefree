<script lang="ts">
  import type { Question, QuestionResult } from '../decision'

  interface Props {
    question: Question
    result: QuestionResult
  }
  let { question, result }: Props = $props()

  const pct = (p: number) => `${(p * 100).toFixed(1)}%`
  const description = (key: string) => question.options.find((o) => o.key === key)?.description
  const bars = $derived(result.type === 'boolean' ? [] : Object.entries(result.probabilities))
  const levels = $derived(result.type === 'score' ? bars.map(([key]) => Number(key)) : [])
  const range = $derived.by(() => {
    if (result.type !== 'score') return { min: 0, max: 1 }
    const numeric = levels.every(Number.isFinite)
    return numeric ? { min: Math.min(...levels), max: Math.max(...levels) } : { min: 0, max: bars.length - 1 }
  })
</script>

<article class="panel card">
  <header>
    <h3>{question.name}</h3>
    <span class="kind">{result.type}</span>
    <div class="spacer"></div>
    <span class="confidence" title="Mix of top-2 margin and normalized entropy">confidence {pct(result.confidence)}</span>
  </header>

  {#if question.instructions}<p class="muted small">{question.instructions}</p>{/if}

  {#if result.type === 'boolean'}
    <div class="verdict">
      <strong class:yes={result.value} class:no={!result.value}>{result.value ? 'True' : 'False'}</strong>
      <span class="muted small">{question.options[0].description}</span>
    </div>
    <div class="track" title="probability_true {pct(result.probability_true)}">
      <div class="fill" class:win={result.value} style:width={pct(result.probability_true)}></div>
      <div class="threshold" style:left={pct(result.threshold)} title="threshold {result.threshold}"></div>
    </div>
    <div class="row small muted">
      <span>probability_true <strong class="num">{pct(result.probability_true)}</strong></span>
      <span>threshold {result.threshold}</span>
    </div>
  {:else}
    {#if result.type === 'score'}
      <div class="verdict">
        <strong>{result.expected_score.toFixed(2)}</strong>
        <span class="muted small">expected score ({range.min}–{range.max})</span>
      </div>
      <div class="track">
        <div class="marker" style:left={pct((result.expected_score - range.min) / (range.max - range.min || 1))}></div>
      </div>
    {/if}
    <ul class="options">
      {#each bars as [key, p] (key)}
        <li class:selected={key === result.selected_key}>
          <div class="row">
            <span class="key">{key}</span>
            <span class="num">{pct(p)}</span>
          </div>
          <div class="track thin"><div class="fill" class:win={key === result.selected_key} style:width={pct(p)}></div></div>
          {#if description(key)}<span class="muted small">{description(key)}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
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
  }
  h3 {
    margin: 0;
    font-size: 0.95rem;
    font-family: var(--mono);
    word-break: break-all;
  }
  .kind {
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .spacer {
    flex: 1;
  }
  .confidence {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  p {
    margin: 0;
  }
  .verdict {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .verdict strong {
    font-size: 1.4rem;
    font-variant-numeric: tabular-nums;
  }
  .yes {
    color: var(--ok);
  }
  .no {
    color: var(--danger);
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .track.thin {
    height: 6px;
  }
  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--border-strong);
    transition: width 0.3s;
  }
  .fill.win {
    background: var(--accent);
  }
  .threshold {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--text);
  }
  .marker {
    position: absolute;
    top: -3px;
    width: 16px;
    height: 16px;
    margin-left: -8px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
    transition: left 0.3s;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .options li {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .key {
    font-family: var(--mono);
    font-size: 0.85rem;
  }
  .selected .key {
    font-weight: 700;
  }
  .num {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
</style>
