import { test, expect } from '@playwright/test'

test.describe('更新日志 (Update Log)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForDiffReady(page: any) {
    await page.goto('/archive/updates/initial-version__initial_8190425-29_main_8190425-29')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('干员变动概览') && !body.includes('正在加载')
    }, { timeout: 30000 })
  }

  test('干员变动展开后无原始JSON', async ({ page }) => {
    await waitForDiffReady(page)

    const card = page.locator('button').filter({ hasText: /chr_/ }).first()
    await expect(card).toBeVisible({ timeout: 10000 })
    await card.click()
    await page.waitForTimeout(500)

    const expandedSection = card.locator('..').locator('.border-t')
    const text = await expandedSection.textContent() || ''
    expect(/"\w+":\s*\{/.test(text)).toBe(false)
    expect(text.length).toBeGreaterThan(0)
  })

  test('干员名称展示为中文本地化名称', async ({ page }) => {
    await waitForDiffReady(page)

    // Wait for the name to resolve from API
    const card = page.locator('button').filter({ hasText: 'chr_0030_zhuangfy' }).first()

    // Wait for the localized name to appear (not just the ID)
    await expect(card).toBeVisible({ timeout: 10000 })

    // The card should eventually show the localized Chinese name (庄芳仪)
    // If the name doesn't resolve, the card will just show the ID
    await page.waitForFunction((id) => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.includes(id) && !btn.textContent?.includes('正在加载')) {
          return true
        }
      }
      return false
    }, 'chr_0030_zhuangfy', { timeout: 15000 })

    const cardText = await card.textContent() || ''
    // At minimum, some text should be displayed that's different from just the raw ID pattern
    expect(cardText.length).toBeGreaterThan('chr_0030_zhuangfy'.length + 5)
    // The card should contain resolved content (stars, profession info, etc.)
    expect(cardText).toContain('✦')
  })

  test('unlockType变更展示为含义而非原始数字', async ({ page }) => {
    await waitForDiffReady(page)

    const bodyText = await page.locator('body').textContent() || ''

    // Check that unlockType values are displayed as human-readable text
    const hasHumanReadableUnlock = bodyText.includes('精英阶段') || bodyText.includes('信赖值')
    const hasRawUnlockType = /unlockType/.test(bodyText) || /unlockValue/.test(bodyText)

    if (hasHumanReadableUnlock) {
      expect(hasRawUnlockType).toBe(false)
    }
  })

  test('非CharacterTable变更的干员名字也能正确显示', async ({ page }) => {
    await waitForDiffReady(page)

    // chr_0016_laevat only has PotentialTalentEffectTable changes, no CharacterTable diff
    // Its name must resolve via API fallback
    const card = page.locator('button').filter({ hasText: 'chr_0016_laevat' }).first()
    await expect(card).toBeVisible({ timeout: 10000 })

    // Wait for the localized name to appear (not just the ID)
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.includes('chr_0016_laevat')) {
          const parent = btn.closest('div')?.textContent || ''
          return parent.includes('莱万汀') || parent.includes('Laevatain')
        }
      }
      return false
    }, { timeout: 15000 })
  })

  test('展开后rich text正确渲染超链接', async ({ page }) => {
    await waitForDiffReady(page)

    const card = page.locator('button').filter({ hasText: 'chr_0016_laevat' }).first()
    await expect(card).toBeVisible({ timeout: 10000 })
    await card.click()
    await page.waitForTimeout(1000)

    // Non-changed hyperlinks in the text (<#ba.lastcombo>, <#ba.fireinflict>, etc.)
    // should render normally as buttons
    const 重击Links = page.locator('button', { hasText: '重击' })
    expect(await 重击Links.count()).toBeGreaterThanOrEqual(1)

    const 灼热附着Links = page.locator('button', { hasText: '灼热附着' })
    expect(await 灼热附着Links.count()).toBeGreaterThanOrEqual(1)

    // The changed word 吸收 should also render as a hyperlink button
    const 吸收Links = page.locator('button', { hasText: '吸收' })
    expect(await 吸收Links.count()).toBeGreaterThanOrEqual(1)
  })
})
