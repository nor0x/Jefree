<script lang="ts">
  import type { QuestionKind } from '../../decision'
  import { newOption, type FormQuestion } from '../../decision-form'
  import Icon from '../Icon.svelte'
  import OptionRow from './OptionRow.svelte'

  interface Props {
    question: FormQuestion
    index: number
    canRemove: boolean
    disabled?: boolean
    onremove: () => void
  }
  let { question = $bindable(), index, canRemove, disabled = false, onremove }: Props = $props()

  const KINDS: { value: QuestionKind; label: string; hint: string }[] = [
    { value: 'choice', label: 'Pick one', hint: 'Choose the best of several answers.' },
    { value: 'boolean', label: 'Yes / No', hint: 'Check whether a statement is true.' },
    { value: 'score', label: 'Rate', hint: 'Place it on an ordered scale, from lowest to highest.' },
  ]
  const PLACEHOLDERS: Record<QuestionKind, string> = {
    choice: 'e.g. What should I cook?',
    boolean: 'e.g. Is it urgent?',
    score: 'e.g. How positive is it?',
  }

  const kind = $derived(KINDS.find((k) => k.value === question.kind)!)
  const list = $derived(question.kind === 'score' ? question.levels : question.options)
  const strictness = $derived(
    question.threshold < 0.4 ? 'lenient' : question.threshold > 0.6 ? 'strict' : 'balanced',
  )

  function add() {
    if (question.kind === 'score') question.levels.push(newOption())
    else question.options.push(newOption())
  }

  function remove(i: number) {
    const target = question.kind === 'score' ? question.levels : question.options
    target[i].media?.release()
    target.splice(i, 1)
  }
</script>

<article class="question">
  <header>
    <span class="num">{String(index + 1).padStart(2, '0')}</span>
    <input type="text" class="title" bind:value={question.text} placeholder={PLACEHOLDERS[question.kind]} aria-label="Question {index + 1}" />
    <button class="icon" aria-label="Remove question {index + 1}" onclick={onremove} disabled={disabled || !canRemove}><Icon name="close" /></button>
  </header>

  <div class="mode">
    <div class="segmented" role="radiogroup" aria-label="Answer type">
      {#each KINDS as k (k.value)}
        <button role="radio" aria-checked={question.kind === k.value} onclick={() => (question.kind = k.value)}>{k.label}</button>
      {/each}
    </div>
    <span class="muted small">{kind.hint}</span>
  </div>

  {#if question.kind === 'boolean'}
    <div class="yesno">
      <label class="field">
        <span>Yes, if…</span>
        <input type="text" bind:value={question.yes} placeholder="The request involves money, payments or refunds." />
      </label>
      <label class="field">
        <span>No, if… <small class="muted">(optional; spelling out the opposite works better than “not …”)</small></span>
        <input type="text" bind:value={question.no} placeholder="The request is about travel plans or luggage." />
      </label>
      <label class="field">
        <span>Strictness <small class="muted">{strictness} · needs {Math.round(question.threshold * 100)}% to say yes</small></span>
        <input type="range" min="0.1" max="0.9" step="0.05" bind:value={question.threshold} />
      </label>
    </div>
  {:else}
    <ol class="options">
      {#each list as option, i (option.id)}
        <OptionRow
          bind:option={list[i]}
          marker={question.kind === 'score' ? String(i + 1) : '•'}
          placeholder={question.kind === 'score' ? `Level ${i + 1}` : `Answer ${i + 1}`}
          canRemove={list.length > 2}
          {disabled}
          onremove={() => remove(i)}
        />
      {/each}
    </ol>
    <div class="add">
      <button class="ghost" onclick={add} {disabled}><Icon name="plus" /> Add {question.kind === 'score' ? 'level' : 'answer'}</button>
      {#if question.kind === 'score'}<span class="muted small">Top = lowest, bottom = highest.</span>{/if}
    </div>
  {/if}
</article>

<style>
  .question {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    background: var(--glass);
    -webkit-backdrop-filter: var(--blur);
    backdrop-filter: var(--blur);
    box-shadow: var(--glass-highlight), var(--shadow-sm);
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .num {
    color: var(--accent-ink);
    font-family: var(--mono);
    font-size: 0.8rem;
  }
  .title {
    flex: 1;
    min-width: 0;
    padding: 4px 0;
    border: none;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: none;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    font-family: var(--serif);
    font-optical-sizing: auto;
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: 0;
  }
  .title:hover,
  .title:focus {
    border-bottom-color: var(--border-strong);
  }
  .title:focus-visible {
    outline: none;
    border-bottom-color: var(--accent);
  }
  .mode {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .yesno {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .add {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 26px;
  }
  .add .ghost {
    padding: 5px 10px;
  }
</style>
