<script lang="ts">
  import type { QuestionResult } from '../../decision'
  import type { AnsweredQuestion } from '../../decision-form'
  import Icon from '../Icon.svelte'

  interface Props {
    answered: AnsweredQuestion
    result: QuestionResult
  }
  let { answered, result }: Props = $props()

  const pct = (p: number) => `${Math.round(p * 100)}%`
  const { question, title, labels } = $derived(answered)
  const rows = $derived(
    result.type === 'boolean'
      ? []
      : question.options.map((o, i) => ({ option: o, label: labels[i], p: result.probabilities[o.key] ?? 0, win: o.key === result.selected_key })),
  )
  const winner = $derived(rows.find((r) => r.win))
  const sure = $derived(result.confidence > 0.66 ? 'Confident' : result.confidence > 0.33 ? 'Fairly sure' : 'Unsure')
</script>

<article class="answer">
  <header>
    <span class="eyebrow">{question.kind === 'choice' ? 'Pick one' : question.kind === 'boolean' ? 'Yes / No' : 'Rate'}</span>
    <h3>{title}</h3>
  </header>

  {#if result.type === 'boolean'}
    <div class="headline">
      <strong class:yes={result.value}>{result.value ? 'Yes' : 'No'}</strong>
      <span class="muted">{pct(result.probability_true)} yes · needs {pct(result.threshold)}</span>
    </div>
    <div class="gauge" role="img" aria-label="{pct(result.probability_true)} likely yes, threshold {pct(result.threshold)}">
      <div class="fill" class:win={result.value} style:width={pct(result.probability_true)}></div>
      <div class="tick" style:left={pct(result.threshold)}></div>
    </div>
    <p class="muted small because">{question.options[result.value ? 0 : 1].description}</p>
  {:else}
    <div class="headline">
      {#if result.type === 'score'}
        <strong>{result.expected_score.toFixed(1)}<span class="of"> / {rows.length}</span></strong>
        <span class="muted">closest: {winner?.label}</span>
      {:else}
        {#if winner?.option.media?.meta.modality === 'image'}
          <img class="hero" src={winner.option.media.meta.mediaUrl} alt={winner.label} />
        {/if}
        <strong>{winner?.label}</strong>
      {/if}
    </div>
    {#if result.type === 'score'}
      <div class="scale" style:--n={rows.length}>
        {#each rows as row, i (row.option.key)}
          <span class="step" class:win={row.win}>{i + 1}</span>
        {/each}
        <span class="marker" style:left="calc({(result.expected_score - 1) / Math.max(rows.length - 1, 1)} * (100% - 24px) + 12px)"></span>
      </div>
    {/if}
    <ul class="bars">
      {#each rows as row (row.option.key)}
        <li class:win={row.win}>
          <div class="row">
            {#if row.option.media}
              {#if row.option.media.meta.modality === 'image'}
                <img src={row.option.media.meta.mediaUrl} alt="" />
              {:else if row.option.media.meta.poster}
                <img src={row.option.media.meta.poster} alt="" />
              {:else}
                <span class="glyph"><Icon name={row.option.media.meta.modality} size={14} /></span>
              {/if}
            {/if}
            <span class="label">{row.label}</span>
            <span class="num">{pct(row.p)}</span>
          </div>
          <div class="track"><div class="fill" class:win={row.win} style:width={pct(row.p)}></div></div>
        </li>
      {/each}
    </ul>
  {/if}

  <footer>
    <span class="muted small">{sure}</span>
    <div class="conf" title="Confidence: margin between the top answers and how spread out the probabilities are">
      <div style:width={pct(result.confidence)}></div>
    </div>
    <span class="num small">{pct(result.confidence)}</span>
  </footer>
</article>

<style>
  .answer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    background: var(--glass);
    -webkit-backdrop-filter: var(--blur);
    backdrop-filter: var(--blur);
    box-shadow: var(--glass-highlight), var(--shadow-md);
    min-width: 0;
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .eyebrow {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  h3 {
    margin: 0;
    font-family: var(--serif);
    font-size: 1.05rem;
    font-style: italic;
    font-weight: 400;
  }
  .headline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  .headline strong {
    font-family: var(--serif);
    font-optical-sizing: auto;
    font-size: 2.2rem;
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: -0.01em;
    font-variant-numeric: lining-nums;
  }
  .headline strong.yes {
    color: var(--accent-ink);
  }
  .of {
    font-family: var(--sans);
    letter-spacing: 0;
    font-size: 1rem;
    color: var(--text-muted);
    font-weight: 400;
  }
  .hero {
    width: 100%;
    max-height: 180px;
    object-fit: cover;
    border-radius: 10px;
  }
  .because {
    margin: 0;
  }
  .gauge,
  .track {
    position: relative;
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .gauge {
    height: 10px;
  }
  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--border-strong);
    transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .fill.win {
    background: var(--accent);
    box-shadow: 0 0 10px -2px var(--accent);
  }
  .tick {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 2px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--text);
  }
  .scale {
    position: relative;
    display: flex;
    justify-content: space-between;
    padding: 6px 0 14px;
  }
  .scale::before {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    top: 18px;
    border-top: 1px solid var(--line);
  }
  .step {
    position: relative;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }
  .step.win {
    border-color: var(--accent);
    background: linear-gradient(var(--accent-soft), var(--accent-soft)), var(--bg);
    color: var(--text);
  }
  /* Expected score: a caret under the track, so it never covers a step's number. */
  .marker {
    position: absolute;
    top: 33px;
    width: 0;
    height: 0;
    margin-left: -5px;
    border: 5px solid transparent;
    border-top: none;
    border-bottom: 6px solid var(--accent);
    filter: drop-shadow(0 0 4px var(--accent));
    transition: left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bars li {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
  }
  .row img,
  .glyph {
    width: 24px;
    height: 24px;
    object-fit: cover;
    border-radius: 5px;
    background: var(--surface-2);
    flex: none;
  }
  .glyph {
    display: grid;
    place-items: center;
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
  }
  .win .label {
    color: var(--text);
    font-weight: 600;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .conf {
    flex: 1;
    height: 2px;
    background: var(--line);
  }
  .conf div {
    height: 100%;
    background: var(--text);
    transition: width 0.4s;
  }
</style>
