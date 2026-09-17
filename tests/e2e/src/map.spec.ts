import { test, expect } from '@playwright/test'

test.describe('地图浏览器 (Map Viewer)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  test('进入地图页显示区域列表与画布瓦片', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('map-canvas')).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('map-region-item')).toHaveCount(21, { timeout: 30000 })
    await expect(page.getByTestId('map-region-group').first()).toBeVisible()
    await expect(page.locator('[data-testid="map-plane"] img').first()).toBeVisible({ timeout: 30000 })
    // 全幅模式下不渲染面包屑
    await expect(page.getByRole('link', { name: '档案局', exact: true })).toHaveCount(0)
  })

  test('切换区域后底图瓦片更新', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    const firstTile = page.locator('[data-testid="map-plane"] img').first()
    await expect(firstTile).toBeVisible({ timeout: 30000 })
    const before = await firstTile.getAttribute('src')
    await page.locator('[data-testid="map-region-item"][data-level-id="map01_lv001"]').click()
    await expect(page.locator('[data-testid="map-plane"] img').first()).not.toHaveAttribute('src', before ?? '', { timeout: 30000 })
  })

  test('边缘非整块瓦片按真实世界范围渲染而非拉伸为正方形', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="map-plane"] img').first()).toBeVisible({ timeout: 30000 })
    await page.locator('[data-testid="map-region-item"][data-level-id="map01_lv001"]').click()
    await expect.poll(async () => {
      const dims = await page.locator('[data-testid="map-plane"] img').evaluateAll((els) =>
        els.map((el) => {
          const img = el as HTMLImageElement
          return `${img.style.width}x${img.style.height}`
        }),
      )
      return dims.some((dim) => {
        const [w, h] = dim.split('x')
        return w !== h
      })
    }, { timeout: 30000 }).toBe(true)
  })

  test('滚轮缩放与拖拽改变视图变换', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    const plane = page.getByTestId('map-plane')
    await expect(page.locator('[data-testid="map-plane"] img').first()).toBeVisible({ timeout: 30000 })
    const box = await page.getByTestId('map-canvas').boundingBox()
    if (!box) throw new Error('map canvas not laid out')

    const beforeWheel = await plane.getAttribute('style')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -600)
    await expect.poll(async () => plane.getAttribute('style'), { timeout: 10000 }).not.toBe(beforeWheel)

    const beforeDrag = await plane.getAttribute('style')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 80, { steps: 5 })
    await page.mouse.up()
    await expect.poll(async () => plane.getAttribute('style'), { timeout: 10000 }).not.toBe(beforeDrag)
  })

  test('放大到高清晰档后显示地名标注', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="map-plane"] img').first()).toBeVisible({ timeout: 30000 })
    const zoomIn = page.getByRole('button', { name: '放大' })
    for (let i = 0; i < 5; i++) {
      await zoomIn.click()
    }
    await expect(page.getByText('舰桥').first()).toBeVisible({ timeout: 30000 })
  })

  test('多层关卡显示图层面板，单层关卡不显示', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="map-plane"] img').first()).toBeVisible({ timeout: 30000 })
    // 默认首个区域 base01_lv001 为单层
    await expect(page.getByTestId('layer-panel')).toHaveCount(0)

    await page.locator('[data-testid="map-region-item"][data-level-id="map01_lv001"]').click()
    await expect(page.getByTestId('layer-panel')).toBeVisible({ timeout: 30000 })
    // 「全部图层」+ 7 个图层
    await expect(page.getByTestId('layer-item')).toHaveCount(8)
    await expect(page.locator('[data-testid="layer-item"][data-tier-id="all"]')).toHaveClass(/archive-gold/)
    // 无角标（全部图层）
    await expect(page.getByTestId('active-layer-badge')).toHaveCount(0)

    await page.getByTestId('layer-item').nth(1).click()
    await expect(page.getByTestId('active-layer-badge')).toBeVisible()
    // 选中图层后渲染该层的分层贴图（levelmaptiers 目录）
    const tierTile = page.locator('[data-testid="map-tier-tile"]').first()
    await expect(tierTile).toBeVisible({ timeout: 30000 })
    await expect(tierTile).toHaveAttribute('src', /levelmaptiers/)

    // 切回「全部图层」后隐藏分层贴图
    await page.locator('[data-testid="layer-item"][data-tier-id="all"]').click()
    await expect(page.getByTestId('map-tier-tile')).toHaveCount(0)
  })

  test('标记面板可切换静态标记与 POI 显隐', async ({ page }) => {
    await page.goto('/archive/map', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="map-region-item"][data-level-id="map01_lv001"]').click()
    await expect(page.getByTestId('marker-panel')).toBeVisible({ timeout: 30000 })

    await expect(page.locator('[data-kind="poi"]')).toHaveCount(7, { timeout: 30000 })
    const poiToggle = page.locator('[data-testid="marker-toggle"][data-type-key="poi:10"]')
    await expect(poiToggle).toBeChecked()
    await poiToggle.uncheck()
    await expect(page.locator('[data-kind="poi"]')).toHaveCount(0)

    const placeToggle = page.locator('[data-testid="marker-toggle"][data-type-key="place-name"]')
    await expect(placeToggle).toBeChecked()
    const zoomIn = page.getByRole('button', { name: '放大' })
    for (let i = 0; i < 8; i++) {
      await zoomIn.click()
    }
    await expect(page.getByText('山地顶端').first()).toBeVisible({ timeout: 30000 })
    await placeToggle.uncheck()
    await expect(page.getByText('山地顶端')).toHaveCount(0)
  })
})
