import { test, expect } from '@playwright/test'

test.describe('档案馆首页 (Archive Home)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive')
  })

  test('显示欢迎语和 10 个模块入口', async ({ page }) => {
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('选择一卷档案开始调阅')).toBeVisible()
    const modules = [
      '干员档案', '武器档案', '职业与属性',
      '地区地理', '敌人图鉴', '装备系统',
      '道具材料', '工厂系统', '剧情记录', '更新日志',
    ]
    for (const name of modules) {
      await expect(page.getByRole('main').getByText(name).first()).toBeVisible()
    }
    await expect(page.getByRole('main').getByText('干员种族')).toBeVisible()
    await expect(page.getByRole('main').getByText('干员阵营')).toBeVisible()
  })

  test('侧边栏显示档案局标题', async ({ page }) => {
    await expect(page.getByRole('complementary').getByText('宏山档案局')).toBeVisible({ timeout: 15000 })
  })

  test('面包屑显示档案局路径', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案局', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('点击模块卡片导航到对应页面', async ({ page }) => {
    await page.getByRole('main').getByText('干员档案').first().click()
    await page.waitForURL('/archive/operators')
  })

  test('页脚显示数据来源', async ({ page }) => {
    await expect(page.getByText('数据来源')).toBeVisible({ timeout: 15000 })
  })
})
