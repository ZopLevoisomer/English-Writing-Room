import { test, expect, type Page, type Route } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const endpoint = 'https://ai.example.test/v1/chat/completions'
const storageKey = 'english-continuation:v1'
const navigate = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey)
const context = (route: Route) => JSON.parse(route.request().postDataJSON().messages[1].content)
async function reply(route: Route, result: unknown) {
  await route.fulfill({ json: { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] } })
}
async function configure(page: Page, remember = false) {
  await navigate(page, '设置')
  await page.getByLabel('API Base URL', { exact: true }).fill('https://ai.example.test/v1/')
  await page.getByLabel('Model', { exact: true }).fill('test-model')
  await page.getByLabel('API Key', { exact: true }).fill('test-only-key')
  await page.getByLabel('在本地保存 API Key', { exact: true }).setChecked(remember)
  await page.getByRole('button', { name: '保存 API 设置', exact: true }).click()
  await expect(page.getByText('API 设置已保存', { exact: false })).toBeVisible()
  await navigate(page, '作文工作台')
}
async function prepare(page: Page) {
  await page.goto('/')
  await configure(page)
  await page.locator('#source').fill('I was nervous before a school race. My friend encouraged me.')
  await page.locator('#paragraph1Starter').fill('Then my friend came to me.')
  await page.locator('#paragraph2Starter').fill('Finally, I crossed the finish line.')
}

