<script lang="ts">
  import type { FormOption } from '../../decision-form'
  import { loadAsset } from '../../media'
  import Icon from '../Icon.svelte'

  interface Props {
    option: FormOption
    /** Shown before the inputs: a level number for ratings, a dot for answers. */
    marker: string
    placeholder: string
    canRemove: boolean
    disabled?: boolean
    onremove: () => void
  }
  let { option = $bindable(), marker, placeholder, canRemove, disabled = false, onremove }: Props = $props()

  let fileInput = $state<HTMLInputElement>()
  let busy = $state(false)
  let error = $state<string | null>(null)

  async function attach(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    busy = true
    error = null
    try {
      const asset = await loadAsset(file, file.name)
      option.media?.release()
      option.media = asset
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function detach() {
    option.media?.release()
    option.media = null
  }
</script>

<li class="option">
  <span class="marker" aria-hidden="true">{marker}</span>
  <div class="fields">
    <div class="line" class:with-media={!!option.media}>
      <input type="text" class="label" bind:value={option.label} {placeholder} aria-label="Answer" />
      {#if !option.media}
        <input type="text" class="desc" bind:value={option.description} placeholder="Describe it (optional, helps a lot)" aria-label="Description" />
      {/if}
      <button
        class="icon"
        class:on={!!option.media}
        title="Use a photo, sound or video as this answer"
        aria-label="Attach media"
        onclick={() => fileInput?.click()}
        disabled={disabled || busy}
      >
        {#if busy}<span class="spinner"></span>{:else}<Icon name="clip" />{/if}
      </button>
      <button class="icon" aria-label="Remove answer" onclick={onremove} disabled={disabled || !canRemove}><Icon name="close" /></button>
    </div>
    {#if option.media}
      <div class="media">
        {#if option.media.meta.modality === 'image'}
          <img src={option.media.meta.mediaUrl} alt="" />
        {:else if option.media.meta.poster}
          <img src={option.media.meta.poster} alt="" />
        {:else}
          <span class="glyph"><Icon name="audio" /></span>
        {/if}
        <span class="badge">{option.media.meta.modality}</span>
        <span class="name muted small">{option.media.meta.label}</span>
        {#if option.media.meta.modality === 'audio'}<audio src={option.media.meta.mediaUrl} controls></audio>{/if}
        <button class="ghost small" onclick={detach} {disabled}>Use text instead</button>
      </div>
    {/if}
    {#if error}<p class="error">{error}</p>{/if}
  </div>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*,audio/*,video/*"
    hidden
    onchange={(e) => {
      attach(e.currentTarget.files)
      e.currentTarget.value = ''
    }}
  />
</li>

<style>
  .option {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .marker {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 38px;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  .line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto auto;
    gap: 6px;
    align-items: center;
  }
  .line.with-media {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  .label {
    min-width: 0;
    font-weight: 500;
  }
  .desc {
    min-width: 0;
    font-size: 0.85rem;
    box-shadow: none;
    background: transparent;
  }
  @media (max-width: 640px) {
    /* Label + buttons on the first line, description below. */
    .line {
      grid-template-columns: minmax(0, 1fr) auto auto;
    }
    .desc {
      grid-column: 1 / -1;
      grid-row: 2;
      padding: 6px 11px;
    }
  }
  .icon.on {
    color: var(--accent-ink);
  }
  .media {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .media img,
  .glyph {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: 8px;
    background: var(--surface-2);
  }
  .glyph {
    display: grid;
    place-items: center;
    color: var(--accent-ink);
  }
  .name {
    min-width: 0;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  audio {
    height: 32px;
    max-width: 100%;
  }
  .ghost.small {
    margin-left: auto;
    padding: 3px 8px;
    font-size: 0.8rem;
  }
</style>
