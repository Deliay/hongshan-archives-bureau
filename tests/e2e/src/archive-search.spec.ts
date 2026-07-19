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

  test('URL keyword query 自动搜索', async ({ page }) => {
    await page.goto('/archive/search?keyword=the', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('找到')).toBeVisible({ timeout: 20000 })
  })

  test('输入关键词后 URL 更新为 keyword query', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('the')
    await input.press('Enter')
    await page.waitForURL('/archive/search?keyword=the')
    expect(page.url()).toContain('keyword=the')
  })

  test('搜索燃烧伤害描述显示敌人卡片 (EnemyAbilityDescTable)', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('基于最大生命值百分比')
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/i18n/search/all/') && resp.ok(),
    )
    await input.press('Enter')
    await responsePromise

    await expect(page.getByText('EnemyAbilityDescTable').first()).toBeVisible({ timeout: 20000 })
    // 验证敌人卡片出现（检查怪物图标或敌人名称）
    const enemyIcon = page.locator('img[src*="monstericonbig"]').first()
    await expect(enemyIcon).toBeVisible({ timeout: 10000 })
  })

  test('搜索终结技期间燃烧时长显示正确技能等级 (SkillPatchTable)', async ({ page }) => {
    await page.goto('/archive/search', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    const input = page.getByPlaceholder('搜索档案关键词…')
    await input.fill('终结技期间燃烧时长（秒）')
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/i18n/search/all/') && resp.ok(),
    )
    await input.press('Enter')
    await responsePromise

    await expect(page.getByText('SkillPatchTable').first()).toBeVisible({ timeout: 20000 })
    // 验证技能卡片显示了正确的技能组名称（而非原始 skillId）
    await expect(page.getByText('焚灭').first()).toBeVisible({ timeout: 10000 })
    // 验证技能卡片显示了正确的 patch 等级（而非默认 13）
    await expect(page.getByText('等级 1').first()).toBeVisible({ timeout: 10000 })
    // 由于 extractPatchIndex 将 path 中的数组索引提取为 defaultPatchIndex，
    // 首批结果 PatchDataBundle[0] 应显示等级 1 而非默认等级 13
  })
})