test('题目 → 推荐 → 自行选句 → 串联预览确认 → 润色 → 语法建议', async ({ page }) => {
  await prepare(page)
  let action = 'recommend'
  await page.route(endpoint, async route => {
    const body = route.request().postDataJSON()
    expect(body.model).toBe('test-model')
    expect(body.stream).toBe(false)
    expect(route.request().headers().authorization).toBe('Bearer test-only-key')
    expect(JSON.stringify(body)).not.toContain('test-only-key')
    const input = context(route)
    if (action === 'recommend') {
      expect(input.topics.some((t: { id: string }) => t.id === 'nervous')).toBe(true)
      await reply(route, { recommendations: [{ topicId: 'nervous', reason: '比赛前的紧张心情与题目相符。' }] })
    } else if (action === 'grammar') {
      await reply(route, { suggestions: [{ paragraph: 'paragraph1', original: 'My friend were smiling.', correction: 'My friend was smiling.', reason: '单数主语 friend 应搭配 was。' }] })
    } else {
      await reply(route, { paragraph1: [...input.paragraph1.filter((b: { type: string }) => b.type === 'template'),
        { type: 'text', content: action === 'connect' ? 'My friend were smiling.' : 'My friend smiled and encouraged me.' }],
        paragraph2: [{ type: 'text', content: 'I thanked him for his support.' }] })
    }
  })
  const before = (await saved(page)).essays
  await page.getByRole('button', { name: '推荐模板主题', exact: true }).click()
  await expect(page.getByRole('region', { name: 'AI 结果预览' })).toContainText('情绪描写 · 紧张')
  expect((await saved(page)).essays).toEqual(before)
  await page.getByRole('button', { name: '查看该主题' }).click()
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  const template = (await saved(page)).essays[0].paragraph1[0]
  action = 'connect'
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toBeEnabled()
  expect((await saved(page)).essays[0].paragraph1).toEqual([template])
  await page.screenshot({ path: 'test-results/ai-preview.png', fullPage: true })
  await page.getByRole('button', { name: '确认应用到作文' }).click()
  expect((await saved(page)).essays[0].paragraph1[0]).toEqual(template)
  await expect(page.getByTestId('template-block')).toContainText('情绪描写 · 紧张')
  action = 'grammar'
  const connected = (await saved(page)).essays
  await page.getByRole('button', { name: '语法检查', exact: true }).click()
  await expect(page.getByRole('region', { name: 'AI 结果预览' })).toContainText('My friend was smiling.')
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toHaveCount(0)
  expect((await saved(page)).essays).toEqual(connected)
  action = 'polish'
  await page.getByRole('button', { name: '润色作文', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toBeEnabled()
  expect((await saved(page)).essays).toEqual(connected)
  await page.getByRole('button', { name: '确认应用到作文' }).click()
  await page.reload()
  await expect(page.getByTestId('template-block').getByRole('textbox')).toHaveValue(template.content)
  expect((await saved(page)).essays[0].paragraph1[0]).toEqual(template)
  await expect(page.getByRole('region', { name: 'Paragraph 1', exact: true }).getByTestId('text-block').getByRole('textbox')).toHaveValue('My friend smiled and encouraged me.')
})

test('手动编辑后旧预览不能覆盖新内容，放弃预览不改作文', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  await page.route(endpoint, async route => { const input = context(route); await reply(route, { paragraph1: input.paragraph1, paragraph2: [] }) })
  await page.getByRole('button', { name: '润色作文', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toBeEnabled()
  await page.getByTestId('template-block').getByRole('textbox').fill('My own latest sentence.')
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('作文已更改')
  await page.getByRole('button', { name: '放弃此结果' }).click()
  await expect(page.getByTestId('template-block').getByRole('textbox')).toHaveValue('My own latest sentence.')
})

test('请求中编辑作文，晚到结果也不能覆盖新内容', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route(endpoint, async route => { const input = context(route); await gate; await reply(route, { paragraph1: input.paragraph1, paragraph2: [] }) })
  const requested = page.waitForRequest(endpoint)
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await requested
  await page.locator('#paragraph1Starter').fill('A newer opening sentence.')
  release()
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toBeDisabled()
  await expect(page.locator('#paragraph1Starter')).toHaveValue('A newer opening sentence.')
})

test('错误响应、模型输出无效或破坏模板时不修改作文', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  const before = (await saved(page)).essays
  let mode = 'http'
  await page.route(endpoint, async route => {
    const input = context(route)
    if (mode === 'http') await route.fulfill({ status: 401, json: { error: { message: 'server echoed test-only-key' } } })
    else if (mode === 'json') await route.fulfill({ json: { choices: [{ message: { content: 'not json' } }] } })
    else if (mode === 'missing') await reply(route, { paragraph1: [], paragraph2: [] })
    else if (mode === 'rewrite') await reply(route, { paragraph1: [{ ...input.paragraph1[0], content: 'AI changed the template.' }], paragraph2: [] })
    else if (mode === 'duplicate') await reply(route, { paragraph1: [input.paragraph1[0], input.paragraph1[0]], paragraph2: [] })
    else if (mode === 'topic') await reply(route, { recommendations: [{ topicId: 'invented', reason: '不存在的主题' }] })
    else if (mode === 'network') await route.abort('failed')
    else if (mode === 'length') await route.fulfill({ json: { choices: [{ finish_reason: 'length', message: { content: '{}' } }] } })
    else await reply(route, { suggestions: [{ paragraph: 'paragraph1', original: 'Not in the essay', correction: 'Correction', reason: 'Invalid quote' }] })
  })
  for (const [next, message] of [['http', 'HTTP 401'], ['json', '未按要求返回 JSON'], ['missing', '遗漏了已选模板句'], ['rewrite', '改写了模板句'], ['duplicate', '重复了模板句'], ['topic', '不存在的主题'], ['network', '无法连接 AI 服务'], ['length', '输出被截断'], ['grammar', '不存在的内容']]) {
    mode = next
    await page.getByRole('button', { name: mode === 'topic' ? '推荐模板主题' : mode === 'grammar' ? '语法检查' : '串联作文', exact: true }).click()
    await expect(page.locator('.ai-message')).toContainText(message)
    await expect(page.getByRole('button', { name: '确认应用到作文' })).toHaveCount(0)
    await expect(page.locator('.ai-message')).not.toContainText('test-only-key')
    expect((await saved(page)).essays).toEqual(before)
  }
})

test('取消与超时不修改作文；切换视图后取消旧请求', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  const before = (await saved(page)).essays
  await page.route(endpoint, () => {})
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await page.getByRole('button', { name: '取消请求' }).click()
  await expect(page.locator('.ai-message')).toContainText('已取消请求')
  expect((await saved(page)).essays).toEqual(before)
  await page.clock.install()
  const requested = page.waitForRequest(endpoint)
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await requested
  await page.clock.fastForward(90001)
  await expect(page.locator('.ai-message')).toContainText('请求超时')
  expect((await saved(page)).essays).toEqual(before)
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await navigate(page, '设置')
  await navigate(page, '作文工作台')
  await expect(page.getByRole('button', { name: '串联作文', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '确认应用到作文' })).toHaveCount(0)
  expect((await saved(page)).essays).toEqual(before)
})

