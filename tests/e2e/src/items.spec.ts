import { test, expect } from '@playwright/test'

test.describe('物品图鉴 (Item Archive)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForItemsReady(page: any) {
    await page.goto('/archive/items')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('物品') || body.includes('加载失败') || body.includes('暂无记录')
    }, { timeout: 20000 })
  }

  test('物品列表渲染成功', async ({ page }) => {
    await waitForItemsReady(page)
    await expect(page.getByRole('main').getByText('物品')).toBeVisible({ timeout: 5000 })
    const card = page.locator('main button').first()
    await expect(card).toBeVisible({ timeout: 15000 })
  })

  test('物品卡片为正方形', async ({ page }) => {
    await waitForItemsReady(page)
    const card = page.locator('main .aspect-square').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      const ratio = box.width / box.height
      expect(ratio).toBeGreaterThan(0.9)
      expect(ratio).toBeLessThan(1.1)
    }
  })

  test('物品列表桌面端多列', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await waitForItemsReady(page)
    const card = page.locator('main .aspect-square').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const grid = page.locator('main .grid').first()
    const cols = await grid.evaluate(el => {
      const style = getComputedStyle(el)
      return style.gridTemplateColumns.split(' ').length
    })
    expect(cols).toBeGreaterThanOrEqual(4)
  })

  test('物品列表移动端列数减少', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await waitForItemsReady(page)
    const card = page.locator('main .aspect-square').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const grid = page.locator('main .grid').first()
    const cols = await grid.evaluate(el => {
      const style = getComputedStyle(el)
      return style.gridTemplateColumns.split(' ').length
    })
    expect(cols).toBeLessThanOrEqual(4)
  })

  test('物品列表搜索', async ({ page }) => {
    await waitForItemsReady(page)
    const searchInput = page.getByPlaceholder(/搜索物品/)
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    const initialCount = await page.locator('main .aspect-square').count()
    expect(initialCount).toBeGreaterThan(0)
    const firstItem = page.locator('main .aspect-square').first()
    await expect(firstItem).toBeVisible({ timeout: 15000 })
  })
})
