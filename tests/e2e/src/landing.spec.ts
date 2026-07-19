import { test, expect } from '@playwright/test'

test.describe('入口页 (Landing Page)', () => {

  test('首次访问显示入口页，点击后进入档案局', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('宏山档案局')).toBeVisible()
    await expect(page.getByText('塔卫二官方档案管理与调阅系统')).toBeVisible()
    await expect(page.getByText('管理员记录')).toBeVisible()
    await page.getByText('进入档案局').click()
    await page.waitForURL('/archive')
  })

  test('已访问用户直接跳转档案局首页', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/')
    await page.waitForURL('/archive')
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
  })

  test('入口页点击后淡出消失', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.fixed.inset-0')).toBeVisible()
    await page.getByText('进入档案局').click()
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible({ timeout: 3000 })
  })
})
