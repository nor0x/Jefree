<script lang="ts">
  import type { Item } from '../types'
  import { dot, truncateNormalize } from '../vector'

  interface Props {
    items: Item[]
    dim: number
  }
  let { items, dim }: Props = $props()

  let hover = $state<[number, number] | null>(null)
  let selectedId = $state<number | null>(null)

  const vectors = $derived(items.map((item) => truncateNormalize(item.vector, dim)))
  const scores = $derived(vectors.map((a) => vectors.map((b) => dot(a, b))))
  // Color scale spans the off-diagonal range, so differences stay visible even when all scores are high.
  const range = $derived.by(() => {
    let min = Infinity
    let max = -Infinity
    scores.forEach((row, i) =>
      row.forEach((s, j) => {
        if (i === j) return
        min = Math.min(min, s)
        max = Math.max(max, s)
      }),
    )
    return Number.isFinite(min) ? { min, max: Math.max(max, min + 1e-6) } : { min: 0, max: 1 }
  })

  const selected = $derived(items.findIndex((item) => item.id === selectedId))
  const ranking = $derived(
    selected < 0
      ? []
      : items
          .map((item, j) => ({ item, j, score: scores[selected][j] }))
          .filter(({ j }) => j !== selected)
          .sort((a, b) => b.score - a.score),
  )

  function shade(i: number, j: number) {
    if (i === j) return 'var(--surface-2)'
    const t = (scores[i][j] - range.min) / (range.max - range.min)
    return `color-mix(in oklab, var(--accent) ${Math.round(8 + t * 82)}%, var(--surface))`
  }
  const ink = (i: number, j: number) =>
    i !== j && (scores[i][j] - range.min) / (range.max - range.min) > 0.55 ? 'var(--on-accent)' : 'var(--text)'
</script>

{#if items.length < 2}
  <p class="muted empty">Embed at least two inputs to compare them. Cosine similarity of every pair appears here.</p>
{:else}
  <div class="scroll">
    <table onpointerleave={() => (hover = null)}>
      <thead>
        <tr>
          <th></th>
          {#each items as item, j (item.id)}
            <th class="col" class:hl={hover?.[1] === j} title={item.label}>
              <span class="badge {item.modality}">{j + 1}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each items as row, i (row.id)}
          <tr>
            <th class="rowhead" class:hl={hover?.[0] === i}>
              <button class="link" class:active={selectedId === row.id} onclick={() => (selectedId = selectedId === row.id ? null : row.id)} title="Rank everything against {row.label}">
                <span class="badge {row.modality}">{i + 1}</span>
                <span class="name">{row.label}</span>
              </button>
            </th>
            {#each items as col, j (col.id)}
              <td
                style:background={shade(i, j)}
                style:color={ink(i, j)}
                class:hl={hover && (hover[0] === i || hover[1] === j)}
                onpointerenter={() => (hover = [i, j])}
                title="#{i + 1} {row.label}  ↔  #{j + 1} {col.label}: {scores[i][j].toFixed(4)}"
              >
                {i === j ? '—' : scores[i][j].toFixed(3)}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="muted small">
    Cosine similarity at {dim} dims (truncated and re-normalized). Color spans {range.min.toFixed(3)} → {range.max.toFixed(3)}.
    Click a row label to rank all other inputs against it.
  </p>

  {#if selected >= 0}
    <div class="ranking">
      <h3>Nearest to #{selected + 1} <span class="muted">{items[selected].label}</span></h3>
      <ol>
        {#each ranking as { item, j, score } (item.id)}
          <li>
            <span class="score">{score.toFixed(4)}</span>
            <span class="meter"><span style:width="{Math.max(0, score) * 100}%"></span></span>
            <span class="badge {item.modality}">{j + 1}</span>
            <span class="name">{item.label}</span>
          </li>
        {/each}
      </ol>
    </div>
  {/if}
{/if}

<style>
  .empty {
    margin: 0;
    padding: 24px;
    text-align: center;
    border: 1px dashed var(--border);
    border-radius: 10px;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: separate;
    border-spacing: 2px;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
  }
  th.col {
    padding: 2px;
    text-align: center;
  }
  th.rowhead {
    max-width: 220px;
    text-align: left;
    font-weight: normal;
  }
  td {
    min-width: 52px;
    padding: 6px 4px;
    text-align: center;
    border-radius: 4px;
    cursor: default;
  }
  td.hl {
    outline: 1px solid var(--border-strong);
  }
  th.hl .badge,
  th.hl .name {
    font-weight: 700;
  }
  .link {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 6px;
    border: none;
    background: none;
    color: inherit;
    text-align: left;
  }
  .link:hover,
  .link.active {
    background: var(--surface-2);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .ranking h3 {
    margin: 12px 0 8px;
    font-size: 0.95rem;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: grid;
    grid-template-columns: 56px 80px auto 1fr;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }
  .score {
    font-variant-numeric: tabular-nums;
  }
  .meter {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    background: var(--accent);
  }
</style>
