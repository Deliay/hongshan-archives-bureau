import { test, expect } from '@playwright/test'

test.describe('工厂系统 (Factory System)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test.describe('工厂路由与导航', () => {

    test('/archive/factory 重定向到 recipes', async ({ page }) => {
      await page.goto('/archive/factory', { waitUntil: 'domcontentloaded' })
      await page.waitForURL(/\/archive\/factory\/recipes/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/archive\/factory\/recipes/)
    })

    test('工厂配方页签默认高亮', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      const recipesTab = page.getByRole('link', { name: '工厂配方' })
      await expect(recipesTab).toBeVisible({ timeout: 10000 })
      await expect(recipesTab).toHaveClass(/text-archive-gold/)
    })

    test('切换到制作链路页签', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      await page.getByRole('link', { name: '制作链路' }).click()
      await page.waitForURL(/\/archive\/factory\/chains/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/archive\/factory\/chains/)
    })

    test('侧边栏工厂入口保持高亮', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      const factoryLink = page.getByRole('complementary').getByRole('link', { name: '工厂' })
      await expect(factoryLink).toBeVisible({ timeout: 10000 })
      await expect(factoryLink).toHaveClass(/text-archive-gold/)
    })

    test('直接访问 /archive/factory/chains 可直达', async ({ page }) => {
      await page.goto('/archive/factory/chains', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/archive\/factory\/chains/)
      const chainsTab = page.getByRole('link', { name: '制作链路' })
      await expect(chainsTab).toBeVisible({ timeout: 10000 })
      await expect(chainsTab).toHaveClass(/text-archive-gold/)
    })
  })

  test.describe('工厂配方页', () => {

    async function waitForRecipesPage(page: any) {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('工厂配方') || body.includes('加载失败')
      }, { timeout: 20000 })
    }

    test('页面加载成功', async ({ page }) => {
      await waitForRecipesPage(page)
      await expect(page.locator('h1')).toContainText('工厂')
    })

    test('左侧物品列表渲染', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForFunction(() => document.querySelectorAll('main button').length > 0, { timeout: 15000 })
      const buttons = page.locator('main button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })

    test('搜索过滤物品列表', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForFunction(() => document.querySelectorAll('main button').length > 0, { timeout: 15000 })
      const initialCount = await page.locator('main button').count()
      const searchInput = page.getByPlaceholder(/搜索物品/)
      await expect(searchInput).toBeVisible({ timeout: 10000 })
      await searchInput.fill('铁')
      await page.waitForTimeout(500)
      const filteredCount = await page.locator('main button').count()
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('点击物品显示配方', async ({ page }) => {
      await page.goto('/archive/factory/recipes', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return body.includes('工厂配方') || body.includes('加载失败')
      }, { timeout: 20000 })
      await page.waitForFunction(() => document.querySelectorAll('main button').length > 1, { timeout: 15000 })
      const count = await page.locator('main button').count()
      expect(count).toBeGreaterThan(1)
      await page.locator('main button').nth(2).click()
      await page.waitForTimeout(2000)
      const pageText = await page.locator('main').textContent()
      const showsRecipes = /工厂配方|配方|产物|材料/.test(pageText || '')
      expect(showsRecipes).toBe(true)
    })

    test('选中物品刷新后保持选中态', async ({ page }) => {
      await waitForRecipesPage(page)
      await page.waitForFunction(() => document.querySelectorAll('main button').length > 0, { timeout: 15000 })
      const firstVisible = page.locator('main button:visible').first()
      await firstVisible.click()
      await page.waitForTimeout(1000)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await expect(page).toHaveURL(/item=/)
    })
  })

  test.describe('制作链路页', () => {

    async function waitForChainsPage(page: any) {
      await page.goto('/archive/factory/chains', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return (body.includes('搜索并添加目标产物') || body.includes('制作链路')) && !body.includes('正在调阅')
      }, { timeout: 30000 })
    }

    test('页面加载成功', async ({ page }) => {
      await waitForChainsPage(page)
      await expect(page.locator('h1')).toContainText('工厂')
    })

    test('未选择产物时显示引导提示', async ({ page }) => {
      await waitForChainsPage(page)
      const hint = page.getByText(/搜索并添加目标产物/)
      await expect(hint).toBeVisible({ timeout: 10000 })
    })

    test('通过弹窗添加目标产物', async ({ page }) => {
      await waitForChainsPage(page)
      await page.waitForTimeout(1000)
      // 点击原列表处的占位按钮，弹出选择 dialog
      await page.getByRole('button', { name: /添加目标产物/ }).click()
      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible({ timeout: 10000 })
      // dialog 内物品列表使用 ItemTile 展示（包含物品图标 <img>）
      const itemButton = dialog.locator('button', { has: page.locator('img') }).first()
      await expect(itemButton).toBeVisible({ timeout: 10000 })
      await itemButton.click()
      await page.waitForTimeout(500)
      // 选择后 dialog 关闭，目标产物出现在已选列表
      await expect(dialog).toBeHidden({ timeout: 5000 })
      const targetRow = page.locator('input[type="number"]')
      await expect(targetRow).toBeVisible({ timeout: 5000 })
    })

    test('URL 参数同步目标产物', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=iron_ingot:6', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 20000 })
      const targetRow = page.locator('input[type="number"]')
      await expect(targetRow).toBeVisible({ timeout: 10000 })
    })

    test('非法 rate 回退默认理论产速', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=item_proc_battery_5:abc', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      const rateInput = page.locator('input[type="number"]').first()
      await expect(rateInput).toBeVisible({ timeout: 10000 })
      // 非法 rate 应回退为默认配方理论产速（正数），而不是 0/空
      await page.waitForFunction(() => {
        const input = document.querySelector('input[type="number"]') as HTMLInputElement | null
        return input && parseFloat(input.value) > 0
      }, { timeout: 10000 })
    })

    test('清空已选产物', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=iron_ingot:6', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 20000 })
      await page.waitForTimeout(1000)
      const clearBtn = page.getByText('清空')
      if (await clearBtn.isVisible()) {
        await clearBtn.click()
        await page.waitForTimeout(500)
        await expect(page).not.toHaveURL(/targets=/)
      }
    })

    test('选择 item_proc_battery_5 后图的连线正常连接', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      const graphContainer = page.locator('.react-flow')
      await expect(graphContainer).toBeVisible({ timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const domEdgeCount = await page.locator('g.react-flow__edge').count()
      expect(domEdgeCount).toBeGreaterThan(5)

      // 回归（TargetNode handle 类型错误导致 target 入边静默丢失）：
      // 树状链路中每个非源节点至少有一条入边
      const nodeCount = await page.locator('.react-flow__node').count()
      const sourceCount = await page.locator('.react-flow__node-source').count()
      expect(domEdgeCount).toBeGreaterThanOrEqual(nodeCount - sourceCount)
    })

    test('机器节点渲染名字和图标', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const machineNodes = page.locator('.react-flow__node-machine')
      const machineCount = await machineNodes.count()
      expect(machineCount).toBeGreaterThan(0)

      const firstMachine = machineNodes.first()
      await expect(firstMachine).toBeVisible()

      const machineText = await firstMachine.textContent()
      expect(machineText).toBeTruthy()
      expect(machineText!.trim().length).toBeGreaterThan(0)

      const iconImg = firstMachine.locator('img')
      const imgCount = await iconImg.count()
      expect(imgCount).toBeGreaterThan(0)
    })

    test('机器节点以物品图标渲染配方', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node-machine').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const firstMachine = page.locator('.react-flow__node-machine').first()
      await expect(firstMachine).toBeVisible()

      // 不再渲染原始 itemId 文本，配方以 输入ItemTile → 输出ItemTile 形式展示
      const machineText = await firstMachine.textContent()
      expect(machineText).not.toMatch(/item_[a-z0-9_]+/i)
      expect(machineText).toContain('→')

      // 机器图标 + 配方物品 ItemTile，应有多个 <img>
      const imgCount = await firstMachine.locator('img').count()
      expect(imgCount).toBeGreaterThan(1)
    })

    test('目标节点显示产速', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const targetNode = page.locator('.react-flow__node-target')
      const targetCount = await targetNode.count()
      expect(targetCount).toBeGreaterThan(0)

      const targetText = await targetNode.first().textContent()
      expect(targetText).toContain('/min')
    })

    test('修改产速后机器数量变化', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node-machine').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(2000)

      const rateInput = page.locator('input[type="number"]').first()
      await rateInput.fill('10')
      await rateInput.press('Enter')
      await page.waitForTimeout(2000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('×')
    })

    test('多目标共享中间品', async ({ page }) => {
      await page.goto('/archive/factory/chains?targets=iron_ingot:5,steel_ingot:2', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const targetNodes = page.locator('.react-flow__node-target')
      const targetCount = await targetNodes.count()
      expect(targetCount).toBeGreaterThanOrEqual(2)
    })

    test('气态赤铜链路以赤铜矿为源头且无封闭回路', async ({ page }) => {
      // 回归（配方表键序选中拆解机 → 灌装↔拆解零产出封闭子图）：
      // 正确解为 固气转化机 + 精炼炉，源头是赤铜矿（矿机）与清水（水泵）
      await page.goto('/archive/factory/chains?targets=item_gas_copper:10', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('固气转化机')
      expect(graphText).toContain('精炼炉')
      // 源头节点体现采集机器：矿机 / 水泵
      expect(graphText).toContain('赤铜矿')
      expect(graphText).toContain('矿机')
      expect(graphText).toContain('水泵')
      // 不得出现净产出为 0 的灌装↔拆解封闭子图
      expect(graphText).not.toContain('拆解机')
      expect(graphText).not.toContain('灌装机')
    })

    test('种植链路包含种植机与采种机的有效循环', async ({ page }) => {
      // 采种机 1 作物 → 2 种子、种植机 1 种子 → 1 作物，netRatio=2 增产：
      // 外部需求 10/min 时种植机稳态总产 20/min（10 交付 + 10 回流采种）
      await page.goto('/archive/factory/chains?targets=item_plant_bbflower_1:10', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('种植机')
      expect(graphText).toContain('采种机')
      expect(graphText).toContain('20.0/min')
      // 有效循环需预填充：采种机节点标记需预填充作物
      expect(graphText).toContain('需预填充')
    })

    test('息壤粉末链路综合气泵采集与洪炉生产（武陵）', async ({ page }) => {
      // 供给需求综合考虑：气泵采集息壤气用满区域上限 100/min（经固气转化机），
      // 剩余 50/min 由天有洪炉（碳块+水）生产
      await page.goto('/archive/factory/chains?targets=item_xiranite_powder:150', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('固气转化机')
      expect(graphText).toContain('天有洪炉')
      expect(graphText).toContain('气体收集泵')
      expect(graphText).toContain('100.0/min')
      expect(graphText).toContain('50.0/min')
    })

    test('切换四号谷地后息壤全部由洪炉生产', async ({ page }) => {
      // 四号谷地无息壤气矿点（区域未列出 = 不可采集），需求全部改走洪炉路线
      await page.goto('/archive/factory/chains?targets=item_xiranite_powder:150', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(2000)

      await page.getByRole('button', { name: '四号谷地' }).click()
      await expect(page).toHaveURL(/region=valley4/)
      await page.waitForTimeout(2000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('天有洪炉')
      expect(graphText).not.toContain('气体收集泵')
      expect(graphText).not.toContain('固气转化机')
    })

    test('扩容反应池共炉级联（息壤聚合）', async ({ page }) => {
      // 息壤液/聚合液/息壤聚合等 mix_pool_2 配方共炉：合并为一个扩容反应池节点，
      // 炉内级联，缓存区按不同物质计数（共享物质只算一次）
      await page.goto('/archive/factory/chains?targets=item_xiranite_poly:10', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('扩容反应池')
      // 副产物复用后共炉配方为壤晶合成+壤晶废液合成：壤晶废液/蓝铁粉末/壤晶/污水/液化息壤/惰性壤晶废液 6 种物质
      expect(graphText).toContain('缓存区 6/8')
      // 惰性壤晶废液经提纯机转化回壤晶废液（副产物转化利用）
      expect(graphText).toContain('提纯机')
      // 规划验证修复：不得残留灌装↔拆解零产出封闭子图
      expect(graphText).not.toContain('拆解机')
      expect(graphText).not.toContain('灌装机')
      // 普通反应池不出现在链路中（扩容反应池路线优先）
      const poolNodes = page.locator('.react-flow__node-machine', { hasText: '反应池' })
      const poolCount = await poolNodes.count()
      expect(poolCount).toBe(1)
    })

    test('中容武陵电池副产物复用：污水回用 + 惰性废液提纯，赤铜矿仅需 18/min', async ({ page }) => {
      // 壤晶合成副产污水回用于壤晶废液合成；惰性壤晶废液经提纯机回收；
      // 污水净外部需求 18/min → 精炼炉副产（赤铜矿 18/min），不再跑赫铜块路线
      await page.goto('/archive/factory/chains?targets=item_proc_battery_5:6', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const graphText = await page.locator('.react-flow').textContent()
      expect(graphText).toContain('提纯机')
      expect(graphText).not.toContain('赫铜')
      // 赤铜矿源节点仅需 18/min（副产物复用前为区域上限 420/min）
      const copperOre = page.locator('.react-flow__node-source', { hasText: '赤铜矿' })
      await expect(copperOre).toHaveCount(1)
      await expect(copperOre.first()).toContainText('18.0/min')
    })

    test('中容武陵电池 6/min：封装机 10s/个正好 1 台', async ({ page }) => {
      // 回归：totalProgress 误当毫秒导致理论产速低估 6 倍（60000 → 10s/个 → 单台 6/min）
      await page.goto('/archive/factory/chains?targets=item_proc_battery_5:6', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })
      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })
      await page.waitForTimeout(3000)

      const packer = page.locator('.react-flow__node-machine', { hasText: '封装机' })
      await expect(packer).toHaveCount(1)
      await expect(packer.first()).toContainText('×1')
    })

    test('传送带/管道边显示数量', async ({ page }) => {
      const TARGET = 'item_proc_battery_5'

      await page.goto(`/archive/factory/chains?targets=${TARGET}:1`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const body = document.body.textContent || ''
        return !body.includes('正在调阅')
      }, { timeout: 30000 })

      await page.waitForFunction(() => {
        return document.querySelectorAll('.react-flow__node').length > 0
      }, { timeout: 15000 })

      await page.waitForTimeout(3000)

      const edges = page.locator('g.react-flow__edge')
      const edgeCount = await edges.count()
      expect(edgeCount).toBeGreaterThan(0)

      const edgeLabels = page.locator('g.react-flow__edge .react-flow__edge-text')
      const labelCount = await edgeLabels.count()
      expect(labelCount).toBeGreaterThan(0)

      const firstEdgeLabel = await edgeLabels.first().textContent().catch(() => '') || ''
      // 边标签带速率和物流数量（i18n 文案，断言格式不断言具体语言）
      expect(firstEdgeLabel).toContain('/min')
      // 回归（maxThroughput 丢 volume 导致吞吐量 0）：所有边物流数量必须 > 0
      for (let i = 0; i < labelCount; i++) {
        const label = (await edgeLabels.nth(i).textContent().catch(() => '')) || ''
        expect(label).not.toContain('×0')
      }
    })
  })
})
