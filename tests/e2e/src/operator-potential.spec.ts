import { test, expect } from '@playwright/test'

test.describe('干员潜能模块 (Operator Potential)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForDetailReady(page: any, operatorId: string) {
    await page.goto(`/archive/operators/${operatorId}`)
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('档案记录') || body.includes('未找到') || body.includes('加载失败')
    }, { timeout: 20000 })
  }

  test('干员详情页显示「潜能」模块标题', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await expect(page.getByText('潜能', { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test('潜能模块展示 5 级潜能卡片', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)

    for (let i = 1; i <= 5; i++) {
      const levelBadge = page.locator('span').filter({ hasText: new RegExp(`^${i}$`) }).first()
      await expect(levelBadge).toBeVisible({ timeout: 5000 })
    }
  })

  test('潜能卡片显示效果描述文字', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)

    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).not.toContain('{extra_dmg')
    expect(bodyText).not.toContain('{hp_remain')
  })

  test('有立绘的潜能等级显示图片', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)

    const potentialImages = page.locator('img[src*="imageposter/largesize/pic_"]')
    const count = await potentialImages.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('潜能描述不含未解析的 {placeholder} 占位', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)

    const bodyText = await page.locator('body').textContent() || ''
    const unresolvedPattern = /\{[a-zA-Z_][a-zA-Z0-9_.]*:?\d/
    const matches = bodyText.match(unresolvedPattern)
    expect(matches).toBeNull()
  })
})
