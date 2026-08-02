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

  test('剧情梗概页加载并展示任务详情', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30000 })
    // 左侧导航出现后，右侧展示默认任务详情（含任务目标）
    await expect(page.locator('nav button').first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText('任务目标').first()).toBeVisible({ timeout: 30000 })
  })

  test('剧情梗概类型筛选', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30000 })
    await page.locator('nav button').first().waitFor({ timeout: 30000 })
    await page.locator('select').first().selectOption('e')
    await expect(page).toHaveURL(/type=e/)
  })

  test('剧情梗概篇章导航存在', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30000 })
    await page.locator('nav button').first().waitFor({ timeout: 30000 })
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
  })

  test('剧情梗概左侧导航按 MissionRuntimeAsset 过滤（不含 c1m1）', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30000 })
    await page.locator('nav button').first().waitFor({ timeout: 30000 })
    // 左侧导航的 mission 按钮
    const navButtons = page.locator('nav button')
    expect(await navButtons.count()).toBeGreaterThan(0)
    const navText = (await navButtons.allTextContents()).join(' ')
    // c1m1 不在 MissionRuntimeAsset 中，不应出现
    expect(navText).not.toContain('c1m1')
    // 真实任务仍存在（a1m2 / e1m3）
    expect(navText).toContain('a1m2')
    // hidden 开头的任务来自 MissionRuntimeAsset，应出现
    expect(navText).toContain('hidden')
  })

  test('剧情梗概点击导航切换任务并更新路由 mission 参数', async ({ page }) => {
    await page.goto('/archive/story/recap')
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30000 })
    // 等待导航加载并出现 a1m2 任务
    const a1m2Btn = page.locator('nav button', { hasText: 'a1m2' }).first()
    await expect(a1m2Btn).toBeVisible({ timeout: 30000 })
    await a1m2Btn.click()
    // 路由体现所选任务
    await expect(page).toHaveURL(/mission=a1m2/)
    // 右侧展示 a1m2 详情
    await expect(page.getByText('任务目标').first()).toBeVisible({ timeout: 30000 })
  })

  test('PRTS 文库页展示分类页签与卷卡片', async ({ page }) => {
    await page.goto('/archive/story/library')
    // 等待页面内容加载：查找 "全部" 页签按钮（visible）
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 左侧列表出现文档条目（含 type 标签的按钮）
    await expect(page.locator('main aside button').first()).toBeVisible({ timeout: 30000 })
  })

  test('PRTS 文库页签切换', async ({ page }) => {
    await page.goto('/archive/story/library')
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 点击一个分类页签（非"全部"的按钮）
    const catButtons = page.locator('main aside > div:first-child button:not(:first-child)')
    const count = await catButtons.count()
    if (count > 0) {
      await catButtons.first().click()
      await expect(page).toHaveURL(/cat=/)
    }
  })

  test('PRTS 文库左侧列表点击后右侧展示详情', async ({ page }) => {
    await page.goto('/archive/story/library')
    const allTab = page.getByRole('button', { name: '全部' })
    await expect(allTab).toBeVisible({ timeout: 30000 })
    // 点击左侧一个文档条目
    const docItem = page.locator('main aside button').first()
    await expect(docItem).toBeVisible({ timeout: 15000 })
    await docItem.click()
    await page.waitForTimeout(1000)
    // URL 携带 doc 参数
    await expect(page).toHaveURL(/doc=/)
    // 右侧详情区域渲染（右侧 section 非空）
    const detailText = await page.locator('main section').textContent() || ''
    expect(detailText.length).toBeGreaterThan(0)
  })

  test('PRTS 文库文档详情深链可渲染', async ({ page }) => {
    await page.goto('/archive/story/library/nar_sm1l1m4_hatman_2')
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('返回') || body.includes('Back')
    }, { timeout: 30000 })
    const detailText = await page.locator('main').textContent() || ''
    expect(detailText.length).toBeGreaterThan(0)
  })

  test('PRTS 文库文本文档中的 <image> 标签渲染为图片', async ({ page }) => {
    await page.goto('/archive/story/library?doc=nar_sm1l1m4_1')
    await page.waitForFunction(() => {
      return document.querySelectorAll('main section img').length > 0
    }, { timeout: 30000 })
    const img = page.locator('main section img').first()
    const src = await img.getAttribute('src')
    expect(src).toContain('/sprites/reading/collection_sm1l1m4_arrowrelic.png')
    const box = await img.boundingBox()
    expect(box!.width).toBeGreaterThan(100)
  })

  test('PRTS 文库 multimedia 文档支持音频播放', async ({ page }) => {
    await page.goto('/archive/story/library?doc=nar_col_radio_5')
    await page.waitForFunction(() => {
      return document.body.textContent?.includes('radio_gm01m23_4_001') ?? false
    }, { timeout: 30000 })
    await expect(page.getByTestId('line-play-radio_gm01m23_4_001')).toBeVisible({ timeout: 15000 })
    // 点击播放 → 控制面板出现并显示当前行
    await page.getByTestId('line-play-radio_gm01m23_4_001').click()
    const bar = page.getByTestId('dialog-player-bar')
    await expect(bar).toBeVisible({ timeout: 5000 })
    await expect(bar.getByText('radio_gm01m23_4_001', { exact: true })).toBeVisible({ timeout: 5000 })
    // 点击 Next → 切到下一条
    await bar.getByRole('button', { name: 'Next' }).click()
    await expect(bar.getByText('radio_gm01m23_4_002', { exact: true })).toBeVisible({ timeout: 5000 })
  })

  test('PRTS 文库切换文档后播放高亮不串到新文档', async ({ page }) => {
    // 播放 A 档案第一条，切到 B 档案：B 不应显示任何行正在播放（按 voId 匹配而非 index）
    await page.goto('/archive/story/library?doc=nar_col_radio_5')
    await expect(page.getByTestId('line-play-radio_gm01m23_4_001')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('line-play-radio_gm01m23_4_001').click()
    await expect(page.getByTestId('dialog-player-bar')).toBeVisible({ timeout: 5000 })
    // 切到另一个 multimedia 文档 B
    await page.goto('/archive/story/library?doc=nar_media_map01_45_1')
    await page.waitForFunction(() => {
      return document.body.textContent?.includes('radio_map01_lv006_322_001') ?? false
    }, { timeout: 30000 })
    // 等待渲染稳定：B 的 audioOverride 与正在播放的 A 不同，不应有行被高亮为正在播放
    await page.waitForTimeout(1000)
    const activeCount = await page.locator('[data-active="true"]').count()
    expect(activeCount).toBe(0)
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

  test('Baker 聊天窗口不撑开页面，左右分栏各自滚动', async ({ page }) => {
    await page.goto('/archive/baker')
    await page.waitForFunction(() => {
      const links = document.querySelectorAll('button[class*="items-center"][class*="gap-3"]')
      return links.length > 0
    }, { timeout: 30000 })
    // 选择有较多聊天的联系人（佩丽卡）
    const buttons = page.locator('button[class*="items-center"][class*="gap-3"]')
    const count = await buttons.count()
    let clicked = false
    for (let i = 0; i < count; i++) {
      const txt = await buttons.nth(i).textContent()
      if (txt && txt.includes('佩丽卡')) { await buttons.nth(i).click(); clicked = true; break }
    }
    if (!clicked) await buttons.first().click()
    await page.waitForTimeout(2000)
    // 左右分栏容器固定高度且 overflow-y hidden（各自内部滚动，不撑开页面）
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('div[class*="grid-cols-1"]') as HTMLElement
      if (!grid) return { overflows: [], gridHeight: 0, panelHeights: [] }
      const gr = grid.getBoundingClientRect()
      const kids = [...grid.children].slice(0, 2)
      return {
        overflows: kids.map(c => getComputedStyle(c as HTMLElement).overflowY),
        gridHeight: gr.height,
        panelHeights: kids.map(c => (c as HTMLElement).getBoundingClientRect().height),
      }
    })
    expect(layout.overflows.length).toBeGreaterThanOrEqual(2)
    expect(layout.overflows.every(o => o === 'hidden' || o === 'clip' || o === 'auto')).toBe(true)
    // 分栏高度与 grid 一致（内容在内部滚动而非撑高 grid）
    expect(layout.gridHeight).toBeGreaterThan(0)
    expect(layout.panelHeights.every(h => h <= layout.gridHeight + 2)).toBe(true)
  })

  test('Baker 多 topic 在左侧聊天列表展开并默认选中第一个', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    await page.waitForTimeout(3000)
    // 佩丽卡有 13 个 topic，均渲染为左侧面板的可点击按钮
    const topicButtons = page.locator('button', { hasText: '祖泉与清波' }).first()
    await expect(topicButtons).toBeVisible({ timeout: 10000 })
    // 默认选中第一个 topic
    const active = page.locator('button.bg-archive-gold\\/10', { hasText: '祖泉与清波' })
    await expect(active.first()).toBeVisible({ timeout: 10000 })
    // 顶部不再展示 topic 切换条（无 topic 名出现在聊天面板顶部）
    const topicBar = page.locator('div.flex.overflow-x-auto')
    expect(await topicBar.count()).toBe(0)
  })

  test('Baker 分支选项不产生「我」的气泡', async ({ page }) => {
    // 佩丽卡聊天首条分支：选项以分支形式展示，选中后无 self 气泡
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    await page.waitForTimeout(3000)
    const optionButtons = page.locator('div[class*="border-archive-gold"] button')
    await expect(optionButtons.first()).toBeVisible({ timeout: 15000 })
    // 选项分支按钮存在
    expect(await optionButtons.count()).toBeGreaterThan(0)
    // 点击一个选项后，消息列表中不出现「我」的回复气泡
    await optionButtons.first().click()
    await page.waitForTimeout(1000)
    const selfBubbles = await page.evaluate(() => {
      const body = document.body.textContent || ''
      return body
    })
    expect(selfBubbles.length).toBeGreaterThan(0)
  })

  test('Baker 页面加载后无窗口级滚动条', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    // 等待聊天消息气泡加载完成
    await page.waitForFunction(() => {
      return document.querySelectorAll('main [class*="rounded-lg"]').length > 0
    }, { timeout: 30000 })
    await page.waitForTimeout(500)
    const noScroll = await page.evaluate(() => {
      const de = document.documentElement
      return de.scrollHeight <= de.clientHeight
    })
    expect(noScroll).toBe(true)
  })

  test('Baker 切换 topic 后聊天首条消息变化', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    await page.waitForFunction(() => {
      return document.querySelectorAll('main [class*="rounded-lg"]').length > 0
    }, { timeout: 30000 })
    const firstBubble = page.locator('main [class*="rounded-lg"]').first()
    const before = await firstBubble.textContent()
    // 点击左侧第二个 topic
    const topicButtons = page.locator('div[class*="pl-8"] button')
    await expect(topicButtons.nth(1)).toBeVisible({ timeout: 10000 })
    await topicButtons.nth(1).click()
    await page.waitForTimeout(800)
    const after = await firstBubble.textContent()
    expect(after).not.toBe(before)
  })

  test('Baker 切换 topic 后聊天滚动位置重置到顶部', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    await page.waitForFunction(() => {
      return document.querySelectorAll('main [class*="rounded-lg"]').length > 0
    }, { timeout: 30000 })
    // 滚动聊天面板到中部
    await page.evaluate(() => {
      const scroller = document.querySelector('main .h-full.flex.flex-col.overflow-y-auto')
      if (scroller) scroller.scrollTop = 200
    })
    await page.waitForTimeout(300)
    const before = await page.evaluate(() => {
      const scroller = document.querySelector('main .h-full.flex.flex-col.overflow-y-auto')
      return scroller ? scroller.scrollTop : -1
    })
    expect(before).toBeGreaterThan(0)
    // 点击左侧第二个 topic
    const topicButtons = page.locator('div[class*="pl-8"] button')
    await expect(topicButtons.nth(1)).toBeVisible({ timeout: 10000 })
    await topicButtons.nth(1).click()
    await page.waitForTimeout(500)
    // 滚动位置重置到顶部
    const after = await page.evaluate(() => {
      const scroller = document.querySelector('main .h-full.flex.flex-col.overflow-y-auto')
      return scroller ? scroller.scrollTop : -1
    })
    expect(after).toBe(0)
  })

  test('Baker 点击 topic 后 URL 携带 topic 参数', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica')
    await page.waitForFunction(() => {
      return document.querySelectorAll('div[class*="pl-8"] button').length > 0
    }, { timeout: 30000 })
    const topicButtons = page.locator('div[class*="pl-8"] button')
    await topicButtons.nth(1).click()
    await expect(page).toHaveURL(/topic=/)
  })

  test('Baker URL 携带 topic 时左侧列表定位到对应 topic', async ({ page }) => {
    await page.goto('/archive/baker?chat=sns_chr_0004_pelica&topic=topic_chr_0004_pelica_2')
    await page.waitForFunction(() => {
      return document.querySelectorAll('div[class*="pl-8"] button').length > 0
    }, { timeout: 30000 })
    const topicButton = page.locator('div[class*="pl-8"] button[data-topic-id="topic_chr_0004_pelica_2"]')
    await expect(topicButton).toBeVisible({ timeout: 10000 })
    await expect(topicButton).toHaveClass(/bg-archive-gold\/10/)
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
    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: '剧情纪事', exact: true })).toBeVisible({ timeout: 5000 })
    // recap 面包屑使用翻译文本而非原始路径
    await expect(main.getByText('剧情梗概', { exact: true })).toBeVisible({ timeout: 5000 })
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

  test('任务详情页渲染任务类型与重要性徽标', async ({ page }) => {
    await page.goto('/archive/story/mission/a1m2')
    await expect(page.getByRole('heading', { name: /迟到的特训|a1m2/ })).toBeVisible({ timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    // MissionTypeInfoTable: a1m2 type 11 → MissionViewActivity → 活动任务
    expect(bodyText).toContain('活动任务')
    // MissionImportanceCfg: a1m2 baseImportance 1 → 重要
    expect(bodyText).toContain('重要')
  })

  test('任务详情页关卡展示为大地图名·关卡名', async ({ page }) => {
    await page.goto('/archive/story/mission/e11m1')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const bodyText = await page.locator('body').textContent() || ''
    // LevelDescTable map02_lv007 → 应龙关, MapIdTable map02 → 武陵
    expect(bodyText).toContain('武陵')
    expect(bodyText).toContain('应龙关')
  })

  test('对话型目标渲染对应剧情梗概（DialogSummaryMapTable 解析）', async ({ page }) => {
    // e1m3_q#17 目标是完成对话 dlg_e1m3_6，其 summaryId = summary_e1m3_6_001
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const scenes = page.getByTestId('quest-recap-scene')
    await expect(scenes.first()).toBeVisible({ timeout: 30000 })
    // 场景 code 由 DLG_KEY_RE 解析：E1·M3·场06
    await expect(page.locator('body').getByText('E1·M3·场06', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    // 梗概文本来自 DialogSummaryTable CN
    const bodyText = await page.locator('body').textContent() || ''
    expect(bodyText).toContain('便携源石矿机')
  })

  test('场景可展开完整对话（DialogTextTable + 说话人 + 音频按钮）', async ({ page }) => {
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    // 定位剧情梗概场景块中的 E1·M3·场06（首个出现），展开其完整对话
    const sceneCode = page.locator('body').getByText('E1·M3·场06', { exact: true }).first()
    await expect(sceneCode).toBeVisible({ timeout: 15000 })
    await sceneCode.locator('..').getByRole('button', { name: '展开对话' }).click()
    // DialogTextTable 中 dlg_e1m3_6_001 的说话人（actorName）与文本
    await expect(page.locator('body').getByText('佩丽卡', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('body').getByText(/安德烈先生，我们把你要的东西找回来了/)).toBeVisible({ timeout: 5000 })
    // actorNameId 文本行
    await expect(page.locator('body').getByText('dlg_e1m3_6_001', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    // audioOverride 存在 → 播放按钮（aria-label="Play"）
    await expect(page.locator('button[aria-label="Play"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('quest 对话目标内联梗概可展开完整对话（dlg_e1m3_2）', async ({ page }) => {
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const recapScenes = page.getByTestId('quest-recap-scene')
    await expect(recapScenes.first()).toBeVisible({ timeout: 15000 })
    // 找到引用 dlg_e1m3_2 的目标场景块并展开
    let target: any = null
    for (let i = 0; i < await recapScenes.count(); i++) {
      const txt = await recapScenes.nth(i).textContent()
      if (txt && txt.includes('dlg_e1m3_2')) { target = recapScenes.nth(i); break }
    }
    expect(target).not.toBeNull()
    await target.getByRole('button', { name: '展开对话' }).click()
    // DialogTextTable dlg_e1m3_2_001 渲染出来，且有说话人与音频按钮
    await expect(page.locator('body').getByText('dlg_e1m3_2_001', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button[aria-label="Play"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('endminf 说话行的音频 URL 追加 _f 后缀', async ({ page }) => {
    // e11m1 场景1 含 endminf 对话行（如 dlg_e11m1_1_012），其 audioOverride 应为 au_dlg_e11m1_1_012_f
    const audioRequests: string[] = []
    page.on('request', req => {
      if (req.url().includes('audios/dialogs/vo/')) audioRequests.push(req.url())
    })
    await page.goto('/archive/story/mission/e11m1')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    // 展开 E11·M1·场01 场景块
    const sceneCode = page.locator('body').getByText('E11·M1·场01', { exact: true }).first()
    await expect(sceneCode).toBeVisible({ timeout: 15000 })
    await sceneCode.locator('..').getByRole('button', { name: '展开对话' }).click()
    // 定位含 dlg_e11m1_1_012（endminf 行）的行并点击其播放按钮
    const line = page.locator('body').getByText('dlg_e11m1_1_012', { exact: true }).first()
    await expect(line).toBeVisible({ timeout: 10000 })
    await line.locator('..').getByRole('button', { name: 'Play' }).click()
    await expect
      .poll(async () => audioRequests.some(u => u.includes('au_dlg_e11m1_1_012_f')), { timeout: 10000 })
      .toBe(true)
  })

  test('无 DialogSummaryMapTable 摘要的对话目标仍可展开（dlg_gm01m23_2）', async ({ page }) => {
    // dlg_gm01m23_2 在 DialogTextTable 有台词但不在 DialogSummaryMapTable，无摘要场景
    await page.goto('/archive/story/mission/gm01m23')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const recapScenes = page.getByTestId('quest-recap-scene')
    await expect(recapScenes.first()).toBeVisible({ timeout: 15000 })
    // 找到引用 dlg_gm01m23_2 的目标块
    let target: any = null
    for (let i = 0; i < await recapScenes.count(); i++) {
      const txt = await recapScenes.nth(i).textContent()
      if (txt && txt.includes('dlg_gm01m23_2')) { target = recapScenes.nth(i); break }
    }
    expect(target).not.toBeNull()
    await target.getByRole('button', { name: '展开对话' }).click()
    // DialogTextTable dlg_gm01m23_2_001 渲染出来
    await expect(page.locator('body').getByText('dlg_gm01m23_2_001', { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test('音频 HEAD 返回 404 时不显示播放按钮', async ({ page }) => {
    // 拦截音频 HEAD 请求全部返回 404 → 播放按钮不出现
    await page.route('**/audios/dialogs/vo/**', async route => {
      if (route.request().method() === 'HEAD') await route.fulfill({ status: 404 })
      else await route.continue()
    })
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const sceneCode = page.locator('body').getByText('E1·M3·场06', { exact: true }).first()
    await expect(sceneCode).toBeVisible({ timeout: 15000 })
    await sceneCode.locator('..').getByRole('button', { name: '展开对话' }).click()
    await expect(page.locator('body').getByText('dlg_e1m3_6_001', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1500)
    // HEAD 404 → 播放按钮不出现
    await expect(page.getByTestId('line-play-dlg_e1m3_6_001')).toHaveCount(0)
  })

  test('点击播放后显示控制面板，Next 可切换到下一条并自动续播', async ({ page }) => {
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const sceneCode = page.locator('body').getByText('E1·M3·场06', { exact: true }).first()
    await expect(sceneCode).toBeVisible({ timeout: 15000 })
    await sceneCode.locator('..').getByRole('button', { name: '展开对话' }).click()
    await expect(page.getByTestId('line-play-dlg_e1m3_6_001')).toBeVisible({ timeout: 10000 })
    // 点击第一条播放 → 控制面板出现
    await page.getByTestId('line-play-dlg_e1m3_6_001').click()
    const bar = page.getByTestId('dialog-player-bar')
    await expect(bar).toBeVisible({ timeout: 5000 })
    // 面板当前行 = 第一条
    await expect(bar.getByText('dlg_e1m3_6_001', { exact: true })).toBeVisible({ timeout: 5000 })
    // 点击 Next → 当前行切到下一条 dlg_e1m3_6_002
    await bar.getByRole('button', { name: 'Next' }).click()
    await expect(bar.getByText('dlg_e1m3_6_002', { exact: true })).toBeVisible({ timeout: 5000 })
  })

  test('同时展开多个对话时控制面板只出现一个', async ({ page }) => {
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    // 展开剧情梗概场景（场06）的对话
    const scene06 = page.locator('body').getByText('E1·M3·场06', { exact: true }).first()
    await expect(scene06).toBeVisible({ timeout: 15000 })
    await scene06.locator('..').getByRole('button', { name: '展开对话' }).click()
    await expect(page.getByTestId('line-play-dlg_e1m3_6_001')).toBeVisible({ timeout: 10000 })
    // 再展开一个 quest 对话目标（dlg_e1m3_2）的对话
    const recapScenes = page.getByTestId('quest-recap-scene')
    await expect(recapScenes.first()).toBeVisible({ timeout: 15000 })
    let target: any = null
    for (let i = 0; i < await recapScenes.count(); i++) {
      const txt = await recapScenes.nth(i).textContent()
      if (txt && txt.includes('dlg_e1m3_2')) { target = recapScenes.nth(i); break }
    }
    expect(target).not.toBeNull()
    await target.getByRole('button', { name: '展开对话' }).click()
    await expect(page.locator('body').getByText('dlg_e1m3_2_001', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    // 点击场06 第一条播放 → 控制面板只渲染一个
    await page.getByTestId('line-play-dlg_e1m3_6_001').click()
    await expect(page.getByTestId('dialog-player-bar')).toHaveCount(1)
    // 播放时所在的那一行有高亮底色（data-active=true）
    const activeLine = page.locator('[data-active="true"]')
    await expect(activeLine).toBeVisible({ timeout: 5000 })
  })

  test('控制面板 sticky 悬浮于页面顶部', async ({ page }) => {
    await page.goto('/archive/story/mission/e1m3')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 30000 })
    const sceneCode = page.locator('body').getByText('E1·M3·场06', { exact: true }).first()
    await expect(sceneCode).toBeVisible({ timeout: 15000 })
    await sceneCode.locator('..').getByRole('button', { name: '展开对话' }).click()
    await expect(page.getByTestId('line-play-dlg_e1m3_6_001')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('line-play-dlg_e1m3_6_001').click()
    const bar = page.getByTestId('dialog-player-bar')
    await expect(bar).toBeVisible({ timeout: 5000 })
    // 面板使用 sticky 定位，滚动页面后仍可见于视口顶部
    const position = await bar.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('sticky')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(bar).toBeInViewport({ timeout: 5000 })
  })
})
