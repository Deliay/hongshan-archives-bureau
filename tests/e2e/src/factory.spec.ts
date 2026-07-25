import { test, expect } from '@playwright/test'

test.describe('工厂系统 (Factory System)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test.describe('工厂路由与导航', () => {

    test('/archive/factory 重定向到 recipes', async ({ page }) => {
      await page.goto('/archive/factory', { waitUntil: 'domcontentloaded' })
      await page.waitForURL(/\/archive\/factory\/recipes/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/archive\/factory\/recipes/)
    })

    test('工厂配方页签默认高亮', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      const recipesTab = page.getByRole('link', { name: '工厂配方' })
      await expect(recipesTab).toBeVisible({ timeout: 10000 })
      await expect(recipesTab).toHaveClass(/text-archive-gold/)
    })

    test('切换到制作链路页签', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      await page.getByRole('link', { name: '制作链路' }).click()
      await page.waitForURL(/\/archive\/factory\/chains/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/archive\/factory\/chains/)
    })

    test('侧边栏工厂入口保持高亮', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      const factoryLink = page.getByRole('complementary').getByRole('link', { name: '工厂' })
      await expect(factoryLink).toBeVisible({ timeout: 10000 })
      await expect(factoryLink).toHaveClass(/text-archive-gold/)
    })

    test('直接访问 /archive/factory/chains 可直达', async ({ page }) => {
      await page.goto('/archive/factory/chains', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/archive\/factory\/chains/)
      const chainsTab = page.getByRole('link', { name: '制作链路' })
      await expect(chainsTab).toBeVisible({ timeout: 10000 })
      await expect(chainsTab).toHaveClass(/text-archive-gold/)
    })
  })

  test.describe('工厂配方页', () => {

    async function waitForRecipesPage(page: any) {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('工厂配方') || body.includes('加载失败')
      }, { timeout: 20000 })
    }

    test('页面加载成功', async ({ page }) => {
      await waitForRecipesPage(page)
      await expect(page.locator('h1')).toContainText('工厂')
    })

    test('左侧物品列表渲染', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForSelector('main button', { timeout: 15000 })
      const buttons = page.locator('main button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })

    test('搜索过滤物品列表', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForSelector('main button', { timeout: 15000 })
      const initialCount = await page.locator('main button').count()
      const searchInput = page.getByPlaceholder(/搜索物品/)
      await expect(searchInput).toBeVisible({ timeout: 10000 })
      await searchInput.fill('铁')
      await page.waitForTimeout(500)
      const filteredCount = await page.locator('main button').count()
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('点击物品显示配方', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForSelector('main button', { timeout: 15000 })
      const firstItem = page.locator('main button').first()
      await firstItem.click()
      await page.waitForTimeout(1000)
      const recipeContent = page.locator('main').getByText(/作为产物|作为材料/)
      await expect(recipeContent.first()).toBeVisible({ timeout: 10000 })
    })

    test('选中物品刷新后保持选中态', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForSelector('main button', { timeout: 15000 })
      const firstItem = page.locator('main button').first()
      await firstItem.click()
      await page.waitForTimeout(1000)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await expect(page).toHaveURL(/item=/)
    })
  })

  test.describe('制作链路页', () => {

    async function waitForChainsPage(page: any) {
      await page.goto('/archive/factory/chains', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('制作链路') || body.includes('加载失败')
      }, { timeout: 20000 })
    }

    test('页面加载成功', async ({ page }) => {
      await waitForChainsPage(page)
      await expect(page.locator('h1')).toContainText('工厂')
    })

    test('未选择产物时显示引导提示', async ({ page }) => {
      await waitForChainsPage(page)
      const hint = page.getByText(/搜索并添加目标产物/)
      await expect(hint).toBeVisible({ timeout: 10000 })
    })

    test('搜索并添加目标产物', async ({ page }) => {
      await waitForChainsPage(page)
      await page.waitForTimeout(1000)
      const searchInput = page.getByPlaceholder(/添加目标产物/)
      await expect(searchInput).toBeVisible({ timeout: 10000 })
      await searchInput.fill('铁')
      await page.waitForTimeout(500)
      const suggestion = page.locator('main').getByText(/铁/).first()
      await expect(suggestion).toBeVisible({ timeout: 5000 })
    })

    test('已选产物显示在清单中', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=iron_ingot', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('已选产物') || body.includes('加载失败')
      }, { timeout: 20000 })
      const selectedLabel = page.getByText('已选产物')
      await expect(selectedLabel).toBeVisible({ timeout: 10000 })
    })

    test('清空已选产物', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=iron_ingot', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('已选产物') || body.includes('加载失败')
      }, { timeout: 20000 })
      await page.waitForTimeout(1000)
      const clearBtn = page.getByText('清空')
      if (await clearBtn.isVisible()) {
        await clearBtn.click()
        await page.waitForTimeout(500)
        await expect(page).not.toHaveURL(/targets=/)
      }
    })
  })
})
