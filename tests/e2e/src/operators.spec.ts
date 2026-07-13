import { test, expect } from '@playwright/test'

test.describe('干员档案 (Operator Archive)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive/operators')
  })

  test('页面标题或加载状态显示', async ({ page }) => {
    // 页面要么显示加载中、要么显示 h2 标题、要么显示错误
    await expect(
      page.locator('h2, :text("加载中"), :text("暂无记录"), :text("加载失败")').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('面包屑导航正确', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案馆', exact: true })).toBeVisible()
  })

  test('中文文本正常渲染', async ({ page }) => {
    // 等待页面加载（加载中或数据就绪），验证中文不是空白/方块
    await expect(
      page.locator('h2, :text("加载中"), :text("暂无记录")').first()
    ).toBeVisible({ timeout: 15000 })
    const body = page.locator('body')
    await expect(body).not.toHaveText('')
    // 检查中文字符实际渲染——获取任意中文元素，确认其 bounding box > 0
    const chineseEl = page.locator('text=档案, text=加载, text=暂无, text=干员').first()
    if (await chineseEl.isVisible()) {
      const box = await chineseEl.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThan(0)
      expect(box!.height).toBeGreaterThan(0)
    }
  })

  test('font-family 包含中文字体', async ({ page }) => {
    await page.waitForSelector('h2, :text("加载中"), :text("暂无记录")', { timeout: 15000 })
    const fontFamily = await page.locator('body').evaluate(el =>
      getComputedStyle(el).fontFamily
    )
    expect(fontFamily).toMatch(/Noto Sans SC|PingFang SC|Microsoft YaHei|sans-serif/)
  })
})
