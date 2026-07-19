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
    await input.fill('test')
    await input.press('Enter')
    await page.waitForTimeout(2000)
    const resultText = page.locator('text=找到').first()
    await expect(resultText).toBeVisible({ timeout: 15000 })
  })

  test('点击搜索按钮触发搜索', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('test')
    await page.getByRole('button', { name: '搜索' }).click()
    await page.waitForTimeout(2000)
    const resultText = page.locator('text=找到').first()
    await expect(resultText).toBeVisible({ timeout: 15000 })
  })

  test('空输入时未触发搜索', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.press('Enter')
    await page.waitForTimeout(1000)
    await expect(page.getByText('找到')).not.toBeVisible()
  })

  test('搜索结果分页控件可用', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    await input.press('Enter')
    await page.waitForTimeout(3000)

    const nextBtn = page.getByText('下一页')
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      const page2Btn = page.locator('text=2').first()
      await expect(page2Btn).toBeVisible({ timeout: 5000 })
    }
  })

  test('搜索结果展示来源表', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    await input.press('Enter')
    await page.waitForTimeout(3000)
    await expect(page.locator('text=找到').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('CharacterTable').or(page.getByText('WeaponBasicTable')) .first()).toBeVisible({ timeout: 10000 })
  })
})
