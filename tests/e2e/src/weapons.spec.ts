import { test, expect } from '@playwright/test'

test.describe('武器文章 (Weapon Archive)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForWeaponsReady(page: any) {
    await page.goto('/archive/weapons')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('武器档案') || body.includes('加载失败')
    }, { timeout: 20000 })
  }

  async function waitForWeaponDetailReady(page: any, weaponId: string) {
    await page.goto(`/archive/weapons/${weaponId}`)
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('返回武器列表') || body.includes('未找到武器') || body.includes('加载失败')
    }, { timeout: 30000 })
  }

  test('武器列表显示所有武器', async ({ page }) => {
    await waitForWeaponsReady(page)

    const title = page.getByRole('main').getByText('武器档案')
    await expect(title).toBeVisible({ timeout: 5000 })

    // Wait for weapon cards to load
    const card = page.locator('main a[href*="/archive/weapons/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const cards = page.locator('main a[href*="/archive/weapons/"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('武器列表按稀有度倒序排序', async ({ page }) => {
    await waitForWeaponsReady(page)

    // Wait for cards to load
    const card = page.locator('main a[href*="/archive/weapons/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })

    const rarities = await page.locator('main a[href*="/archive/weapons/"]').evaluateAll((els) => {
      return els.map((el) => {
        const bar = el.querySelector('.rounded-full')
        if (!bar) return 0
        const bg = (bar as HTMLElement).style.backgroundColor
        if (bg.includes('254, 90, 0') || bg.includes('fe5a00')) return 6
        if (bg.includes('255, 187, 3') || bg.includes('FFBB03')) return 5
        if (bg.includes('148, 82, 250') || bg.includes('9452FA')) return 4
        if (bg.includes('38, 187, 253') || bg.includes('26BBFD')) return 3
        return 0
      })
    })

    expect(rarities.length).toBeGreaterThan(0)
    const known = rarities.filter(r => r > 0)
    for (let i = 1; i < known.length; i++) {
      expect(known[i]).toBeLessThanOrEqual(known[i - 1])
    }
  })

  test('武器列表展示技能名称「赫拉芬格」', async ({ page }) => {
    await waitForWeaponsReady(page)

    const searchInput = page.getByPlaceholder('搜索武器名称或 ID…')
    await searchInput.fill('赫拉芬格')
    await page.waitForTimeout(2000)

    const bodyText = await page.locator('main').textContent() || ''
    // After search, at least one card should show skill tags
    const hasSkillTags = /力量提升|攻击提升|迸发/.test(bodyText)
    expect(hasSkillTags).toBe(true)
  })

  test('武器详情显示技能信息「赫拉芬格」', async ({ page }) => {
    await waitForWeaponDetailReady(page, 'wpn_claym_0013')

    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
    // 技能面板数据异步加载，等待关键文本出现
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('力量提升') || body.includes('攻击提升') || body.includes('迸发')
    }, { timeout: 60000 })

    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('力量提升')
    expect(bodyText).toContain('攻击提升')
    expect(bodyText).toContain('迸发')
  })

  test('武器详情富文本格式化「作品：蚀迹」', async ({ page }) => {
    await waitForWeaponDetailReady(page, 'wpn_funnel_0006')

    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
    // 等待技能面板异步加载完成
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('%') || body.includes('未找到武器') || body.includes('加载失败')
    }, { timeout: 60000 })
    const bodyText = await page.locator('body').textContent() || ''
    // The formatted description should NOT contain raw {key} patterns
    expect(bodyText).not.toContain('{atk_up')
    expect(bodyText).not.toContain('{spell_dmg_up2')
    // Should contain percentage signs from formatting
    expect(bodyText).toContain('%')
  })

  test('武器列表搜索功能', async ({ page }) => {
    await waitForWeaponsReady(page)

    const searchInput = page.getByPlaceholder('搜索武器名称或 ID…')
    await searchInput.fill('wpn_sword_0003')
    await page.waitForTimeout(2000)

    const cards = page.locator('main a[href*="/archive/weapons/"]')
    const count = await cards.count()
    expect(count).toBe(1)
  })

  test('武器类型筛选', async ({ page }) => {
    await waitForWeaponsReady(page)

    // Wait for cards to load first
    const card = page.locator('main a[href*="/archive/weapons/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })

    // Find the type filter select by looking for option containing "全部类型"
    const typeSelect = page.locator('select', { has: page.locator('option', { hasText: '全部类型' }) })
    await expect(typeSelect).toBeVisible({ timeout: 5000 })

    const options = await typeSelect.locator('option').all()
    expect(options.length).toBeGreaterThan(1)

    const firstType = await options[1].getAttribute('value')
    if (firstType) {
      await typeSelect.selectOption(firstType)
      await page.waitForTimeout(1000)

      const cards = page.locator('main a[href*="/archive/weapons/"]')
      const cardCount = await cards.count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })
})
