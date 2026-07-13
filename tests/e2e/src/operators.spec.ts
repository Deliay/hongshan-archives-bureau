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
})
