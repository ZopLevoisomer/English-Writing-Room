import { useEffect, useState } from 'react'
import { completionUrl } from './ai'
import type { ApiSettings } from './types'

export default function ApiSettingsForm({ settings, apiKey, onSave }: {
  settings: ApiSettings; apiKey: string; onSave: (settings: ApiSettings, apiKey: string) => void
}) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl ?? 'https://api.openai.com/v1')
  const [model, setModel] = useState(settings.model ?? '')
  const [key, setKey] = useState(apiKey)
  const [remember, setRemember] = useState(settings.saveApiKey ?? false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    setBaseUrl(settings.baseUrl ?? 'https://api.openai.com/v1'); setModel(settings.model ?? '')
    setKey(apiKey); setRemember(settings.saveApiKey ?? false)
  }, [settings, apiKey])

  return <section aria-label="API 设置"><h3>API 设置</h3>
    <p>连接兼容 OpenAI Chat Completions 的服务。点击 AI 功能时，题目和当前作文会发送到你填写的服务地址；服务需支持浏览器跨域请求（CORS）。</p>
    <form onSubmit={event => {
      event.preventDefault()
      try {
        completionUrl(baseUrl)
        if (!model.trim()) throw new Error('请填写 Model。')
        if (/[\r\n]/.test(key)) throw new Error('API Key 格式不正确。')
        onSave({ baseUrl: baseUrl.trim().replace(/\/+$/, ''), model: model.trim(), saveApiKey: remember,
          ...(remember && key.trim() ? { apiKey: key.trim() } : {}) }, key.trim())
        setMessage(remember ? 'API 设置已保存，Key 保存在本机浏览器中。' : 'API 设置已保存，Key 仅在当前页面有效，刷新后需重新填写。')
      } catch (error) { setMessage(error instanceof Error ? error.message : 'API 设置保存失败。') }
    }}>
      <label htmlFor="api-base-url">API Base URL</label><input id="api-base-url" type="url" required value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://你的服务地址/v1" />
      <label htmlFor="api-model">Model</label><input id="api-model" required value={model} onChange={e => setModel(e.target.value)} placeholder="填写服务商提供的模型名称" />
      <label htmlFor="api-key">API Key</label><input id="api-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="不需要鉴权的本机服务可留空" />
      <label className="checkbox-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />在本地保存 API Key</label>
      <p>勾选后 Key 以明文保存在当前浏览器。取消勾选并保存会删除已保存的 Key；JSON 备份始终不包含 Key。</p>
      <button className="primary-button" type="submit">保存 API 设置</button>
    </form>
    <p role="status" className="settings-message">{message}</p>
  </section>
}
