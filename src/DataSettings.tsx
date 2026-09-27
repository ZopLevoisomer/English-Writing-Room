import { useState } from 'react'
import { defaultLibrary, exportData, parseData } from './persistence'
import ApiSettingsForm from './ApiSettingsForm'
import type { ApiSettings, AppData } from './types'

export default function DataSettings({ data, apiKey, onSaveApi, onReplace }: {
  data: AppData; apiKey: string; onSaveApi: (settings: ApiSettings, key: string) => void
  onReplace: (data: AppData, imported?: boolean) => void
}) {
  const [pending, setPending] = useState<AppData | null>(null)
  const [message, setMessage] = useState('')
  const [reading, setReading] = useState(false)
  async function readFile(file?: File) {
    setPending(null); setMessage('')
    if (!file) return
    setReading(true)
    try { setPending(parseData(JSON.parse(await file.text()))) }
    catch (error) { setMessage(`导入失败：${error instanceof Error ? error.message : '文件无法读取'}。现有数据未更改。`) }
    finally { setReading(false) }
  }
  function apply(next: AppData, success: string, imported = false) {
    try { onReplace(next, imported); setPending(null); setMessage(success) }
    catch { setMessage('保存失败：本地存储不可用或空间不足，现有数据未更改。') }
  }
  function download() {
    const blob = new Blob([exportData(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `english-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('已导出本地素材和作文，备份不包含 API Key。')
  }
  return <main className="settings-layout panel management-panel">
    <ApiSettingsForm settings={data.settings} apiKey={apiKey} onSave={onSaveApi} />
    <h2>本地数据管理</h2><p className="muted">当前有 {data.categories.length} 个板块、{data.topics.length} 个主题、{data.sentences.length} 条句子、{data.essays.length} 篇作文。</p>
    <section><h3>导出备份</h3><p>将素材库、标签、收藏、全部作文及当前作文选择导出为 JSON。默认不包含 API Key。</p><button className="primary-button" onClick={download}>导出 JSON</button></section>
    <section><h3>覆盖导入</h3><p>导入会覆盖当前素材库和全部作文。建议先导出备份；文件通过校验后才能确认覆盖。</p>
      <label htmlFor="import-file">选择 JSON 备份文件</label><input id="import-file" type="file" accept=".json,application/json" disabled={reading} onChange={e => { void readFile(e.target.files?.[0]); e.target.value = '' }} />
      {reading && <p role="status">正在校验文件…</p>}
      {pending && <div className="import-preview"><p>校验通过：{pending.categories.length} 个板块、{pending.topics.length} 个主题、{pending.sentences.length} 条句子、{pending.essays.length} 篇作文。</p><p>当前作文：{pending.essays.find(e => e.id === pending.currentEssayId)?.title || '未命名作文'}</p>
        <div className="action-row"><button className="primary-button" onClick={() => apply(pending, '导入成功，全部本地数据已恢复。请重新填写 API Key。', true)}>确认覆盖导入</button><button onClick={() => setPending(null)}>取消导入</button></div></div>}
    </section>
    <section><h3>恢复默认素材库</h3><p>将替换素材库，清除自建素材及收藏、标签修改。已有作文和模板高亮会保留。</p><button className="danger-button" onClick={() => {
      if (window.confirm('恢复默认素材库？自建素材及收藏、标签修改将被替换。已有作文保持不变。')) apply({ ...data, ...defaultLibrary() }, '已恢复默认素材库，作文保持不变。')
    }}>恢复默认素材库</button></section>
    <p role="status" className="settings-message">{message}</p>
  </main>
}
