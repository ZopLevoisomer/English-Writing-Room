import { useEffect, useRef, useState } from 'react'
import { actionNames, requestAi, type AiAction, type AiResult } from './ai'
import type { ApiSettings, Essay, EssayBlock, Library } from './types'

export default function AiPanel({ essay, library, settings, apiKey, onSettings, onTopic, onApply }: {
  essay: Essay; library: Library; settings: ApiSettings; apiKey: string
  onSettings: () => void; onTopic: (id: string) => void
  onApply: (snapshot: string, draft: Extract<AiResult, { kind: 'draft' }>) => void
}) {
  const [busy, setBusy] = useState<AiAction | null>(null)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<{ result: AiResult; essay: Essay; snapshot: string; action: AiAction } | null>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { pending.current?.abort(); pending.current = null }, [])
  const stale = preview !== null && preview.snapshot !== JSON.stringify(essay)

  async function run(action: AiAction) {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(action); setPreview(null); setMessage('')
    const snapshot = JSON.stringify(essay)
    try {
      const result = await requestAi(action, essay, library, settings, apiKey, controller.signal)
      if (pending.current !== controller) return
      setPreview({ result, essay, snapshot, action })
      setMessage('结果已生成，作文尚未修改。')
    } catch (error) {
      if (pending.current === controller) setMessage(error instanceof Error ? error.message : 'AI 请求失败，作文未更改。')
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(null) }
    }
  }
  function cancel() {
    pending.current?.abort(); pending.current = null
    setBusy(null); setMessage('已取消请求，作文未更改。')
  }
  const result = preview?.result
  const blocks = [...essay.paragraph1, ...essay.paragraph2]
  const wordCount = [essay.paragraph1Starter, essay.paragraph2Starter, ...blocks.map(b => b.content)].join(' ').match(/[a-zA-Z]+(?:['’-][a-zA-Z]+)*/g)?.length ?? 0
  return <aside className="ai-panel panel" aria-label="AI 辅助">
    <div className="panel-kicker" lang="en">III. NOTES IN THE MARGIN</div>
    <div className="panel-heading"><h2>AI 辅助</h2><button onClick={onSettings}>API 设置</button></div>
    <p className="muted">先选句，再让 AI 帮忙衔接。结果先预览，由你决定是否采用。</p>
    <div className="ai-actions">{(Object.keys(actionNames) as AiAction[]).map(action => <button key={action} disabled={busy !== null} onClick={() => void run(action)}>{actionNames[action]}</button>)}</div>
    {(!settings.baseUrl || !settings.model) && <p className="muted">使用前请在设置中填写服务地址、模型和所需的 API Key。</p>}
    {busy && <div className="ai-loading"><p role="status">正在{actionNames[busy]}…</p><button onClick={cancel}>取消请求</button></div>}
    {message && <p role="status" className="ai-message">{message}</p>}
    {preview && <section className="ai-result" aria-label="AI 结果预览">
      <h3>{actionNames[preview.action]} · 预览</h3>
      {stale && <p className="error-message" role="alert">作文已更改，此结果已过期。请重新生成后再应用。</p>}
      {result?.kind === 'recommend' && <>
        {!result.recommendations.length && <p className="muted">未找到适合当前题目的主题。</p>}
        {result.recommendations.map(item => {
          const topic = library.topics.find(t => t.id === item.topicId)
          const category = library.categories.find(c => c.id === topic?.categoryId)
          return <article className="ai-suggestion" key={item.topicId}><h4>{category?.name} · {topic?.name}</h4><p>{item.reason}</p><button disabled={stale || !topic} onClick={() => onTopic(item.topicId)}>查看该主题</button></article>
        })}
        <p className="muted">推荐不会自动添加句子。查看主题后，请在左侧自行选句。</p>
      </>}
      {result?.kind === 'grammar' && <>
        {!result.suggestions.length && <p className="muted">未发现明显语法问题。</p>}
        {result.suggestions.map((item, index) => <article className="ai-suggestion" key={index}><h4>Paragraph {item.paragraph === 'paragraph1' ? '1' : '2'}</h4><p><b>原文：</b><span lang="en">{item.original}</span></p><p><b>建议：</b><span lang="en">{item.correction}</span></p><p>{item.reason}</p></article>)}
        <p className="muted">语法检查只给建议，请核对后在编辑区手动修改。</p>
      </>}
      {result?.kind === 'draft' && <>
        <details className="ai-original"><summary>查看生成前的作文</summary>{(['paragraph1', 'paragraph2'] as const).map((name, index) => <div key={name}><h4>Paragraph {index + 1}</h4><p className="preview-starter">{preview.essay[index === 0 ? 'paragraph1Starter' : 'paragraph2Starter']}</p><PreviewBlocks blocks={preview.essay[name]} /></div>)}</details>
        <p className="muted">以下为拟应用的正文，段首句保持原样。高亮块为原模板句。</p>
        {(['paragraph1', 'paragraph2'] as const).map((name, index) => <div className="preview-paragraph" key={name}><h4>Paragraph {index + 1}</h4><p className="preview-starter">{preview.essay[index === 0 ? 'paragraph1Starter' : 'paragraph2Starter']}</p><PreviewBlocks blocks={result[name]} /></div>)}
        <button className="primary-button" disabled={stale} onClick={() => { onApply(preview.snapshot, result); setPreview(null); setMessage('已应用预览结果，模板高亮与来源已保留。') }}>确认应用到作文</button>
      </>}
      <button className="discard-result" onClick={() => { setPreview(null); setMessage('已放弃预览，作文未更改。') }}>放弃此结果</button>
    </section>}
    <p className="ai-count">{wordCount} 英文词（含段首句） · {blocks.filter(b => b.type === 'template').length} 个模板句</p>
    <p className="muted">模板句以主题色高亮，普通连接文字使用正文样式。草稿自动保存在当前浏览器。</p>
  </aside>
}

function PreviewBlocks({ blocks }: { blocks: EssayBlock[] }) {
  return <>{blocks.map(block => <div className={`preview-block ${block.type}`} key={block.id}>
    {block.type === 'template' && <span className="block-label">模板句 · {block.sourceLabel ?? '原素材'}</span>}
    <p lang="en">{block.content}</p>
  </div>)}</>
}
