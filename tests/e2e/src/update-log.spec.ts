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
})
