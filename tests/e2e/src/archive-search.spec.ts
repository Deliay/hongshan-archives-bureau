import { test, expect } from '@playwright/test'

test.describe('档案搜索 (Archive Search)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  })

  test('侧边导航可进入档案搜索页', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: '档案搜索' }).click()
    await page.waitForURL('/archive/search')
    await expect(page.locator('h2').first()).toHaveText('档案搜索', { timeout: 15000 })
  })

  test('首页大事记下出现档案搜索入口', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案搜索' }).first()).toBeVisible({ timeout: 10000 })
  })

  test('输入关键词后回车触发搜索', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    await input.press('Enter')
    await expect(page.getByText('找到')).toBeVisible({ timeout: 20000 })
  })

  test('空输入时显示提示文案', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    await expect(page.getByText(/输入关键词/)).toBeVisible({ timeout: 5000 })
  })

  test('搜索结果分页控件可用', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/i18n/search/all/') && resp.ok(),
    )
    await input.press('Enter')
    await responsePromise
    await expect(page.getByText('找到')).toBeVisible({ timeout: 20000 })

    // If 2+ pages exist, verify clicking next changes page
    const nextBtn = page.getByRole('button', { name: '下一页' })
    if (await nextBtn.isVisible().catch(() => false) && !await nextBtn.isDisabled().catch(() => true)) {
      const page1Btn = page.locator('text=1').first()
      await nextBtn.click()
      // After clicking next, page 1 should no longer be the active page
      await expect(page1Btn).not.toHaveClass(/bg-archive-gold/, { timeout: 5000 })
    }
  })

  test('搜索结果展示来源表', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    await input.press('Enter')
    await expect(page.getByText('找到')).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByText('CharacterTable').or(page.getByText('WeaponBasicTable')).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
