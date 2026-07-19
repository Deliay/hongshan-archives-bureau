import { test, expect } from '@playwright/test'

test.describe('导航与全局布局 (Navigation & Layout)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  })

  test('侧边栏导航链接可点击跳转', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: '武器档案' }).click()
    await page.waitForURL('/archive/weapons')
    await expect(page.locator('h2').first()).toHaveText('武器档案', { timeout: 15000 })
  })

  test('通过面包屑返回档案局首页', async ({ page }) => {
    await page.goto('/archive/weapons', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h2')
    await page.getByRole('link', { name: '档案局', exact: true }).click()
    await page.waitForURL('/archive')
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
  })

  test('归档模块页面可正常打开', async ({ page }) => {
    const pages = [
      { path: '/archive/weapons', heading: '武器档案' },
      { path: '/archive/professions', heading: '职业与属性' },
      { path: '/archive/enemies', heading: '敌人图鉴' },
      { path: '/archive/items', heading: '道具材料' },
      { path: '/archive/story', heading: '剧情记录' },
    ]
    for (const { path, heading } of pages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h2').first()).toHaveText(heading, { timeout: 15000 })
    }
  })
})
