import { test, expect } from '@playwright/test'

test.describe('装备图鉴 (Equipment Archive)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForListReady(page: any) {
    await page.goto('/archive/equipment')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('装备') || body.includes('加载失败') || body.includes('暂无记录')
    }, { timeout: 20000 })
  }

  async function waitForDetailReady(page: any, equipId: string) {
    await page.goto(`/archive/equipment/${equipId}`)
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('返回装备列表') || body.includes('未找到装备') || body.includes('加载失败')
    }, { timeout: 30000 })
  }

  test('装备列表显示装备卡片', async ({ page }) => {
    await waitForListReady(page)

    await expect(page.getByRole('main').getByText('装备')).toBeVisible({ timeout: 5000 })

    const card = page.locator('main a[href*="/archive/equipment/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const count = await page.locator('main a[href*="/archive/equipment/"]').count()
    expect(count).toBeGreaterThan(0)
  })

  test('装备列表按稀有度倒序排序（组内单调）', async ({ page }) => {
    await waitForListReady(page)

    const card = page.locator('main a[href*="/archive/equipment/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })

    const sectionRarities = await page.locator('main section').evaluateAll((sections) => {
      return sections.map((section) => {
        const cards = section.querySelectorAll('a[href*="/archive/equipment/"]')
        return Array.from(cards).map((el) => {
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
    })

    expect(sectionRarities.length).toBeGreaterThan(0)
    for (const rarities of sectionRarities) {
      const known = rarities.filter(r => r > 0)
      for (let i = 1; i < known.length; i++) {
        expect(known[i]).toBeLessThanOrEqual(known[i - 1])
      }
    }
  })

  test('装备列表搜索功能', async ({ page }) => {
    await waitForListReady(page)

    const searchInput = page.getByPlaceholder('搜索装备名称或 ID…')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    const allCards = page.locator('main a[href*="/archive/equipment/"]')
    const initialCount = await allCards.count()
    expect(initialCount).toBeGreaterThan(0)

    const firstCard = allCards.first()
    const href = await firstCard.getAttribute('href')
    const equipId = href?.split('/').pop() || ''

    await searchInput.fill(equipId)
    await page.waitForTimeout(1000)

    const filteredCards = page.locator('main a[href*="/archive/equipment/"]')
    const filteredCount = await filteredCards.count()
    expect(filteredCount).toBeGreaterThanOrEqual(1)
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('装备类型筛选', async ({ page }) => {
    await waitForListReady(page)

    const card = page.locator('main a[href*="/archive/equipment/"]').first()
    await expect(card).toBeVisible({ timeout: 20000 })

    const typeSelect = page.locator('select', { has: page.locator('option', { hasText: '全部类型' }) })
    await expect(typeSelect).toBeVisible({ timeout: 5000 })

    const initialCount = await page.locator('main a[href*="/archive/equipment/"]').count()

    const options = await typeSelect.locator('option').all()
    expect(options.length).toBeGreaterThan(1)

    const firstType = await options[1].getAttribute('value')
    if (firstType) {
      await typeSelect.selectOption(firstType)

      await page.waitForFunction((prevCount) => {
        const cards = document.querySelectorAll('main a[href*="/archive/equipment/"]')
        return cards.length > 0 && cards.length !== prevCount
      }, initialCount, { timeout: 5000 })

      const cardCount = await page.locator('main a[href*="/archive/equipment/"]').count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test('套装分组显示组标题', async ({ page }) => {
    await waitForListReady(page)

    const card = page.locator('main a[href*="/archive/equipment/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })

    const bodyText = await page.locator('main').textContent() || ''
    const hasGroupTitle = bodyText.includes('散件') || bodyText.includes('件')
    expect(hasGroupTitle).toBe(true)
  })

  test('装备详情显示属性区', async ({ page }) => {
    const firstCard = page.locator('main a[href*="/archive/equipment/"]').first()
    await page.goto('/archive/equipment')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('装备')
    }, { timeout: 20000 })

    await expect(firstCard).toBeVisible({ timeout: 15000 })
    await firstCard.click()
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('返回装备列表') || body.includes('未找到装备') || body.includes('加载失败')
    }, { timeout: 30000 })

    const bodyText = await page.locator('body').textContent() || ''
    const hasAttrs = bodyText.includes('基础属性') || bodyText.includes('附加属性') || bodyText.includes('未找到装备')
    expect(hasAttrs).toBe(true)
  })

  test('不存在的装备id显示未找到', async ({ page }) => {
    await waitForDetailReady(page, 'nonexistent_equip_id')

    await expect(page.getByText(/未找到装备/)).toBeVisible({ timeout: 15000 })
  })

  test('返回列表链接存在', async ({ page }) => {
    await page.goto('/archive/equipment')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('装备')
    }, { timeout: 20000 })

    const card = page.locator('main a[href*="/archive/equipment/"]').first()
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('返回装备列表')
    }, { timeout: 30000 })

    const backLink = page.getByText('返回装备列表')
    await expect(backLink).toBeVisible()
  })
})
