<script lang="ts">
  import type { MediaAsset } from '../../media'
  import type { Modality } from '../../types'
  import Icon from '../Icon.svelte'
  import MediaPicker from './MediaPicker.svelte'

  type MediaKind = Exclude<Modality, 'text'>

  interface Props {
    mode: Modality
    text: string
    media: Record<MediaKind, MediaAsset | null>
    disabled?: boolean
    onsubmit?: () => void
  }
  let { mode = $bindable(), text = $bindable(), media = $bindable(), disabled = false, onsubmit }: Props = $props()

  const MODES: { value: Modality; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Photo' },
    { value: 'audio', label: 'Sound' },
    { value: 'video', label: 'Video' },
  ]
</script>

<div class="situation">
  <div class="segmented" role="tablist" aria-label="Situation type">
    {#each MODES as m (m.value)}
      <button role="tab" aria-selected={mode === m.value} onclick={() => (mode = m.value)}>
        <Icon name={m.value} size={15} />
        {m.label}
      </button>
    {/each}
  </div>

  {#if mode === 'text'}
    <textarea
      rows="4"
      bind:value={text}
      placeholder="Describe the situation, paste a message, a review, a request…"
      aria-label="Situation"
      onkeydown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onsubmit?.()
      }}
    ></textarea>
  {:else}
    {#key mode}
      <MediaPicker kind={mode} media={media[mode]} onchange={(next) => (media[mode as MediaKind] = next)} {disabled} />
    {/key}
  {/if}
</div>

<style>
  .situation {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .segmented {
    align-self: flex-start;
  }
  textarea {
    resize: vertical;
    min-height: 112px;
    line-height: 1.5;
  }
</style>
