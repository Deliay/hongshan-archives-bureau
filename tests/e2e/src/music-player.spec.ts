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

  test('播放列表页展示播放队列区与播放列表区', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await expect(page.locator('main [data-testid="play-queue"]')).toBeVisible()
    await expect(page.locator('main').getByText('播放队列')).toBeVisible()
    await expect(page.locator('main').getByText('播放列表')).toBeVisible()
  })

  test('播放曲目后页面队列区与面板浮层同步显示队列', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await page.locator('button[aria-label="播放"]').first().click()
    await expect(page.locator('aside').getByText('生之泥壤')).toBeVisible({ timeout: 10000 })
    // 页面播放队列区同步显示当前曲目
    const pageQueue = page.locator('main [data-testid="play-queue"]')
    await expect(pageQueue.getByText('生之泥壤')).toBeVisible()
    // 面板队列浮层展示队列条目
    await page.locator('aside button[aria-label="播放队列"]').click()
    const overlay = page.locator('aside [data-testid="play-queue"]')
    await expect(overlay).toBeVisible()
    await expect(overlay.getByText('生之泥壤')).toBeVisible()
  })

  test('剧情语音播放时左下面板与播放队列同步', async ({ page }) => {
    await page.goto('/archive/story/library?doc=nar_col_radio_5')
    await page.waitForFunction(() => document.body.textContent?.includes('radio_gm01m23_4_001') ?? false, { timeout: 30000 })
    await page.getByTestId('line-play-radio_gm01m23_4_001').click()
    await expect(page.getByTestId('dialog-player-bar')).toBeVisible({ timeout: 5000 })
    // 左下面板同步显示语音来源标签与当前 lineKey
    await expect(page.locator('aside').getByText('剧情语音')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('aside').getByText(/radio_gm01m23_4_001/)).toBeVisible()
    // 面板队列浮层包含语音条目
    await page.locator('aside button[aria-label="播放队列"]').click()
    const overlay = page.locator('aside [data-testid="play-queue"]')
    await expect(overlay).toBeVisible()
    await expect(overlay.getByText('剧情语音').first()).toBeVisible()
  })
})
