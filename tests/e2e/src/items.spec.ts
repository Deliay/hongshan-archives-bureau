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

  test('物品列表显示正方形卡片', async ({ page }) => {
    await waitForItemsReady(page)

    const panel = page.locator('main .aspect-square').first()
    await expect(panel).toBeVisible({ timeout: 15000 })

    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      const ratio = box.width / box.height
      expect(ratio).toBeGreaterThan(0.9)
      expect(ratio).toBeLessThan(1.1)
    }
  })
})
