import { test, expect } from '@playwright/test'

test.describe('加载提示框与骨架屏 (Loading Indicator & Skeleton)', () => {

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test('进入干员列表页，显示骨架屏后渲染卡片', async ({ page }) => {
    await page.goto('/archive/operators')

    const skeleton = page.getByTestId('skeleton').first()
    await expect(skeleton).toBeVisible({ timeout: 10000 })

    const cards = page.locator('a[href^="/archive/operators/"]')
    await expect(cards.first()).toBeVisible({ timeout: 60000 })

    await expect(page.getByTestId('skeleton')).toHaveCount(0, { timeout: 60000 })
  })

  test('右上角加载提示浮层在请求期间出现，数据加载后骨架屏消失', async ({ page }) => {
    await page.goto('/archive/operators')

    const toast = page.locator('text=正在调阅').first()
    await expect(toast).toBeVisible({ timeout: 10000 })

    const cards = page.locator('a[href^="/archive/operators/"]')
    await expect(cards.first()).toBeVisible({ timeout: 60000 })

    await expect(page.getByTestId('skeleton')).toHaveCount(0, { timeout: 60000 })
  })

  test('并发请求时显示请求数量', async ({ page }) => {
    await page.goto('/archive/operators')

    const countText = page.locator('text=/正在调阅 \\d+ 份档案/')
    await expect(countText).toBeVisible({ timeout: 15000 })
  })

  test('进入干员详情页显示详情骨架屏', async ({ page }) => {
    await page.goto('/archive/operators/chr_0005_chen')

    const skeleton = page.getByTestId('skeleton').first()
    await expect(skeleton).toBeVisible({ timeout: 10000 })

    await expect(skeleton).not.toBeVisible({ timeout: 60000 })
  })

  test('进入档案搜索页，搜索时显示搜索骨架屏', async ({ page }) => {
    await page.goto('/archive/search')

    const input = page.locator('input[type="text"]')
    await input.fill('陈千语')
    await input.press('Enter')

    const skeleton = page.getByTestId('skeleton').first()
    await expect(skeleton).toBeVisible({ timeout: 10000 })

    await expect(skeleton).not.toBeVisible({ timeout: 60000 })
  })

  test('API 失败时显示错误态与重试按钮', async ({ page }) => {
    await page.route('**/endfield-assets.fffdan.com/**', route => route.abort('connectionrefused'))

    await page.goto('/archive/operators')

    const errorToast = page.locator('text=调阅失败').first()
    await expect(errorToast).toBeVisible({ timeout: 15000 })

    const retryBtn = page.locator('button', { hasText: '重试' })
    await expect(retryBtn).toBeVisible({ timeout: 5000 })
  })

  test('进入无需 API 的页面不显示骨架屏', async ({ page }) => {
    await page.goto('/archive/professions')

    await expect(page.getByTestId('skeleton')).toHaveCount(0, { timeout: 5000 })
  })

  test('切换页面后加载提示重新出现', async ({ page }) => {
    await page.goto('/archive/operators')
    await page.locator('a[href^="/archive/operators/"]').first().waitFor({ timeout: 60000 })

    await page.goto('/archive/weapons')

    const toast = page.locator('text=正在调阅').first()
    await expect(toast).toBeVisible({ timeout: 10000 })
  })
})
