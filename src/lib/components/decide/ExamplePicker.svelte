<script lang="ts">
  import type { UserExample } from '../../decision-examples'
  import Icon from '../Icon.svelte'

  interface Props {
    examples: UserExample[]
    active: string | null
    loading: string | null
    disabled?: boolean
    onpick: (example: UserExample) => void
  }
  let { examples, active, loading, disabled = false, onpick }: Props = $props()

  // The list is rendered twice and the track slides by exactly one copy, so the loop is seamless.
  const SECONDS_PER_CHIP = 4
</script>

<div class="examples">
  <span class="eyebrow label">Try an example</span>
  <div class="viewport">
    <div class="track" style:animation-duration="{examples.length * SECONDS_PER_CHIP}s">
      {#each [0, 1] as copy (copy)}
        <div class="copy" aria-hidden={copy === 1 ? 'true' : undefined}>
          {#each examples as example (example.id)}
            <button
              class="chip"
              class:active={active === example.id}
              aria-pressed={active === example.id}
              tabindex={copy === 1 ? -1 : undefined}
              onclick={() => onpick(example)}
              {disabled}
            >
              {#if loading === example.id}
                <span class="spinner"></span>
              {:else}
                <Icon name={example.optionMedia ? 'image' : example.modality} size={15} />
              {/if}
              {example.label}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .examples {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }
  .label {
    flex: none;
  }
  .viewport {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    /* Room for the chips' shadows and focus rings inside the clipped area. */
    padding: 6px 0;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 40px, #000 calc(100% - 40px), transparent);
    mask-image: linear-gradient(90deg, transparent, #000 40px, #000 calc(100% - 40px), transparent);
  }
  .track {
    display: flex;
    width: max-content;
    animation: marquee linear infinite;
  }
  .viewport:hover .track,
  .viewport:focus-within .track {
    animation-play-state: paused;
  }
  .copy {
    display: flex;
    gap: 8px;
    padding-right: 8px;
  }
  @keyframes marquee {
    to {
      transform: translateX(-50%);
    }
  }
  .chip {
    padding: 7px 13px;
    border-radius: 999px;
    font-size: 0.88rem;
    white-space: nowrap;
  }
  .chip :global(svg) {
    color: var(--text-muted);
  }
  .chip.active {
    border-color: var(--accent);
    box-shadow:
      var(--glass-highlight),
      0 0 0 3px var(--accent-soft);
  }
  .chip.active :global(svg) {
    color: var(--accent-ink);
  }
  @media (prefers-reduced-motion: reduce) {
    .track {
      animation: none !important;
    }
    .copy[aria-hidden] {
      display: none;
    }
    .viewport {
      overflow-x: auto;
      scrollbar-width: none;
    }
  }
  @media (max-width: 480px) {
    .label {
      display: none;
    }
  }
</style>
