// Editable form model for the Jevfree page, converted to `Question`s for the Decider.
// Each question keeps its "pick one" options, "rate" levels and yes/no fields separately,
// so switching modes back and forth never loses what was typed.
import { negate, type DecisionOption, type Question, type QuestionKind } from './decision'
import type { MediaAsset } from './media'

export interface FormOption {
  id: number
  label: string
  description: string
  media: MediaAsset | null
}

export interface FormQuestion {
  id: number
  text: string
  kind: QuestionKind
  options: FormOption[]
  levels: FormOption[]
  yes: string
  no: string
  threshold: number
}

/** What the answer cards show for one evaluated question. */
export interface AnsweredQuestion {
  question: Question
  title: string
  /** Human label per option, parallel to `question.options`. */
  labels: string[]
}

let nextId = 0

export function newOption(label = '', description = '', media: MediaAsset | null = null): FormOption {
  return { id: nextId++, label, description, media }
}

export function newQuestion(kind: QuestionKind = 'choice', text = ''): FormQuestion {
  return {
    id: nextId++,
    text,
    kind,
    options: [newOption(), newOption()],
    levels: [newOption('Low'), newOption('Medium'), newOption('High')],
    yes: '',
    no: '',
    threshold: 0.5,
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

function unique(base: string, taken: Set<string>) {
  let name = base
  for (let i = 2; taken.has(name); i++) name = `${base} (${i})`
  taken.add(name)
  return name
}

const filled = (o: FormOption) => !!(o.label.trim() || o.media)
const mediaName = (media: MediaAsset) => media.meta.label.replace(/\.[^.]+$/, '')

/** Builds Decider questions from the form, plus friendly validation messages. */
export function buildQuestions(form: FormQuestion[]): { answered: AnsweredQuestion[]; errors: string[] } {
  const errors: string[] = []
  const answered: AnsweredQuestion[] = []
  const names = new Set<string>()

  form.forEach((f, index) => {
    const title = f.text.trim() || `Question ${index + 1}`
    const name = unique(slug(f.text) || `question_${index + 1}`, names)

    if (f.kind === 'boolean') {
      const condition = f.yes.trim() || f.text.trim()
      if (!condition) {
        errors.push(`${title}: describe when the answer is "yes".`)
        return
      }
      const options: DecisionOption[] = [
        { key: 'true', description: condition },
        { key: 'false', description: f.no.trim() || negate(condition) },
      ]
      answered.push({
        question: { name, kind: 'boolean', label: title, instructions: '', threshold: f.threshold, options },
        title,
        labels: ['Yes', 'No'],
      })
      return
    }

    const source = (f.kind === 'score' ? f.levels : f.options).filter(filled)
    if (source.length < 2) {
      errors.push(`${title}: add at least two ${f.kind === 'score' ? 'levels' : 'answers'}.`)
      return
    }
    const keys = new Set<string>()
    const labels: string[] = []
    const options = source.map((o, i): DecisionOption => {
      const label = o.label.trim() || (o.media ? mediaName(o.media) : '')
      labels.push(label)
      const media = o.media ?? undefined
      // Rating levels score 1..K, so the expected score reads on the same scale.
      if (f.kind === 'score') {
        const description = [o.label.trim(), o.description.trim()].filter(Boolean).join(': ')
        return { key: String(i + 1), description, media }
      }
      return { key: unique(label, keys), description: o.description.trim(), media }
    })
    answered.push({ question: { name, kind: f.kind, label: title, instructions: f.text.trim(), threshold: 0.5, options }, title, labels })
  })

  if (!form.length) errors.push('Add a question to decide on.')
  return { answered, errors }
}

/** Turns parsed questions (e.g. from an example payload) into form state. */
export function formFromQuestions(questions: Question[], media: Record<string, Record<string, MediaAsset>> = {}): FormQuestion[] {
  return questions.map((q) => {
    const f = newQuestion(q.kind, q.label === q.name ? '' : q.label)
    if (q.kind === 'boolean') {
      f.yes = q.options[0].description
      f.no = q.options[1].description
      f.threshold = q.threshold
    } else if (q.kind === 'score') {
      f.levels = q.options.map((o) => {
        // Rubric entries read "1: Label: description" -> key "1", description "Label: description".
        const split = o.description.indexOf(': ')
        if (Number.isFinite(Number(o.key)) && split > 0) {
          return newOption(o.description.slice(0, split), o.description.slice(split + 2), media[q.name]?.[o.key])
        }
        return Number.isFinite(Number(o.key))
          ? newOption(o.description || o.key, '', media[q.name]?.[o.key])
          : newOption(o.key, o.description, media[q.name]?.[o.key])
      })
    } else {
      f.options = q.options.map((o) => newOption(o.key, o.description, media[q.name]?.[o.key]))
    }
    return f
  })
}
