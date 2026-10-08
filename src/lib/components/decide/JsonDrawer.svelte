<script lang="ts">
  import Icon from '../Icon.svelte'

  interface Props {
    request: unknown
    response: unknown
  }
  let { request, response }: Props = $props()

  let copied = $state<string | null>(null)

  const blocks = $derived([
    { id: 'request', title: 'Request', note: 'What the form above sends, in Jev format. Media is shown by name only.', value: request },
    { id: 'response', title: 'Response', note: 'The latest decision.', value: response },
  ])

  async function copy(id: string, value: unknown) {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    copied = id
    setTimeout(() => (copied = null), 1500)
  }
</script>

<details class="drawer">
  <summary>
    <span class="chev" aria-hidden="true"></span>
    JSON
    <span class="muted small">for developers</span>
  </summary>
  <div class="blocks">
    {#each blocks as block (block.id)}
      <section>
        <div class="head">
          <h3>{block.title}</h3>
          <span class="muted small">{block.note}</span>
          <div class="spacer"></div>
          <button class="ghost" onclick={() => copy(block.id, block.value)} disabled={!block.value}>
            <Icon name={copied === block.id ? 'check' : 'copy'} size={14} />
            {copied === block.id ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre>{block.value ? JSON.stringify(block.value, null, 2) : 'Nothing yet.'}</pre>
      </section>
    {/each}
  </div>
</details>

<style>
  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
    cursor: pointer;
    font-weight: 600;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .chev {
    width: 8px;
    height: 8px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s;
  }
  details[open] .chev {
    transform: rotate(45deg);
  }
  .blocks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  section {
    min-width: 0;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-bottom: 8px;
  }
  h3 {
    margin: 0;
    font-size: 0.9rem;
  }
  .spacer {
    flex: 1;
  }
  .ghost {
    padding: 4px 8px;
    font-size: 0.8rem;
  }
  pre {
    margin: 0;
    padding: 14px;
    max-height: 420px;
    overflow: auto;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    background: var(--glass);
    font-family: var(--mono);
    font-size: 0.78rem;
    line-height: 1.5;
  }
</style>
