<script lang="ts">
  import { theme, type Theme } from '../theme.svelte'
  import Icon from './Icon.svelte'

  const THEMES: { value: Theme; label: string; icon: 'system' | 'sun' | 'moon' }[] = [
    { value: 'system', label: 'System theme', icon: 'system' },
    { value: 'light', label: 'Light theme', icon: 'sun' },
    { value: 'dark', label: 'Dark theme', icon: 'moon' },
  ]
</script>

<div class="segmented compact" role="radiogroup" aria-label="Theme">
  {#each THEMES as t (t.value)}
    <button role="radio" aria-checked={theme.current === t.value} aria-label={t.label} title={t.label} onclick={() => theme.set(t.value)}>
      <Icon name={t.icon} size={15} />
    </button>
  {/each}
</div>
