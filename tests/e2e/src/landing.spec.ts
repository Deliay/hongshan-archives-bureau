import { test, expect } from '@playwright/test'

test.describe('入口页 (Landing Page)', () => {

  test('首次访问显示入口页，点击后进入档案馆', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('宏山档案馆')).toBeVisible()
    await expect(page.getByText('塔卫二资料集')).toBeVisible()
    await expect(page.getByText('管理员记录')).toBeVisible()
    await page.getByText('阅览资料').click()
    await page.waitForURL('/archive')
  })

  test('已访问用户直接跳转档案馆首页', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/')
    await page.waitForURL('/archive')
    await expect(page.getByText('欢迎阅览')).toBeVisible()
  })

  test('入口页点击后淡出消失', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.fixed.inset-0')).toBeVisible()
    await page.getByText('阅览资料').click()
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3000 })
  })
})
