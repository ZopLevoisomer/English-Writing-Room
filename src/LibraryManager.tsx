import { useState } from 'react'
import { matchesSentence, sentenceSource } from './persistence'
import { tagTone } from './tagStyle'
import type { Library, Sentence } from './types'

type Props = { library: Library; onChange: (library: Library) => void }

export default function LibraryManager({ library, onChange }: Props) {
  const { categories, topics, sentences } = library
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id ?? '')
  const categoryId = categories.some(c => c.id === selectedCategory) ? selectedCategory : categories[0]?.id ?? ''
  const categoryTopics = topics.filter(t => t.categoryId === categoryId)
  const [selectedTopic, setSelectedTopic] = useState('')
  const topicId = categoryTopics.some(t => t.id === selectedTopic) ? selectedTopic : categoryTopics[0]?.id ?? ''
  const category = categories.find(c => c.id === categoryId)
  const topic = topics.find(t => t.id === topicId)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [editing, setEditing] = useState<Sentence | null>(null)
  const [form, setForm] = useState({ english: '', chinese: '', tags: '' })
  const [message, setMessage] = useState('')

  function clearSentence() { setEditing(null); setForm({ english: '', chinese: '', tags: '' }) }
  function removeCategory() {
    const count = sentences.filter(s => s.categoryId === categoryId).length
    if (!window.confirm(`删除板块“${category?.name}”及其 ${categoryTopics.length} 个主题、${count} 条模板句？已加入作文的内容和高亮将保留。`)) return
    onChange({ categories: categories.filter(c => c.id !== categoryId), topics: topics.filter(t => t.categoryId !== categoryId), sentences: sentences.filter(s => s.categoryId !== categoryId) })
    clearSentence()
  }
  function removeTopic() {
    const count = sentences.filter(s => s.topicId === topicId).length
    if (!window.confirm(`删除主题“${topic?.name}”及其 ${count} 条模板句？已加入作文的内容和高亮将保留。`)) return
    onChange({ ...library, topics: topics.filter(t => t.id !== topicId), sentences: sentences.filter(s => s.topicId !== topicId) })
    clearSentence()
  }
  function saveSentence(event: React.FormEvent) {
    event.preventDefault()
    if (!topicId || !form.english.trim() || !form.chinese.trim()) { setMessage('请选择主题并填写英文和中文释义。'); return }
    const sentence: Sentence = { id: editing?.id ?? crypto.randomUUID(), categoryId, topicId,
      english: form.english.trim(), chinese: form.chinese.trim(),
      tags: [...new Set(form.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean))], favorite: sentences.find(s => s.id === editing?.id)?.favorite ?? false }
    onChange({ ...library, sentences: editing ? sentences.map(s => s.id === editing.id ? sentence : s) : [...sentences, sentence] })
    setMessage(editing ? '模板句已更新，作文中已加入的内容保持原样。' : '模板句已添加。')
    clearSentence()
  }
  const filtered = sentences.filter(s => (query.trim() || favorites ? true : s.topicId === topicId)
    && matchesSentence(s, query, library) && (!favorites || s.favorite))

  return <main className="management-layout">
    <section className="panel management-panel" aria-label="板块与主题管理">
      <h2>板块与主题</h2>
      <label htmlFor="manage-category">所属板块</label>
      <select id="manage-category" value={categoryId} onChange={e => { setSelectedCategory(e.target.value); setSelectedTopic('') }} disabled={!categories.length}>
        {!categories.length && <option value="">暂无板块，请先新增</option>}
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <NameForm key={`category-${categoryId}-${category?.name}`} kind="板块" currentName={category?.name} onSave={(name, create) => {
        if (categories.some(c => c.name === name && (create || c.id !== categoryId))) return '板块名称已存在。'
        const id = crypto.randomUUID()
        onChange({ ...library, categories: create ? [...categories, { id, name }] : categories.map(c => c.id === categoryId ? { ...c, name } : c) })
        if (create) setSelectedCategory(id)
      }} onDelete={removeCategory} />
      <label htmlFor="manage-topic">所属主题</label>
      <select id="manage-topic" value={topicId} onChange={e => setSelectedTopic(e.target.value)} disabled={!categoryTopics.length}>
        {!categoryTopics.length && <option value="">暂无主题，请先新增</option>}
        {categoryTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <NameForm key={`topic-${topicId}-${topic?.name}`} kind="主题" currentName={topic?.name} disabled={!categoryId} onSave={(name, create) => {
        if (categoryTopics.some(t => t.name === name && (create || t.id !== topicId))) return '该板块下已存在同名主题。'
        const id = crypto.randomUUID()
        onChange({ ...library, topics: create ? [...topics, { id, name, categoryId }] : topics.map(t => t.id === topicId ? { ...t, name } : t) })
        if (create) setSelectedTopic(id)
      }} onDelete={removeTopic} />
      <p className="muted">删除板块或主题会一并删除其中的素材。作文中的模板句作为独立内容保留。</p>
    </section>
    <section className="panel management-panel" aria-label="模板句管理">
      <h2>{editing ? '编辑模板句' : '新增模板句'}</h2>
      <p className="muted">保存到：{category?.name ?? '未选择板块'} · {topic?.name ?? '未选择主题'}。编辑时可通过左侧选择更改归属。</p>
      <form onSubmit={saveSentence}>
        <label htmlFor="sentence-english">英文</label><textarea id="sentence-english" rows={3} required value={form.english} onChange={e => setForm({ ...form, english: e.target.value })} />
        <label htmlFor="sentence-chinese">中文释义</label><textarea id="sentence-chinese" rows={2} required value={form.chinese} onChange={e => setForm({ ...form, chinese: e.target.value })} />
        <label htmlFor="sentence-tags">标签（用逗号分隔）</label><input id="sentence-tags" value={form.tags} placeholder="例如：比赛，勇气" onChange={e => setForm({ ...form, tags: e.target.value })} />
        <div className="action-row"><button className="primary-button" disabled={!topicId} type="submit">{editing ? '保存模板句' : '添加模板句'}</button>{editing && <button type="button" onClick={clearSentence}>取消编辑</button>}</div>
      </form>
      <p className="notice" role="status">{message}</p>
      <div className="search-row"><label htmlFor="manage-search">搜索全部素材</label><input id="manage-search" placeholder="英文、中文、标签、板块或主题" value={query} onChange={e => setQuery(e.target.value)} /><label className="checkbox-label"><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)} />只看收藏</label></div>
      <p className="muted">{query.trim() || favorites ? '全部板块' : '当前主题'} · {filtered.length} 条句子</p>
      <div className="managed-sentences">
        {filtered.map(s => <article className="sentence" key={s.id}>
          <p className="block-label">{sentenceSource(s, library)}</p><p className="english">{s.english}</p><p className="translation">{s.chinese}</p>
          <div className="tags">{s.tags?.map(tag => <span key={tag} data-tone={tagTone(tag)}>{tag}</span>)}</div>
          <div className="action-row"><button aria-pressed={s.favorite ?? false} onClick={() => onChange({ ...library, sentences: sentences.map(item => item.id === s.id ? { ...item, favorite: !item.favorite } : item) })}>{s.favorite ? '★ 已收藏' : '☆ 收藏'}</button>
            <button onClick={() => { setEditing(s); setForm({ english: s.english, chinese: s.chinese, tags: s.tags?.join('，') ?? '' }); setSelectedCategory(s.categoryId); setSelectedTopic(s.topicId); setMessage('') }}>编辑模板句</button>
            <button className="danger-button" onClick={() => {
              if (!window.confirm('删除这条模板句？已加入作文的内容和高亮将保留。')) return
              onChange({ ...library, sentences: sentences.filter(item => item.id !== s.id) })
              if (editing?.id === s.id) clearSentence()
            }}>删除模板句</button></div>
        </article>)}
        {!filtered.length && <p className="empty-state">暂无匹配的模板句。可以添加新句子或调整搜索条件。</p>}
      </div>
    </section>
  </main>
}

function NameForm({ kind, currentName, disabled, onSave, onDelete }: {
  kind: string; currentName?: string; disabled?: boolean
  onSave: (name: string, create: boolean) => string | undefined; onDelete: () => void
}) {
  const [name, setName] = useState(currentName ?? '')
  const [error, setError] = useState('')
  function save(create: boolean) {
    if (!name.trim()) { setError('名称不能为空。'); return }
    setError(onSave(name.trim(), create) ?? '')
  }
  return <div className="name-form"><label>{kind}名称<input value={name} disabled={disabled} onChange={e => setName(e.target.value)} /></label>
    <div className="action-row"><button disabled={disabled} onClick={() => save(true)}>新增{kind}</button><button disabled={!currentName} onClick={() => save(false)}>保存{kind}名称</button><button className="danger-button" disabled={!currentName} onClick={onDelete}>删除{kind}</button></div>
    {error && <p role="alert" className="error-message">{error}</p>}
  </div>
}
