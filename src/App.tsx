import { Fragment, useEffect, useLayoutEffect, useState } from 'react'
import { loadData, matchesSentence, saveData, sentenceSource } from './persistence'
import LibraryManager from './LibraryManager'
import DataSettings from './DataSettings'
import AiPanel from './AiPanel'
import EssayReader from './EssayReader'
import AppearanceControls from './AppearanceControls'
import { tagTone } from './tagStyle'
import type { ApiSettings, AppData, Essay, EssayBlock, Paragraph, Sentence } from './types'

export default function App() {
  const [initial] = useState(loadData)
  const [data, setData] = useState(initial.data)
  const [apiKey, setApiKey] = useState(initial.data.settings.apiKey ?? '')
  const [loadError, setLoadError] = useState(initial.error)
  const { categories, topics, sentences } = data
  const essay = data.essays.find(e => e.id === data.currentEssayId)!
  function setEssay(update: (essay: Essay) => Essay) {
    setData(current => ({ ...current, essays: current.essays.map(e => e.id === current.currentEssayId ? update(e) : e) }))
  }
  const [saveState, setSaveState] = useState(initial.error || '正在保存…')
  const [selectedCategory, setCategoryId] = useState(categories[0]?.id ?? '')
  const categoryId = categories.some(c => c.id === selectedCategory) ? selectedCategory : categories[0]?.id ?? ''
  const [selectedTopic, setTopicId] = useState(topics[0]?.id ?? '')
  const topicId = topics.some(t => t.id === selectedTopic && t.categoryId === categoryId) ? selectedTopic : topics.find(t => t.categoryId === categoryId)?.id ?? ''
  const [view, setView] = useState<'workbench' | 'library' | 'settings'>('workbench')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [target, setTarget] = useState<Paragraph>('paragraph1')
  const [notice, setNotice] = useState('')
  const [reading, setReading] = useState<Essay | null>(null)

  useLayoutEffect(() => {
    document.documentElement.dataset.mode = data.settings.colorMode ?? 'light'
    document.documentElement.dataset.theme = data.settings.themeColor ?? 'forest'
  }, [data.settings.colorMode, data.settings.themeColor])

  useEffect(() => {
    if (loadError) return
    try {
      saveData(data)
      setSaveState('已自动保存到本机')
    } catch {
      setSaveState('保存失败：浏览器存储不可用或空间不足。请保留此页面并复制作文备份。')
    }
  }, [data, loadError])

  function replaceData(next: AppData, imported = false) {
    saveData(next)
    setData(next)
    setLoadError(null)
    if (imported) setApiKey('')
    setQuery(''); setFavorites(false); setNotice('')
  }
  function saveApi(settings: ApiSettings, key: string) {
    settings = { ...data.settings, ...settings, apiKey: settings.apiKey }
    if (loadError) throw new Error('请先导入有效备份恢复本地数据，再保存 API 设置。')
    try { saveData({ ...data, settings }) } catch { throw new Error('API 设置保存失败：本地存储不可用或空间不足，原设置未更改。') }
    setData(current => ({ ...current, settings })); setApiKey(key)
  }
  function toggleFavorite(sentence: Sentence) {
    setData(current => ({ ...current, sentences: current.sentences.map(s => s.id === sentence.id ? { ...s, favorite: !s.favorite } : s) }))
  }

  function editField(field: keyof Pick<Essay, 'title' | 'sourceText' | 'paragraph1Starter' | 'paragraph2Starter'>, value: string) {
    setEssay(current => ({ ...current, [field]: value }))
  }

  function addTemplate(sentence: Sentence) {
    const block: EssayBlock = { id: crypto.randomUUID(), type: 'template', sentenceId: sentence.id, content: sentence.english, sourceLabel: sentenceSource(sentence, data) }
    setEssay(current => ({ ...current, [target]: [...current[target], block] }))
    setNotice(`已添加到 Paragraph ${target === 'paragraph1' ? '1' : '2'}`)
  }

  function insertText(paragraph: Paragraph, index: number) {
    const block: EssayBlock = { id: crypto.randomUUID(), type: 'text', content: '' }
    setEssay(current => ({ ...current, [paragraph]: [...current[paragraph].slice(0, index), block, ...current[paragraph].slice(index)] }))
  }

  function editBlock(paragraph: Paragraph, id: string, content: string) {
    setEssay(current => ({ ...current, [paragraph]: current[paragraph].map(block => block.id === id ? { ...block, content } : block) }))
  }

  function moveBlock(paragraph: Paragraph, index: number, direction: -1 | 1) {
    setEssay(current => {
      const blocks = [...current[paragraph]]
      const next = index + direction
      if (next < 0 || next >= blocks.length) return current
      ;[blocks[index], blocks[next]] = [blocks[next], blocks[index]]
      return { ...current, [paragraph]: blocks }
    })
  }

  function transferBlock(paragraph: Paragraph, id: string) {
    const destination = paragraph === 'paragraph1' ? 'paragraph2' : 'paragraph1'
    setEssay(current => {
      const block = current[paragraph].find(item => item.id === id)
      if (!block) return current
      return { ...current, [paragraph]: current[paragraph].filter(item => item.id !== id), [destination]: [...current[destination], block] }
    })
    setNotice(`已移至 Paragraph ${destination === 'paragraph1' ? '1' : '2'} 末尾`)
  }

  function sourceLabel(block: EssayBlock) {
    if (block.type === 'text') return '连接文字'
    if (block.sourceLabel) return block.sourceLabel
    const sentence = sentences.find(item => item.id === block.sentenceId)
    return sentence ? `${categories.find(item => item.id === sentence.categoryId)?.name} · ${topics.find(item => item.id === sentence.topicId)?.name}` : '模板句'
  }

  const visibleSentences = sentences.filter(s => (query.trim() || favorites ? true : s.topicId === topicId)
    && matchesSentence(s, query, data) && (!favorites || s.favorite))

  return (
    <div className="app-shell">
      <div className="edition-line" aria-hidden="true"><span>A quiet place for words.</span><span>COLLECT / COMPOSE / CONTINUE</span></div>
      <header className="app-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">W<span>／</span></span><div><h1 lang="en">The Writing Room<span className="brand-period">.</span></h1><p>高考英语读后续写 · 把熟悉的句子，写进自己的故事</p></div></div>
        <div className="header-tools"><AppearanceControls settings={data.settings} onChange={patch => setData(current => ({ ...current, settings: { ...current.settings, ...patch } }))} /><div className="save-state" role="status"><span aria-hidden="true">{saveState.startsWith('已') ? '●' : '○'}</span> {saveState}</div></div>
      </header>
      <nav className="view-nav" aria-label="主要视图">{([['workbench', '作文工作台', '01 / WRITE'], ['library', '素材库管理', '02 / COLLECT'], ['settings', '设置', '03 / PREFERENCES']] as const).map(([key, label, english]) => <button key={key} aria-label={label} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}><span lang="en">{english}</span>{label}</button>)}</nav>
      <div className="workspace-heading"><div><span className="eyebrow">{view === 'workbench' ? 'THE ART OF CONTINUATION' : view === 'library' ? 'A PERSONAL COMMONPLACE BOOK' : 'MAKE YOURSELF AT HOME'}</span><h2 lang="en">{view === 'workbench' ? <>Every sentence, <em>a beginning.</em></> : view === 'library' ? <>Words worth <em>keeping.</em></> : <>A space of <em>your own.</em></>}</h2></div><div className="heading-note"><svg className="book-ornament" viewBox="0 0 150 95" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 40Q44 31 72 47Q98 31 130 40L136 78Q103 70 73 84Q44 70 10 78Z"/><path d="M72 47L73 84M15 40L20 72Q45 65 73 80Q103 65 131 73L130 40M26 48Q43 44 59 51M25 55Q43 51 61 58M24 62Q43 59 62 65M86 52Q105 43 121 47M85 59Q105 50 123 54"/><path d="M77 65Q92 36 100 9M91 34Q73 27 79 16Q92 19 91 34ZM97 23Q112 23 114 12Q102 10 97 23ZM86 47Q70 43 72 32Q85 32 86 47ZM91 37Q108 40 112 29Q100 26 91 37Z"/></g><path d="M72 84V90M58 90H88" stroke="#ad9270" strokeWidth="1.2" strokeLinecap="round"/></svg><span>{view === 'workbench' ? '作文工作台' : view === 'library' ? '素材库管理' : '设置'}</span><p>{view === 'workbench' ? '拾取词句，铺陈情节，让故事继续。' : view === 'library' ? '收藏读过的好句，也留下自己的表达。' : '安顿好工具，把心思留给写作。'}</p></div></div>
      {view === 'library' && <LibraryManager library={data} onChange={library => setData(current => ({ ...current, ...library }))} />}
      {view === 'settings' && <DataSettings data={data} apiKey={apiKey} onSaveApi={saveApi} onReplace={replaceData} />}
      {view === 'workbench' && <main className="workspace">
        <aside className="library panel" aria-label="模板素材库">
          <div className="panel-kicker" lang="en">I. THE SENTENCE COLLECTION</div>
          <div className="panel-heading"><h2>模板素材库</h2><span>{sentences.length} 条素材</span></div>
          <div className="library-controls">
            <label htmlFor="library-search">搜索全部素材</label><input id="library-search" placeholder="英文、中文、标签或主题" value={query} onChange={e => setQuery(e.target.value)} />
            <label className="checkbox-label"><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)} />只看收藏</label>
            <label htmlFor="category">01 / 选择板块</label>
            <select id="category" value={categoryId} disabled={!categories.length} onChange={event => { setCategoryId(event.target.value); setTopicId(topics.find(topic => topic.categoryId === event.target.value)?.id ?? ''); setQuery(''); setFavorites(false) }}>
              {!categories.length && <option value="">暂无板块</option>}
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <div className="field-label">02 / 选择主题</div>
            <div className="flex flex-wrap gap-2" aria-label="主题">
              {topics.filter(topic => topic.categoryId === categoryId).map(topic => <button className={`topic ${topicId === topic.id ? 'active' : ''}`} data-tone={tagTone(topic.name)} aria-pressed={topicId === topic.id} key={topic.id} onClick={() => { setTopicId(topic.id); setQuery(''); setFavorites(false) }}>{topic.name}</button>)}
              {!topicId && <p className="muted">暂无主题，请到素材库管理中添加。</p>}
            </div>
            <label htmlFor="target">03 / 添加到哪一段</label>
            <select id="target" value={target} onChange={event => setTarget(event.target.value as Paragraph)}><option value="paragraph1">Paragraph 1</option><option value="paragraph2">Paragraph 2</option></select>
          </div>
          <div className="sentence-list">
            {(query.trim() || favorites) && <p className="search-summary">全部板块 · {visibleSentences.length} 条结果</p>}
            {visibleSentences.map(sentence => <article className="sentence" key={sentence.id}>
              <p className="block-label">{sentenceSource(sentence, data)}</p>
              <p className="english">{sentence.english}</p><p className="translation">{sentence.chinese}</p>
              <div className="tags">{sentence.tags?.map(tag => <span key={tag} data-tone={tagTone(tag)}>{tag}</span>)}</div>
              <div className="sentence-actions"><button className="add-template" onClick={() => addTemplate(sentence)}>＋ 加入作文</button><button className="favorite-button" aria-pressed={sentence.favorite ?? false} onClick={() => toggleFavorite(sentence)}>{sentence.favorite ? '★ 已收藏' : '☆ 收藏'}</button></div>
            </article>)}
            {!visibleSentences.length && <p className="empty-state">暂无匹配句子，请调整条件或添加素材。</p>}
          </div>
          <p className="library-note">先选主题，再挑一句适合故事的表达。加入后可以自由修改。</p>
          <div className="notice" role="status">{notice}</div>
        </aside>

        <section className="editor" aria-label="作文编辑">
          <section className="panel prompt-panel">
            <div className="panel-kicker" lang="en">II. YOUR MANUSCRIPT</div>
            <div className="panel-heading"><h2>题目与背景</h2><span>从这里开始你的故事</span></div>
            {data.essays.length > 1 && <><label htmlFor="current-essay">当前作文</label><select id="current-essay" value={essay.id} onChange={e => setData(current => ({ ...current, currentEssayId: e.target.value }))}>{data.essays.map(item => <option key={item.id} value={item.id}>{item.title || '未命名作文'}</option>)}</select></>}
            <label htmlFor="title">作文标题</label><input id="title" placeholder="给这篇续写起个名字" value={essay.title} onChange={event => editField('title', event.target.value)} />
            <label htmlFor="source">原文 / 题目</label><textarea id="source" rows={4} placeholder="在这里粘贴原文与写作要求…" value={essay.sourceText} onChange={event => editField('sourceText', event.target.value)} />
          </section>
          {(['paragraph1', 'paragraph2'] as const).map((paragraph, paragraphIndex) => {
            const starter = paragraph === 'paragraph1' ? 'paragraph1Starter' : 'paragraph2Starter'
            return <section className="panel paragraph-panel" key={paragraph} aria-label={`Paragraph ${paragraphIndex + 1}`}>
              <div className="panel-heading"><h2><span className="paragraph-number">0{paragraphIndex + 1}</span> Paragraph {paragraphIndex + 1}</h2><span>{essay[paragraph].length} 个内容块</span></div>
              <label htmlFor={starter}>段首句</label><textarea id={starter} className="english" rows={2} placeholder="输入题目给出的段首句…" value={essay[starter]} onChange={event => editField(starter, event.target.value)} />
              <div className="blocks">
                {essay[paragraph].length === 0 && <div className="empty-state"><p>故事从一句话开始</p><span>从左侧加入模板句，或在下方添加自己的连接文字。</span></div>}
                <button className="insert-text" onClick={() => insertText(paragraph, 0)}>＋ 添加连接文字</button>
                {essay[paragraph].map((block, index) => <Fragment key={block.id}>
                  <div className={`essay-block ${block.type}`} data-testid={`${block.type}-block`}>
                    <div className="block-top"><span className="block-label">{block.type === 'template' && <strong>模板句</strong>} {sourceLabel(block)}</span><span className="block-index">{String(index + 1).padStart(2, '0')}</span></div>
                    <textarea className="english" aria-label={`Paragraph ${paragraphIndex + 1} ${block.type === 'template' ? '模板句' : '连接文字'} ${index + 1}`} rows={3} value={block.content} placeholder="写下自己的连接文字…" onChange={event => editBlock(paragraph, block.id, event.target.value)} />
                    <div className="block-actions"><button disabled={index === 0} onClick={() => moveBlock(paragraph, index, -1)}>↑ 上移</button><button disabled={index === essay[paragraph].length - 1} onClick={() => moveBlock(paragraph, index, 1)}>↓ 下移</button><button onClick={() => transferBlock(paragraph, block.id)}>移至第 {paragraphIndex === 0 ? '2' : '1'} 段</button><button className="delete" onClick={() => setEssay(current => ({ ...current, [paragraph]: current[paragraph].filter(item => item.id !== block.id) }))}>删除</button></div>
                  </div>
                  <button className="insert-text" onClick={() => insertText(paragraph, index + 1)}>＋ 添加连接文字</button>
                </Fragment>)}
              </div>
            </section>
          })}
          <div className="submit-manuscript"><div><span className="eyebrow">READY TO READ?</span><p>写好了？把词句连成完整的故事。</p></div><button className="primary-button" disabled={![essay.paragraph1Starter, essay.paragraph2Starter, ...essay.paragraph1.map(b => b.content), ...essay.paragraph2.map(b => b.content)].some(text => text.trim())} onClick={() => setReading(structuredClone(essay))}>Submit · 生成全文</button></div>
        </section>

        <AiPanel key={essay.id} essay={essay} library={data} settings={data.settings} apiKey={apiKey} onSettings={() => setView('settings')}
          onTopic={id => { const topic = topics.find(t => t.id === id); if (topic) { setCategoryId(topic.categoryId); setTopicId(id); setQuery(''); setFavorites(false) } }}
          onApply={(snapshot, draft) => setEssay(current => JSON.stringify(current) === snapshot ? { ...current, paragraph1: draft.paragraph1, paragraph2: draft.paragraph2 } : current)} />
      </main>}
      {reading && <EssayReader essay={reading} onClose={() => setReading(null)} />}
      <footer><span lang="en">The Writing Room.</span><p>One sentence at a time.<span aria-hidden="true"> / </span>让故事，慢慢成形。</p><span className="footer-flourish" aria-hidden="true">❧</span></footer>
    </div>
  )
}
