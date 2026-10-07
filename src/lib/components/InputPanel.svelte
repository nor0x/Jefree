<script lang="ts">
  import { prepareMedia, MAX_AUDIO_SECONDS, MAX_VIDEO_FRAMES } from '../media'
  import { TASKS } from '../prefixes'
  import type { ItemMeta } from '../types'
  import type { EmbedInput } from '../worker/protocol'

  interface Props {
    disabled: boolean
    onembed: (input: EmbedInput, meta: ItemMeta) => Promise<void>
  }
  let { disabled, onembed }: Props = $props()

  let tab = $state<'text' | 'media'>('text')
  let taskId = $state('search')
  let title = $state('')
  let text = $state('')
  let perLine = $state(false)
  let dragging = $state(false)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let fileInput = $state<HTMLInputElement>()

  const task = $derived(TASKS.find((t) => t.id === taskId)!)
  const entries = $derived(
    (perLine ? text.split('\n') : [text]).map((line) => line.trim()).filter(Boolean),
  )
  const preview = $derived(entries.map((entry) => task.format(entry, title)))

  async function guard(work: () => Promise<void>) {
    busy = true
    error = null
    try {
      await work()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function embedText() {
    return guard(async () => {
      for (const [i, entry] of entries.entries()) {
        await onembed({ type: 'text', text: preview[i] }, { modality: 'text', label: entry, detail: preview[i] })
      }
      text = ''
    })
  }

  function embedFiles(files: FileList | File[] | null | undefined) {
    if (!files?.length) return
    return guard(async () => {
      for (const file of files) {
        const { input, meta } = await prepareMedia(file, file.name)
        await onembed(input, meta)
      }
    })
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    if (!disabled) embedFiles(event.dataTransfer?.files)
  }
</script>

<section class="panel">
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === 'text'} class:active={tab === 'text'} onclick={() => (tab = 'text')}>Text</button>
    <button role="tab" aria-selected={tab === 'media'} class:active={tab === 'media'} onclick={() => (tab = 'media')}>
      Image · Audio · Video
    </button>
  </div>

  {#if tab === 'text'}
    <div class="stack">
      <label class="field">
        <span>Task prefix</span>
        <select bind:value={taskId}>
          {#each TASKS as option (option.id)}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
        <small class="muted">{task.hint}</small>
      </label>

      {#if task.usesTitle}
        <label class="field">
          <span>Title <small class="muted">(optional, "none" if empty)</small></span>
          <input type="text" bind:value={title} placeholder="none" />
        </label>
      {/if}

      <label class="field">
        <span>Text</span>
        <textarea
          rows="5"
          bind:value={text}
          placeholder="Which planet is known as the Red Planet?"
          onkeydown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && entries.length && !disabled && !busy) embedText()
          }}
        ></textarea>
      </label>

      <label class="check">
        <input type="checkbox" bind:checked={perLine} />
        One input per line
      </label>

      {#if preview.length}
        <div class="preview">
          <span class="muted">Model input{preview.length > 1 ? `s (${preview.length})` : ''}</span>
          {#each preview.slice(0, 4) as line, i (i)}
            <code>{line}</code>
          {/each}
          {#if preview.length > 4}<span class="muted">… and {preview.length - 4} more</span>{/if}
        </div>
      {/if}

      <button class="primary" disabled={disabled || busy || !entries.length} onclick={embedText}>
        {busy ? 'Embedding…' : `Embed${entries.length > 1 ? ` ${entries.length} texts` : ''}`}
      </button>
    </div>
  {:else}
    <div
      class="drop"
      class:dragging
      class:disabled
      role="button"
      tabindex="0"
      ondragover={(e) => {
        e.preventDefault()
        dragging = true
      }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
      onclick={() => !disabled && fileInput?.click()}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && fileInput?.click()}
    >
      <strong>{busy ? 'Processing…' : 'Drop files here or click to choose'}</strong>
      <span class="muted">Images, audio and video. Each file becomes one embedding.</span>
      <span class="muted small">
        Audio is resampled to 16 kHz mono (first {MAX_AUDIO_SECONDS} s). Video is sampled at 1 fps (max {MAX_VIDEO_FRAMES} frames).
      </span>
    </div>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*,audio/*,video/*"
      multiple
      hidden
      onchange={(e) => {
        embedFiles(e.currentTarget.files)
        e.currentTarget.value = ''
      }}
    />
  {/if}

  {#if disabled}
    <p class="muted small">Load the model to start embedding.</p>
  {/if}
  {#if error}
    <p class="error">{error}</p>
  {/if}
</section>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--surface-2);
    border-radius: 10px;
    margin-bottom: 16px;
  }
  .tabs button {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--text-muted);
  }
  .tabs button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  textarea {
    resize: vertical;
    min-height: 96px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
  }
  .preview code {
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface-2);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 220px;
    padding: 24px;
    text-align: center;
    border: 2px dashed var(--border);
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .drop:hover,
  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .drop.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .error {
    color: var(--danger);
    font-size: 0.9rem;
  }
</style>
