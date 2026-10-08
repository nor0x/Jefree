// Structured decisions with a bi-encoder, following MediaPipe Decision Maker's EmbeddingGemma backend:
// options are embedded once, centered on their question's centroid ("within-question whitening") and
// L2-normalized; each request then embeds only the state and scores it against every option.
// Options can also be images, audio or video (as in MediaPipe), embedded as-is instead of as text.
import type { EmbedResult } from './embedder.svelte'
import { cloneInput, type MediaAsset } from './media'
import { TASKS } from './prefixes'
import { dot, truncateNormalize } from './vector'
import type { EmbedInput } from './worker/protocol'

export type QuestionKind = 'choice' | 'boolean' | 'score'

export interface DecisionOption {
  key: string
  description: string
  /** Embedded instead of the option text when set. */
  media?: MediaAsset
}

export interface Question {
  name: string
  kind: QuestionKind
  /** Human-readable question; for booleans it is display-only (the `condition` is what gets embedded). */
  label: string
  instructions: string
  /** Boolean questions always have exactly two options: `true` then `false`. */
  options: DecisionOption[]
  /** Boolean only: `value` is true when `probability_true >= threshold`. */
  threshold: number
}

export interface DecisionRequest {
  /** Text state; undefined when the payload has none (e.g. a media state is supplied separately). */
  state?: string
  questions: Question[]
}

export interface ChoiceResult {
  type: 'choice'
  selected_key: string
  probabilities: Record<string, number>
  confidence: number
}

export interface BooleanResult {
  type: 'boolean'
  value: boolean
  probability_true: number
  threshold: number
  confidence: number
}

export interface ScoreResult {
  type: 'score'
  selected_key: string
  expected_score: number
  probabilities: Record<string, number>
  confidence: number
}

export type QuestionResult = ChoiceResult | BooleanResult | ScoreResult

export interface DecisionResponse {
  model: string
  results: Record<string, QuestionResult>
  usage: { state_tokens: number; option_tokens: number; cached_options: number }
  elapsed_ms: number
}

export const DEFAULT_TEMPERATURE = 0.05

