import { Fragment, useEffect, useRef } from 'react'
import type { Essay, EssayBlock } from './types'

export default function EssayReader({ essay, onClose }: { essay: Essay; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="essay-reader" aria-labelledby="reader-heading" onClose={onClose}>
    <div className="reader-toolbar"><div><span className="eyebrow">THE FINISHED PAGES</span><h2 id="reader-heading">全文阅读</h2></div><button className="reader-close" onClick={() => dialog.current?.close()}>返回编辑</button></div>
    <p className="reader-note">按当前顺序组合成文。主题色底纹与下划线表示模板句，段首句和普通文字不作标注。</p>
    {essay.sourceText.trim() && <details className="reader-source"><summary>查看原文 / 题目</summary><p>{essay.sourceText}</p></details>}
    <article className="finished-essay" aria-label="作文正文">
      <div className="reading-imprint" aria-hidden="true">THE WRITING ROOM <span>·</span> A CONTINUATION</div>
      <h3 lang="en">{essay.title.trim() || 'My Story'}</h3>
      {(['paragraph1', 'paragraph2'] as const).map((paragraph, index) => {
        const starter = essay[index === 0 ? 'paragraph1Starter' : 'paragraph2Starter'].trim()
        const parts: { id: string; content: string; block?: EssayBlock }[] = [
          ...(starter ? [{ id: `${paragraph}-starter`, content: starter }] : []),
          ...essay[paragraph].filter(b => b.content.trim()).map(block => ({ id: block.id, content: block.content.trim(), block })),
        ]
        return parts.length > 0 && <p className="finished-paragraph" lang="en" key={paragraph}>
          {parts.map((part, partIndex) => <Fragment key={part.id}>{partIndex > 0 ? ' ' : ''}{part.block?.type === 'template'
            ? <mark className="finished-template" title={`模板句 · ${part.block.sourceLabel || '原素材'}`}>{part.content}</mark>
            : part.content}</Fragment>)}
        </p>
      })}
    </article>
    <p className="reader-colophon" lang="en">One sentence at a time. <span aria-hidden="true">❧</span></p>
  </dialog>
}
