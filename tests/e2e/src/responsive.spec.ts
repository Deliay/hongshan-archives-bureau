import { test, expect } from '@playwright/test'

test.describe('响应式与移动端 (Responsive & Mobile)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test('移动端视口 375px 页面正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/archive')
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
    // 375px 下使用 grid-cols-1
    const grid = page.locator('.grid').first()
    const cols = await grid.evaluate(el => {
      const style = getComputedStyle(el)
      return style.gridTemplateColumns.split(' ').length
    })
    expect(cols).toBe(1)
  })

  test('平板视口 768px 页面正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/archive')
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
    // 768px 下使用 md:grid-cols-2
    const grid = page.locator('.grid').first()
    const cols = await grid.evaluate(el => {
      const style = getComputedStyle(el)
      return style.gridTemplateColumns.split(' ').length
    })
    expect(cols).toBe(2)
  })

  test('桌面视口 1440px 模块网格为 3 列', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/archive')
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
    const grid = page.locator('.grid').first()
    const cols = await grid.evaluate(el => {
      const style = getComputedStyle(el)
      return style.gridTemplateColumns.split(' ').length
    })
    expect(cols).toBe(3)
  })
})
