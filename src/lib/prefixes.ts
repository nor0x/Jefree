// Task instruction prefixes from the EmbeddingGemma 2 model card. They apply to text only.
export interface Task {
  id: string
  label: string
  hint: string
  usesTitle?: boolean
  format: (text: string, title: string) => string
}

const query = (task: string) => (text: string) => `task: ${task} | query: ${text}`

export const TASKS: Task[] = [
  { id: 'search', label: 'Search query', hint: 'Asymmetric: compare against documents', format: query('search result') },
  {
    id: 'document',
    label: 'Document / passage',
    hint: 'Corpus side of search, QA, fact checking and code search',
    usesTitle: true,
    format: (text, title) => `title: ${title.trim() || 'none'} | text: ${text}`,
  },
  { id: 'qa', label: 'Question answering', hint: 'Asymmetric: compare against documents', format: query('question answering') },
  { id: 'fact', label: 'Fact checking', hint: 'Asymmetric: compare against evidence documents', format: query('fact checking') },
  { id: 'code', label: 'Code retrieval', hint: 'Asymmetric: compare against code documents', format: query('code retrieval') },
  { id: 'classification', label: 'Classification', hint: 'Symmetric: use for every input compared', format: query('classification') },
  { id: 'clustering', label: 'Clustering', hint: 'Symmetric: use for every input compared', format: query('clustering') },
  { id: 'similarity', label: 'Sentence similarity', hint: 'Symmetric: use for every input compared', format: query('sentence similarity') },
  { id: 'raw', label: 'No prefix', hint: 'Embed the text exactly as typed', format: (text) => text },
]
