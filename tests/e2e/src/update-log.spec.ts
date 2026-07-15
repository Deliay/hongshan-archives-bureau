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

  test('新增干员展开后技能有图标、名称、描述', async ({ page }) => {
    await waitForDiffReady(page)

    // Find an added operator card (has "新增" badge)
    const addedCard = page.locator('button').filter({ hasText: '新增' }).first()
    await expect(addedCard).toBeVisible({ timeout: 10000 })
    await addedCard.click()
    await page.waitForTimeout(3000)

    // The expanded section should have skill section
    const expanded = addedCard.locator('..').locator('.border-t')
    await expect(expanded).toBeVisible({ timeout: 5000 })

    const text = await expanded.textContent() || ''

    // Should have skill section
    expect(text).toContain('技能')

    // Should have skill descriptions (not just names) — containing rich text markers or descriptions
    // At minimum should have percentage signs from blackboard formatting
    // or skill description keywords like "攻击" "伤害" "恢复"
    const hasSkillDetail = text.includes('%') || /攻击|伤害|恢复|提升|造成/.test(text)
    expect(hasSkillDetail).toBe(true)

    // Should have skill icons (img elements inside the skill section)
    const skillImages = expanded.locator('img')
    const imgCount = await skillImages.count()
    expect(imgCount).toBeGreaterThan(0)

    // Should have factory/spaceship skill section with data
    const hasFactorySkills = text.includes('基建技能')
    if (hasFactorySkills) {
      const hasFactoryDesc = /房间|生产|制造|效率|加速/.test(text)
      expect(hasFactoryDesc).toBe(true)
    }
  })
})