const KIND_ALIASES: Record<string, QuestionKind> = {
  choice: 'choice',
  categorical: 'choice',
  boolean: 'boolean',
  bool: 'boolean',
  binary: 'boolean',
  noul: 'boolean',
  score: 'score',
  ordinal: 'score',
  rubric: 'score',
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/** Jev accepts a string, a JSON object or an array of text values as state. */
function stateText(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n')
  return text(value)?.trim() || undefined
}

function parseOption(value: unknown, where: string): DecisionOption {
  if (typeof value === 'string') {
    // Rubric entries are written as "Label: description".
    const split = value.indexOf(': ')
    return split > 0 ? { key: value.slice(0, split), description: value.slice(split + 2) } : { key: value, description: '' }
  }
  if (isObject(value)) {
    const key = text(value.key ?? value.label ?? value.name ?? value.value)
    if (key) return { key, description: text(value.description) ?? '' }
  }
  throw new Error(`${where}: options must be strings or {label, description} objects.`)
}

function parseOptions(q: Json, where: string): DecisionOption[] {
  const options: DecisionOption[] = []
  if (isObject(q.criteria)) {
    for (const [key, value] of Object.entries(q.criteria)) {
      options.push({ key, description: (isObject(value) ? text(value.description) : text(value)) ?? '' })
    }
  } else if (Array.isArray(q.criteria)) {
    options.push(...q.criteria.map((o) => parseOption(o, where)))
  }
  for (const list of [q.options, q.rubric, q.levels]) {
    if (Array.isArray(list)) options.push(...list.map((o) => parseOption(o, where)))
    else if (isObject(list)) for (const [key, value] of Object.entries(list)) options.push({ key, description: text(value) ?? '' })
  }
  return options
}

function inferKind(q: Json): QuestionKind | undefined {
  if (q.condition !== undefined) return 'boolean'
  if (q.rubric !== undefined || q.levels !== undefined) return 'score'
  if (q.criteria !== undefined || q.options !== undefined) return 'choice'
}

function parseQuestion(q: unknown, fallbackName: string, context: string): Question {
  if (!isObject(q)) throw new Error(`Question "${fallbackName}" must be an object.`)
  const name = text(q.name ?? q.id ?? q.key) ?? fallbackName
  const where = `Question "${name}"`
  const type = text(q.type)?.toLowerCase()
  const kind = type ? KIND_ALIASES[type] : inferKind(q)
  if (!kind) {
    throw new Error(type ? `${where}: unknown type "${type}". Use choice, boolean or score.` : `${where}: add a "type".`)
  }
  const asked = text(q.instructions ?? q.prompt ?? q.question)
  const instructions = [context, asked ?? ''].filter(Boolean).join(' ')

  if (kind === 'boolean') {
    const condition = text(q.condition) ?? (text(q.prompt) || undefined)
    if (!condition) throw new Error(`${where}: boolean questions need a "condition".`)
    const threshold = q.threshold === undefined ? 0.5 : Number(q.threshold)
    if (!(threshold >= 0 && threshold <= 1)) throw new Error(`${where}: "threshold" must be between 0 and 1.`)
    return {
      name,
      kind,
      label: asked ?? condition,
      instructions: context,
      threshold,
      options: [
        { key: 'true', description: text(q.true) ?? condition },
        { key: 'false', description: text(q.false) ?? negate(condition) },
      ],
    }
  }

  const options = parseOptions(q, where)
  if (options.length < 2) throw new Error(`${where}: needs at least two options in "criteria".`)
  const keys = new Set(options.map((o) => o.key))
  if (keys.size !== options.length) throw new Error(`${where}: option keys must be unique.`)
  return { name, kind, label: asked ?? name, instructions, options, threshold: 0.5 }
}

/** Default `false` description for a boolean condition. */
export const negate = (condition: string) => `It is not the case that ${condition.charAt(0).toLowerCase()}${condition.slice(1)}`

/** Parses a Jev-style `{state, questions}` payload; MediaPipe's `{input, context, questions}` schema works too. */
export function parseRequest(source: string): DecisionRequest {
  let json: unknown
  try {
    json = JSON.parse(source)
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`)
  }
  if (isObject(json) && isObject(json.schema)) json = { input: json.input, ...json.schema }
  if (!isObject(json)) throw new Error('The request must be a JSON object with "state" and "questions".')

  const context = text(json.context) ?? ''
  const raw = json.questions
  const entries: [string, unknown][] = Array.isArray(raw)
    ? raw.map((q, i) => [`q${i + 1}`, q])
    : isObject(raw)
      ? Object.entries(raw).map(([name, q]) => [name, isObject(q) ? { name, ...q } : q])
      : []
  if (!entries.length) throw new Error('Add at least one entry to "questions".')

  const questions = entries.map(([name, q]) => parseQuestion(q, name, context))
  const names = new Set(questions.map((q) => q.name))
  if (names.size !== questions.length) throw new Error('Question names must be unique.')
  return { state: stateText(json.state ?? json.input ?? json.text), questions }
}

const classify = TASKS.find((t) => t.id === 'classification')!

/** The text embedded for a text state. */
export const statePrompt = (state: string) => classify.format(state, '')

/** The text embedded for one option. */
export function optionText(question: Question, option: DecisionOption): string {
  const label = option.key.replace(/[_-]+/g, ' ')
  const body = option.description ? (question.kind === 'boolean' ? option.description : `${label}: ${option.description}`) : label
  return classify.format([question.instructions, body].filter(Boolean).join(' — '), '')
}

/** Cache key of an option's embedding. */
export const optionKey = (question: Question, option: DecisionOption) =>
  option.media ? `media:${option.media.id}` : optionText(question, option)

const optionInput = (question: Question, option: DecisionOption): EmbedInput =>
  option.media ? cloneInput(option.media.input) : { type: 'text', text: optionText(question, option) }

/** A media file as it appears in serialized JSON (the bytes are not part of the payload). */
export const mediaRef = (media: MediaAsset) => ({ media: media.meta.modality, file: media.meta.label })

/** Serializes questions back to a Jev `{state, questions}` payload, e.g. to show what a form produces. */
export function toJev(state: unknown, questions: Question[]) {
  const entries = questions.map((q) => {
    const asked = q.label && q.label !== q.name ? { instructions: q.label } : {}
    if (q.kind === 'boolean') {
      const [yes, no] = q.options
      return [q.name, { type: 'boolean', ...asked, condition: yes.description, false: no.description, threshold: q.threshold }]
    }
    const options = q.options.map((o) => (o.media ? { key: o.key, ...mediaRef(o.media) } : o))
    const plain = q.options.every((o) => !o.media)
    if (q.kind === 'score') {
      return [q.name, { type: 'score', ...asked, rubric: plain ? q.options.map((o) => (o.description ? `${o.key}: ${o.description}` : o.key)) : options }]
    }
    const criteria = plain ? Object.fromEntries(q.options.map((o) => [o.key, o.description])) : options
    return [q.name, { type: 'choice', ...asked, criteria }]
  })
  return { state, questions: Object.fromEntries(entries) }
}

/** Within-question centroid whitening: subtract the options' mean, then L2-normalize. */
export function whiten(vectors: Float32Array[]): Float32Array[] {
  const dim = vectors[0].length
  const mean = new Float32Array(dim)
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i] / vectors.length
  return vectors.map((v) => {
    const centered = v.map((x, i) => x - mean[i])
    return truncateNormalize(centered, dim)
  })
}

export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/** Mix of top-2 margin and normalized entropy, both in [0, 1]. */
export function confidence(probabilities: number[]): number {
  const sorted = [...probabilities].sort((a, b) => b - a)
  const margin = sorted[0] - (sorted[1] ?? 0)
  const entropy = -probabilities.reduce((h, p) => (p > 0 ? h + p * Math.log(p) : h), 0)
  return 0.5 * margin + 0.5 * (1 - entropy / Math.log(probabilities.length))
}

const round = (x: number) => Math.round(x * 1e4) / 1e4

export function scoreQuestion(question: Question, state: Float32Array, optionVectors: Float32Array[], temperature: number): QuestionResult {
  const whitened = whiten(optionVectors)
  const probabilities = softmax(whitened.map((v) => dot(state, v) / temperature))
  const conf = round(confidence(probabilities))
  const best = probabilities.indexOf(Math.max(...probabilities))
  const byKey = Object.fromEntries(question.options.map((o, i) => [o.key, round(probabilities[i])]))

  if (question.kind === 'boolean') {
    const p = probabilities[0]
    return { type: 'boolean', value: p >= question.threshold, probability_true: round(p), threshold: question.threshold, confidence: conf }
  }
  if (question.kind === 'score') {
    // Numeric level keys are used as-is; otherwise levels score 0..K-1, like MediaPipe.
    const numeric = question.options.map((o) => Number(o.key))
    const values = numeric.every(Number.isFinite) ? numeric : numeric.map((_, i) => i)
    const expected = probabilities.reduce((sum, p, i) => sum + p * values[i], 0)
    return { type: 'score', selected_key: question.options[best].key, expected_score: round(expected), probabilities: byKey, confidence: conf }
  }
  return { type: 'choice', selected_key: question.options[best].key, probabilities: byKey, confidence: conf }
}

type Embed = (input: EmbedInput) => Promise<EmbedResult>

/** Runs requests against one embedder, caching option embeddings ("prewarm") across calls. */
export class Decider {
  #cache = new Map<string, Float32Array>()
  #cacheKey = ''

  constructor(
    private embed: Embed,
    private model: () => string,
  ) {}

  get cachedOptions() {
    return this.#cache.size
  }

  /** Embeds every option not seen yet. Returns the number of tokens spent. */
  async prewarm(questions: Question[]): Promise<number> {
    if (this.#cacheKey !== this.model()) {
      this.#cache.clear()
      this.#cacheKey = this.model()
    }
    const missing = new Map<string, () => EmbedInput>()
    for (const q of questions) {
      for (const o of q.options) {
        const key = optionKey(q, o)
        if (!this.#cache.has(key)) missing.set(key, () => optionInput(q, o))
      }
    }
    const keys = [...missing.keys()]
    const results = await Promise.all([...missing.values()].map((input) => this.embed(input())))
    results.forEach((r, i) => this.#cache.set(keys[i], r.values))
    return results.reduce((sum, r) => sum + r.tokens, 0)
  }

  async evaluate(state: EmbedInput, questions: Question[], temperature = DEFAULT_TEMPERATURE): Promise<DecisionResponse> {
    const start = performance.now()
    const cachedBefore = questions.flatMap((q) => q.options.map((o) => optionKey(q, o))).filter((k) => this.#cache.has(k)).length
    const optionTokens = await this.prewarm(questions)
    const embedded = await this.embed(state)
    const results: Record<string, QuestionResult> = {}
    for (const q of questions) {
      const vectors = q.options.map((o) => this.#cache.get(optionKey(q, o))!)
      results[q.name] = scoreQuestion(q, embedded.values, vectors, temperature)
    }
    return {
      model: this.model(),
      results,
      usage: { state_tokens: embedded.tokens, option_tokens: optionTokens, cached_options: cachedBefore },
      elapsed_ms: Math.round(performance.now() - start),
    }
  }
}
