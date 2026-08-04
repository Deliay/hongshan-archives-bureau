import { test, expect } from '@playwright/test'

test.describe('音乐播放与全局控制中心 (Music Player)', () => {
  test('导航栏显示音乐控制面板且位于语言切换上方', async ({ page }) => {
    await page.goto('/archive')
    const panel = page.locator('aside [role="button"]', { hasText: '音乐播放' })
    await expect(panel).toBeVisible({ timeout: 15000 })
    const panelBox = await panel.boundingBox()
    const langBtn = page.locator('aside button', { hasText: '简中' })
    const langBox = await langBtn.boundingBox()
    expect(panelBox!.y).toBeLessThan(langBox!.y)
  })

  test('点击面板进入播放列表页', async ({ page }) => {
    await page.goto('/archive')
    await page.locator('aside [role="button"]', { hasText: '音乐播放' }).click()
    await expect(page).toHaveURL(/\/archive\/music/)
  })

  test('播放列表页展示专辑与曲目', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await expect(page.getByText('开拓专辑').first()).toBeVisible()
    await expect(page.getByText('生之泥壤').first()).toBeVisible()
  })

  test('点击曲目播放后面板显示曲目名', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await page.locator('button[aria-label="播放"]').first().click()
    await expect(page.locator('aside').getByText('生之泥壤')).toBeVisible({ timeout: 10000 })
  })

  test('404 曲目按钮置灰', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('工业专辑'), { timeout: 20000 })
    await expect(page.locator('button[aria-label="播放"][disabled]').first()).toBeVisible({ timeout: 15000 })
  })
})
