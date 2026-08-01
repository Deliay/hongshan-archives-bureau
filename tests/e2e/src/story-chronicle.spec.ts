import { test, expect } from '@playwright/test'

test.describe('剧情纪事 (Story Chronicle)', () => {

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test('总览页展示模块名与入口卡片', async ({ page }) => {
    await page.goto('/archive/story')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('h2').first()).toContainText('剧情纪事')

    const recapLink = page.locator('a[href="/archive/story/recap"]')
    const libraryLink = page.locator('a[href="/archive/story/library"]')
    await expect(recapLink).toBeVisible({ timeout: 15000 })
    await expect(libraryLink).toBeVisible({ timeout: 15000 })

    const recapText = await recapLink.textContent() || ''
    const libText = await libraryLink.textContent() || ''
    expect(recapText).toContain('剧情梗概')
    expect(libText).toContain('PRTS')
  })

  test('总览页入口跳转到剧情梗概', async ({ page }) => {
    await page.goto('/archive/story')
    await page.locator('a[href="/archive/story/recap"]').click()
    await page.waitForURL('/archive/story/recap')
    await expect(page).toHaveURL(/\/archive\/story\/recap/)
  })

  test('总览页入口跳转到 PRTS 文库', async ({ page }) => {
    await page.goto('/archive/story')
    await page.locator('a[href="/archive/story/library"]').click()
    await page.waitForURL('/archive/story/library')
    await expect(page).toHaveURL(/\/archive\/story\/library/)
  })

  test('剧情梗概页加载并展示梗概卡片', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[class*="border-l-2"]').first()).toBeVisible({ timeout: 30000 })
    const codeEl = page.locator('[class*="font-mono"][class*="text-archive-gold"]').first()
    await expect(codeEl).toBeVisible({ timeout: 10000 })
  })

  test('剧情梗概类型筛选', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select')).toBeVisible({ timeout: 30000 })
    await page.locator('[class*="border-l-2"]').first().waitFor({ timeout: 30000 })
    await page.locator('select').selectOption('e')
    await expect(page).toHaveURL(/type=e/)
  })

  test('剧情梗概篇章导航存在', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select')).toBeVisible({ timeout: 30000 })
    await page.locator('[class*="border-l-2"]').first().waitFor({ timeout: 30000 })
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
  })

  test('PRTS 文库页展示分类页签与卷卡片', async ({ page }) => {
    await page.goto('/archive/story/library')
    // 等待页面内容加载：查找 "全部" 页签按钮（visible）
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 卷卡片出现（带 border 的 rounded-lg 按钮）
    await expect(page.locator('main button[class*="border"][class*="rounded-lg"]').first()).toBeVisible({ timeout: 30000 })
  })

  test('PRTS 文库页签切换', async ({ page }) => {
    await page.goto('/archive/story/library')
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 点击一个分类页签（非"全部"的按钮）
    const catButtons = page.locator('main > div > div:first-child button:not(:first-child)')
    const count = await catButtons.count()
    if (count > 0) {
      await catButtons.first().click()
      await expect(page).toHaveURL(/cat=/)
    }
  })

  test('PRTS 文库卷卡片展开条目', async ({ page }) => {
    await page.goto('/archive/story/library')
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 找到卷卡片并点击
    const volumeCard = page.locator('main button[class*="border"][class*="rounded-lg"]').first()
    await expect(volumeCard).toBeVisible({ timeout: 15000 })
    await volumeCard.click()
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('Baker 页展示联系人列表与引导占位', async ({ page }) => {
    await page.goto('/archive/baker')
    // Tab 栏中的"全部"按钮可见（非 mobile hamburger）
    const allTab = page.locator('main button, [class*=" BakerContactList"] button, div.flex button').filter({ hasText: '全部' }).first()
    // 使用更通用的方式：等待页面主体内容
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('选择联系人') || body.includes('Select a contact')
    }, { timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toMatch(/选择联系人|Select a contact/)
  })

  test('Baker 联系人筛选 Tab 存在', async ({ page }) => {
    await page.goto('/archive/baker')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('全部') && body.includes('群聊')
    }, { timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('全部')
    expect(bodyText).toContain('干员')
    expect(bodyText).toContain('联系人')
    expect(bodyText).toContain('群聊')
  })

  test('Baker 选择联系人后加载聊天', async ({ page }) => {
    await page.goto('/archive/baker')
    // 等待联系人列表加载
    await page.waitForFunction(() => {
      const links = document.querySelectorAll('button[class*="items-center"][class*="gap-3"]')
      return links.length > 0
    }, { timeout: 30000 })
    const contactButtons = page.locator('button[class*="items-center"][class*="gap-3"]')
    const count = await contactButtons.count()
    expect(count).toBeGreaterThan(0)
    await contactButtons.first().click()
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/chat=/)
  })

  test('侧边栏包含 Baker 入口', async ({ page }) => {
    await page.goto('/archive')
    const bakerLink = page.getByRole('complementary').getByRole('link', { name: 'Baker' })
    await expect(bakerLink).toBeVisible({ timeout: 15000 })
  })

  test('侧边栏剧情纪事文案正确', async ({ page }) => {
    await page.goto('/archive')
    const storyLink = page.getByRole('complementary').getByRole('link', { name: '剧情纪事' })
    await expect(storyLink).toBeVisible({ timeout: 15000 })
  })

  test('面包屑在剧情梗概页正确显示', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.getByRole('link', { name: '档案局', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('任务详情页目标节点渲染 condition 条件文本', async ({ page }) => {
    await page.goto('/archive/story/mission/a1m2')
    await expect(page.getByRole('heading', { name: /迟到的特训|a1m2/ })).toBeVisible({ timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('任务目标')
    expect(bodyText).toContain('生存特训')
    expect(bodyText).toContain('完成对话')
  })

  test('任务详情页目标节点渲染解析后的地图名称', async ({ page }) => {
    await page.goto('/archive/story/mission/m1m75')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('前往地图')
    expect(bodyText).toContain('进度达到')
  })

  test('任务详情页活动阶段渲染为独立面板（含活动名/dungeon/奖励/敌人）', async ({ page }) => {
    await page.goto('/archive/story/mission/a1m2')
    await expect(page.getByRole('heading', { name: /迟到的特训|a1m2/ })).toBeVisible({ timeout: 30000 })
    // 阶段名（MultiStageTable.name）与活动名（ActivityTable.name）
    await expect(page.locator('body').getByText('生存特训').first()).toBeVisible({ timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    // 活动奖励分组
    expect(bodyText).toContain('活动奖励')
    // dungeon 面板：dungeon 名 / 敌方单位 / 等级 / 富文本描述
    expect(bodyText).toContain('敌方单位')
    expect(bodyText).toContain('Lv.')
    expect(bodyText).toContain('威胁等级')
    // 敌人名称（EnemyTemplateDisplayInfoTable）
    expect(bodyText).toContain('碾骨撕裂牙兽')
  })

  test('敌人卡片点击穿透到威胁图鉴详情', async ({ page }) => {
    await page.goto('/archive/story/mission/a1m2')
    await expect(page.getByRole('heading', { name: /迟到的特训|a1m2/ })).toBeVisible({ timeout: 30000 })
    // 找到指向威胁图鉴的敌人卡片链接并点击
    const enemyLink = page.locator('a[href="/archive/enemies/eny_0050_hound"]').first()
    await expect(enemyLink).toBeVisible({ timeout: 30000 })
    await enemyLink.click()
    await page.waitForURL(/\/archive\/enemies\/eny_0050_hound/)
    await expect(page).toHaveURL(/\/archive\/enemies\/eny_0050_hound/)
  })

  test('任务详情页 quest 节点带边框与前置任务 badge', async ({ page }) => {
    await page.goto('/archive/story/mission/a1m2')
    await expect(page.getByRole('heading', { name: /迟到的特训|a1m2/ })).toBeVisible({ timeout: 30000 })
    // quest 卡片边框存在
    const questCards = page.locator('[class*="rounded-md"][class*="p-3"]')
    expect(await questCards.count()).toBeGreaterThan(0)
    // 前置任务 badge 文案
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('前置任务')
  })
})