test('Key 默认不持久化、可选保存及删除，导出不含 Key', async ({ page }) => {
  await page.goto('/')
  await configure(page)
  expect(JSON.stringify(await saved(page))).not.toContain('test-only-key')
  await page.reload()
  await navigate(page, '设置')
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('test-model')
  await page.getByLabel('API Key', { exact: true }).fill('persisted-test-key')
  await page.getByLabel('在本地保存 API Key', { exact: true }).check()
  await page.getByRole('button', { name: '保存 API 设置', exact: true }).click()
  expect((await saved(page)).settings.apiKey).toBe('persisted-test-key')
  await page.reload()
  await navigate(page, '设置')
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('persisted-test-key')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloading
  const json = await readFile((await download.path())!, 'utf8')
  expect(json).not.toContain('persisted-test-key')
  expect(JSON.parse(json).settings.saveApiKey).toBe(false)
  await page.getByLabel('在本地保存 API Key', { exact: true }).uncheck()
  await page.getByRole('button', { name: '保存 API 设置', exact: true }).click()
  expect((await saved(page)).settings.apiKey).toBeUndefined()
  await page.reload()
  await navigate(page, '设置')
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('')
})

test('覆盖导入清除旧 Key，避免向备份中的新服务发送旧凭据', async ({ page }) => {
  await page.goto('/')
  await configure(page, true)
  const data = await saved(page)
  await navigate(page, '设置')
  await page.getByLabel('选择 JSON 备份文件').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...data, settings: { baseUrl: 'https://other.example.test/v1', model: 'other', apiKey: 'imported-secret', saveApiKey: true } })) })
  await page.getByRole('button', { name: '确认覆盖导入' }).click()
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('API Base URL', { exact: true })).toHaveValue('https://other.example.test/v1')
  expect((await saved(page)).settings.apiKey).toBeUndefined()
  expect(JSON.stringify(await saved(page))).not.toContain('test-only-key')
})

test('未配置或缺少作文输入时给出提示且不发请求，窄屏保留 AI 操作', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '推荐模板主题', exact: true }).click()
  await expect(page.locator('.ai-message')).toContainText('API Base URL')
  await configure(page)
  let calls = 0
  await page.route(endpoint, async route => { calls++; await reply(route, {}) })
  await page.getByRole('button', { name: '串联作文', exact: true }).click()
  await expect(page.locator('.ai-message')).toContainText('请先填写原文 / 题目和两个段首句')
  await page.getByRole('button', { name: '语法检查', exact: true }).click()
  await expect(page.locator('.ai-message')).toContainText('请先在作文中加入')
  expect(calls).toBe(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('navigation', { name: '手机工作台' }).getByRole('button', { name: 'AI', exact: true }).click()
  await expect(page.getByRole('button', { name: '推荐模板主题', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('手机端 AI 推荐进入选句，应用正文后返回写作', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileNav = page.getByRole('navigation', { name: '手机工作台' })
  await page.route(endpoint, async route => {
    const input = context(route)
    if (input.topics) await reply(route, { recommendations: [{ topicId: 'nervous', reason: '适合开头。' }] })
    else await reply(route, { paragraph1: [...input.paragraph1, { type: 'text', content: 'My friend smiled.' }], paragraph2: [] })
  })

  await mobileNav.getByRole('button', { name: 'AI', exact: true }).click()
  await page.getByRole('button', { name: '推荐模板主题' }).click()
  await page.getByRole('button', { name: '查看该主题' }).click()
  await expect(page.getByLabel('模板素材库')).toBeVisible()
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  await expect(page.getByRole('region', { name: '作文编辑' })).toBeVisible()

  await mobileNav.getByRole('button', { name: 'AI', exact: true }).click()
  await page.getByRole('button', { name: '串联作文' }).click()
  await page.getByRole('button', { name: '确认应用到作文' }).click()
  await expect(page.getByRole('region', { name: '作文编辑' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Paragraph 1', exact: true }).getByTestId('text-block').getByRole('textbox')).toHaveValue('My friend smiled.')
})
