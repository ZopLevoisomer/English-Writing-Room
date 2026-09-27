import type { ApiSettings } from './types'

export default function AppearanceControls({ settings, onChange }: {
  settings: ApiSettings; onChange: (patch: Pick<ApiSettings, 'colorMode' | 'themeColor'>) => void
}) {
  const dark = settings.colorMode === 'dark'
  return <div className="appearance-controls" role="group" aria-label="外观设置">
    <button className="mode-toggle" aria-label={dark ? '切换到日间模式' : '切换到夜间模式'} aria-pressed={dark} onClick={() => onChange({ colorMode: dark ? 'light' : 'dark' })}>
      <span aria-hidden="true">{dark ? '☾' : '☀'}</span>{dark ? '夜间' : '日间'}
    </button>
    <label className="theme-picker"><span>主题色</span><select aria-label="主题色" value={settings.themeColor ?? 'forest'} onChange={event => onChange({ themeColor: event.target.value as NonNullable<ApiSettings['themeColor']> })}>
      <option value="forest">书林绿</option><option value="ink">墨水蓝</option><option value="rose">蔷薇紫</option><option value="sepia">旧书棕</option>
    </select></label>
  </div>
}
