import { test, expect } from '@playwright/test'

test.describe('活动档案 (Activity Archive)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive/activities', { waitUntil: 'domcontentloaded' })
  })

  test('页面标题与甘特图可见', async ({ page }) => {
    await expect(page.locator('h2').first()).toHaveText('活动档案', { timeout: 20000 })
    await expect(page.getByTestId('activity-gantt')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('gantt-today-line')).toBeVisible()
  })

  test('筛选标签与默认勾选项可见', async ({ page }) => {
    await expect(page.getByText('活动类型')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('活动状态')).toBeVisible()
    await expect(page.getByRole('button', { name: '进行中' })).toBeVisible()
    await expect(page.getByRole('button', { name: '未开始' })).toBeVisible()
  })

  test('切换状态筛选后甘特图行数变化', async ({ page }) => {
    const gantt = page.getByTestId('activity-gantt')
    await expect(gantt).toBeVisible({ timeout: 20000 })
    const rows = gantt.getByTestId('activity-row')
    await expect(rows.first()).toBeVisible()
    const before = await rows.count()
    await page.getByRole('button', { name: '已结束' }).click()
    await page.getByRole('button', { name: '进行中' }).click()
    await page.getByRole('button', { name: '常驻' }).click()
    await page.getByRole('button', { name: '未开始' }).click()
    const after = await rows.count()
    expect(after).not.toBe(before)
  })

  test('点击活动弹出详情浮窗并可关闭', async ({ page }) => {
    const gantt = page.getByTestId('activity-gantt')
    await expect(gantt).toBeVisible({ timeout: 20000 })
    await gantt.locator('[data-testid^="gantt-bar-"]').first().click()
    const dialog = page.getByRole('dialog').first()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('活动时间')).toBeVisible()
    await dialog.getByRole('button', { name: '✕' }).click()
    await expect(dialog).not.toBeVisible()
  })

  test('取消全部状态筛选后显示空态', async ({ page }) => {
    await expect(page.getByTestId('activity-gantt')).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: '进行中' }).click()
    await page.getByRole('button', { name: '常驻' }).click()
    await page.getByRole('button', { name: '未开始' }).click()
    await expect(page.getByText('没有符合条件的活动')).toBeVisible()
  })
})
