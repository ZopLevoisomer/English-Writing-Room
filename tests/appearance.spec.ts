import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({ reducedMotion: 'reduce' })

test('外观切换、刷新记忆、备份及 API 设置互不覆盖', async ({ page }) => {
  await page.goto('/')
  await page.locator('#title').fill('Keep my story')
  await page.getByRole('button', { name: '切换到夜间模式' }).click()
  await page.getByLabel('主题色', { exact: true }).selectOption('ink')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await expect(page.getByLabel('主题色', { exact: true })).toHaveValue('ink')
  await expect(page.locator('#title')).toHaveValue('Keep my story')
  await page.getByRole('navigation').getByRole('button', { name: '设置', exact: true }).click()
  await page.getByLabel('Model', { exact: true }).fill('test-model')
  await page.getByRole('button', { name: '保存 API 设置', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('english-continuation:v1')!).settings)
  expect(settings.colorMode).toBe('dark')
  expect(settings.themeColor).toBe('ink')
  expect(settings.model).toBe('test-model')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const backup = await readFile((await (await downloaded).path())!, 'utf8')
  expect(JSON.parse(backup).settings.themeColor).toBe('ink')
  await page.getByRole('button', { name: '切换到日间模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
  await page.getByLabel('选择 JSON 备份文件').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
  await page.getByRole('button', { name: '确认覆盖导入' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
})

test('四种主题在日夜模式、全文阅读与窄屏下正常显示', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '＋ 加入作文' }).first().click()
  for (const mode of ['light', 'dark']) {
    if (mode === 'dark') await page.getByRole('button', { name: '切换到夜间模式' }).click()
    const colors = new Set<string>()
    for (const theme of ['forest', 'ink', 'rose', 'sepia']) {
      await page.getByLabel('主题色', { exact: true }).selectOption(theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      colors.add(await page.locator('.primary-button').last().evaluate(e => getComputedStyle(e).backgroundColor))
      await page.getByRole('button', { name: 'Submit · 生成全文' }).click()
      await expect(page.getByRole('article', { name: '作文正文' }).locator('mark')).toHaveCount(1)
      await page.keyboard.press('Escape')
    }
    expect(colors.size).toBe(4)
  }
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/night-theme.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const view of ['作文工作台', '素材库管理', '设置']) {
    await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
