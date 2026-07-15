import { test, expect } from '@playwright/test'

test.describe('更新日志 (Update Log)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test('干员变动概览展开后显示属性字段而非截断JSON', async ({ page }) => {
    // Navigate to the initial version diff
    await page.goto('/archive/updates/initial-version__initial_8190425-29_main_8190425-29')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('干员变动概览') || body.includes('正在加载') || body.includes('暂无')
    }, { timeout: 20000 })

    // Wait for operator data to load
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('干员变动概览') && !body.includes('正在加载')
    }, { timeout: 30000 })

    // Find and click the operator card for 卡缪 (Camille, chr_0033_camille)
    const card = page.locator('button').filter({ hasText: 'chr_0033_camille' }).first()
    await expect(card).toBeVisible({ timeout: 10000 })

    // Click to expand
    await card.click()
    await page.waitForTimeout(500)

    // Check that the expanded content shows field diffs, not truncated JSON
    const expandedSection = card.locator('..').locator('.border-t')
    const expandedText = await expandedSection.textContent() || ''

    // Should NOT contain raw JSON-like patterns (object key-value with quotes)
    const jsonPattern = /"[a-zA-Z_]+":\s*\{/
    const hasRawJson = jsonPattern.test(expandedText)
    expect(hasRawJson).toBe(false)

    // Should contain field-level key names like skill IDs or property paths
    // For changed entries: should show "旧" and "新" labels
    const hasOldNewLabels = expandedText.includes('旧') || expandedText.includes('新增') || expandedText.includes('移除')
    expect(hasOldNewLabels).toBe(true)

    // For changed entries with field diffs, should show property paths
    const hasFieldPaths = /chr_0033/.test(expandedText)
    expect(hasFieldPaths).toBe(true)
  })
})
