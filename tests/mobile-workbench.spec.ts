import { test, expect } from '@playwright/test'

test('手机端在写作、选句和 AI 间切换，选句后回到对应段落；桌面仍显示三栏', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const mobileNav = page.getByRole('navigation', { name: '手机工作台' })
  const editor = page.getByRole('region', { name: '作文编辑' })
  const library = page.getByLabel('模板素材库')
  const ai = page.getByLabel('AI 辅助')
  await expect(editor).toBeVisible()
  await expect(library).toBeHidden()
  await expect(ai).toBeHidden()

  await editor.getByLabel('作文标题').fill('Mobile draft')
  await mobileNav.getByRole('button', { name: '选句' }).click()
  await expect(library).toBeVisible()
  await expect(editor).toBeHidden()
  await library.getByLabel('03 / 添加到哪一段').selectOption('paragraph2')
  await library.getByRole('button', { name: '＋ 加入作文' }).first().click()
  await expect(editor).toBeVisible()
  await expect(library).toBeHidden()
  const addedBlock = editor.getByLabel('Paragraph 2').getByTestId('template-block')
  await expect(addedBlock).toHaveCount(1)
  await expect(addedBlock).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await mobileNav.getByRole('button', { name: 'AI', exact: true }).click()
  await expect(ai).toBeVisible()
  await expect(editor).toBeHidden()
  await mobileNav.getByRole('button', { name: '写作' }).click()
  await expect(editor.getByLabel('作文标题')).toHaveValue('Mobile draft')

  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(mobileNav).toBeHidden()
  await expect(library).toBeVisible()
  await expect(editor).toBeVisible()
  await expect(ai).toBeVisible()

  await page.setViewportSize({ width: 320, height: 700 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
