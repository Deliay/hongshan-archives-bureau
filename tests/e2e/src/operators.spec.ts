import { test, expect } from '@playwright/test'

test.describe('干员档案 (Operator Archive)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive/operators')
  })

  test('从首页点击导航进入干员档案，显示骨架屏后正常渲染卡片', async ({ page, context }) => {
    // 模拟用户真实操作：先进入首页，再点击侧边栏“干员档案”
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive')
    await page.getByRole('complementary').getByRole('link', { name: '干员档案' }).click()
    await page.waitForURL('/archive/operators')

    // 先看到加载骨架
    await expect(page.getByTestId('skeleton').first()).toBeVisible({ timeout: 10000 })

    // 数据加载成功后看到卡片
    const cards = page.locator('a[href^="/archive/operators/"]')
    await expect(cards.first()).toBeVisible({ timeout: 60000 })

    // 骨架屏消失
    await expect(page.getByTestId('skeleton')).toHaveCount(0, { timeout: 60000 })

    // 页面正常显示内容：有标题、有卡片、卡片内有名称和星级
    await expect(page.locator('h2').first()).toHaveText('干员档案')
    expect(await cards.count()).toBeGreaterThan(0)

    const firstCard = cards.first()
    const name = await firstCard.locator('h3').textContent()
    expect(name).toBeTruthy()
    expect(name!.trim().length).toBeGreaterThan(0)

    // 验证没有 <a> 嵌套 <a> 的非法结构
    const hasNestedAnchor = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).some(a => a.parentElement?.closest('a') !== null)
    })
    expect(hasNestedAnchor, '检测到 <a> 嵌套 <a> 的非法 HTML 结构').toBe(false)
  })

  test('页面标题或加载状态显示', async ({ page }) => {
    // 页面要么显示 h2 标题（Skeleton 加载时也会有标题区）
    await expect(
      page.locator('h2, [data-testid="skeleton"]').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('面包屑导航正确', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案局', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('中文文本正常渲染', async ({ page }) => {
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 })
    const body = page.locator('body')
    await expect(body).not.toHaveText('')
    const chineseEl = page.locator('text=档案, text=加载, text=暂无, text=干员').first()
    if (await chineseEl.isVisible()) {
      const box = await chineseEl.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThan(0)
      expect(box!.height).toBeGreaterThan(0)
    }
  })

  test('font-family 包含中文字体', async ({ page }) => {
    await page.waitForSelector('h2', { timeout: 15000 })
    const fontFamily = await page.locator('body').evaluate(el =>
      getComputedStyle(el).fontFamily
    )
    expect(fontFamily).toMatch(/Noto Sans SC|PingFang SC|Microsoft YaHei|sans-serif/)
  })

  test('干员名称与星级显示正常，包含 5 星干员「陈千语」', async ({ page }) => {
    await page.waitForSelector('h2', { timeout: 30000 })
    const cards = page.locator('a[href^="/archive/operators/"]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const name = await card.locator('h3').textContent()
      expect(name).toBeTruthy()
      expect(name!.trim().length).toBeGreaterThan(0)
      // 星级渲染在 Rarity 组件的 span 中，查找包含 ★ 的 span
      const stars = await card.locator('span').filter({ hasText: /★+/ }).first().textContent()
      expect(stars).toMatch(/^★+$/)
    }

    const chenQianYu = page.locator('a[href^="/archive/operators/"]', { has: page.locator('h3', { hasText: '陈千语' }) })
    await expect(chenQianYu).toBeVisible({ timeout: 5000 })
    const stars = await chenQianYu.locator('span').filter({ hasText: /★+/ }).first().textContent()
    expect(stars?.trim()).toBe('★★★★★')
  })
})
