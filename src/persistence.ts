import { categories, topics, sentences } from './data'
import type { AppData, Essay, EssayBlock, Library, Sentence } from './types'

export const STORAGE_KEY = 'english-continuation:v1'
export const emptyEssay = (): Essay => ({
  id: crypto.randomUUID(), title: '', sourceText: '', paragraph1Starter: '', paragraph2Starter: '',
  paragraph1: [], paragraph2: [],
})
export const defaultLibrary = (): Library => structuredClone({ categories, topics, sentences })
export function sentenceSource(sentence: Sentence, library: Library) {
  return `${library.categories.find(item => item.id === sentence.categoryId)?.name ?? '原板块'} · ${library.topics.find(item => item.id === sentence.topicId)?.name ?? '原主题'}`
}
function newData(): AppData {
  const essay = emptyEssay()
  return { version: 1, ...defaultLibrary(), essays: [essay], currentEssayId: essay.id, settings: {} }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('数据对象格式错误')
  return value as Record<string, unknown>
}
function string(value: unknown, name: string, nonempty = false): string {
  if (typeof value !== 'string' || (nonempty && !value.trim())) throw new Error(`${name}必须是${nonempty ? '非空' : ''}文本`)
  return value
}
function list<T extends { id: string }>(value: unknown, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('数据列表格式错误')
  const items = value.map(parse)
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('列表中存在重复 ID')
  return items
}
function parseEssay(value: unknown, library: Library): Essay {
  const e = record(value)
  const parseBlock = (value: unknown): EssayBlock => {
    const b = record(value)
    const common = { id: string(b.id, '内容块 ID', true), content: string(b.content, '作文内容') }
    if (b.type === 'text') return { ...common, type: 'text' }
    if (b.type !== 'template') throw new Error('未知作文内容块类型')
    const sentenceId = string(b.sentenceId, '模板句 ID', true)
    const sentence = library.sentences.find(item => item.id === sentenceId)
    const sourceLabel = b.sourceLabel === undefined ? (sentence ? sentenceSource(sentence, library) : '原素材已删除') : string(b.sourceLabel, '模板来源')
    return { ...common, type: 'template', sentenceId, sourceLabel }
  }
  const paragraph1 = list(e.paragraph1, parseBlock)
  const paragraph2 = list(e.paragraph2, parseBlock)
  if (new Set([...paragraph1, ...paragraph2].map(b => b.id)).size !== paragraph1.length + paragraph2.length) throw new Error('作文内容块 ID 重复')
  return { id: string(e.id, '作文 ID', true), title: string(e.title, '标题'), sourceText: string(e.sourceText, '题目'),
    paragraph1Starter: string(e.paragraph1Starter, '第一段段首句'), paragraph2Starter: string(e.paragraph2Starter, '第二段段首句'), paragraph1, paragraph2 }
}

// Reconstruct allowed fields instead of retaining arbitrary imported properties (including secrets).
export function parseData(value: unknown, includeLocalKey = false): AppData {
  const data = record(value)
  if (data.version !== 1) throw new Error('不支持的数据版本，仅支持 version: 1')
  if ('essay' in data && !('essays' in data)) {
    const library = defaultLibrary()
    const essay = parseEssay(data.essay, library)
    return { version: 1, ...library, essays: [essay], currentEssayId: essay.id, settings: {} }
  }
  const categories = list(data.categories, value => {
    const item = record(value)
    return { id: string(item.id, '板块 ID', true), name: string(item.name, '板块名称', true) }
  })
  const topics = list(data.topics, value => {
    const item = record(value)
    const categoryId = string(item.categoryId, '板块 ID', true)
    if (!categories.some(c => c.id === categoryId)) throw new Error('主题引用了不存在的板块')
    return { id: string(item.id, '主题 ID', true), name: string(item.name, '主题名称', true), categoryId }
  })
  const sentences = list(data.sentences, (value): Sentence => {
    const item = record(value)
    const categoryId = string(item.categoryId, '板块 ID', true)
    const topicId = string(item.topicId, '主题 ID', true)
    if (!topics.some(t => t.id === topicId && t.categoryId === categoryId)) throw new Error('模板句的主题或板块归属不正确')
    if (item.favorite !== undefined && typeof item.favorite !== 'boolean') throw new Error('收藏状态必须是布尔值')
    if (item.tags !== undefined && (!Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === 'string'))) throw new Error('标签必须是文本列表')
    return { id: string(item.id, '句子 ID', true), categoryId, topicId, english: string(item.english, '英文', true),
      chinese: string(item.chinese, '中文释义', true), tags: [...new Set((item.tags as string[] | undefined) ?? [])], favorite: item.favorite === true }
  })
  const library = { categories, topics, sentences }
  const essays = list(data.essays, value => parseEssay(value, library))
  if (!essays.length) essays.push(emptyEssay())
  const currentEssayId = data.currentEssayId === undefined ? essays[0].id : string(data.currentEssayId, '当前作文 ID', true)
  if (!essays.some(e => e.id === currentEssayId)) throw new Error('当前作文不存在')
  const rawSettings = record(data.settings)
  const settings: AppData['settings'] = {}
  if (rawSettings.colorMode !== undefined) {
    if (rawSettings.colorMode !== 'light' && rawSettings.colorMode !== 'dark') throw new Error('无效的日间 / 夜间模式')
    settings.colorMode = rawSettings.colorMode
  }
  if (rawSettings.themeColor !== undefined) {
    if (!['forest', 'ink', 'rose', 'sepia'].includes(String(rawSettings.themeColor))) throw new Error('无效的主题色')
    settings.themeColor = rawSettings.themeColor as NonNullable<AppData['settings']['themeColor']>
  }
  if (rawSettings.baseUrl !== undefined) settings.baseUrl = string(rawSettings.baseUrl, 'Base URL')
  if (rawSettings.model !== undefined) settings.model = string(rawSettings.model, 'Model')
  if (rawSettings.saveApiKey !== undefined) {
    if (typeof rawSettings.saveApiKey !== 'boolean') throw new Error('保存 API Key 选项必须是布尔值')
    settings.saveApiKey = includeLocalKey && rawSettings.saveApiKey
  }
  if (includeLocalKey && settings.saveApiKey && rawSettings.apiKey !== undefined) settings.apiKey = string(rawSettings.apiKey, 'API Key')
  return { version: 1, ...library, essays, currentEssayId, settings }
}

export function loadData(): { data: AppData; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { data: raw ? parseData(JSON.parse(raw), true) : newData(), error: null }
  } catch {
    return { data: newData(), error: '无法读取本地草稿，已暂停自动保存，避免覆盖原数据。可在设置中导入有效备份恢复。' }
  }
}
export function saveData(data: AppData) {
  const { apiKey, ...settings } = data.settings
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, settings: { ...settings, ...(settings.saveApiKey && apiKey ? { apiKey } : {}) } }))
}
export function exportData(data: AppData) {
  return JSON.stringify(parseData(data), null, 2)
}
export function matchesSentence(sentence: Sentence, query: string, library: Library) {
  const haystack = [sentence.english, sentence.chinese, ...(sentence.tags ?? []), sentenceSource(sentence, library)].join(' ').toLocaleLowerCase()
  return haystack.includes(query.trim().toLocaleLowerCase())
}
