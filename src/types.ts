export type Category = { id: string; name: string }
export type Topic = { id: string; categoryId: string; name: string }
export type Sentence = {
  id: string; categoryId: string; topicId: string; english: string; chinese: string
  tags?: string[]; favorite?: boolean
}
export type EssayBlock =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'template'; sentenceId: string; content: string; sourceLabel?: string }
export type Paragraph = 'paragraph1' | 'paragraph2'
export type Library = { categories: Category[]; topics: Topic[]; sentences: Sentence[] }
export type ApiSettings = { baseUrl?: string; model?: string; saveApiKey?: boolean; apiKey?: string; colorMode?: 'light' | 'dark'; themeColor?: 'forest' | 'ink' | 'rose' | 'sepia' }
export type AppData = Library & {
  version: 1; essays: Essay[]; currentEssayId: string
  settings: ApiSettings
}
export type Essay = {
  id: string; title: string; sourceText: string
  paragraph1Starter: string; paragraph2Starter: string
  paragraph1: EssayBlock[]; paragraph2: EssayBlock[]
}
