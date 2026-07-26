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

    test('通过下拉选择器添加目标产物', async ({ page }) => {
      await waitForChainsPage(page)
      await page.waitForTimeout(1000)
      const select = page.locator('select')
      await expect(select).toBeVisible({ timeout: 10000 })
      await select.selectOption({ index: 1 })
      await page.waitForTimeout(500)
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
