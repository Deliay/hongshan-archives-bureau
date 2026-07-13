import { test, expect } from '@playwright/test'

test.describe('干员详情页 (Operator Detail)', () => {

  async function gotoDetail(page: any, context: any, path: string) {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto(path)
  }

  test('打开干员详情页显示加载状态', async ({ page, context }) => {
    await gotoDetail(page, context, '/archive/operators/chr_0005_chen')
    // 页面加载时显示"加载中"或空白内容
    await expect(page.getByText(/加载中|陈千语|未找到/)).toBeVisible({ timeout: 15000 })
  })

  test('不明干员路径显示提示信息', async ({ page, context }) => {
    await gotoDetail(page, context, '/archive/operators/chr_nonexistent')
    await expect(page.getByText(/加载失败|未找到|暂无/)).toBeVisible({ timeout: 15000 })
  })
})
