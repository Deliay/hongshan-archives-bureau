import { test, expect } from '@playwright/test'

test.describe('档案馆首页 (Archive Home)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive')
  })

  test('显示欢迎语和 11 个模块入口', async ({ page }) => {
    await expect(page.getByText('欢迎阅览')).toBeVisible()
    await expect(page.getByText('选择一卷档案开始查阅')).toBeVisible()
    const modules = [
      '干员档案', '武器档案', '职业与属性', '种族一览',
      '势力阵营', '地区地理', '敌人图鉴', '装备系统',
      '道具材料', '工厂系统', '剧情记录',
    ]
    for (const name of modules) {
      await expect(page.getByRole('main').getByText(name).first()).toBeVisible()
    }
  })

  test('顶栏显示档案馆标题', async ({ page }) => {
    await expect(page.getByRole('banner').getByText('宏山档案馆')).toBeVisible()
  })

  test('面包屑显示档案馆路径', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案馆', exact: true })).toBeVisible()
  })

  test('点击模块卡片导航到对应页面', async ({ page }) => {
    await page.getByRole('main').getByText('干员档案').first().click()
    await page.waitForURL('/archive/operators')
  })

  test('页脚显示数据来源', async ({ page }) => {
    await expect(page.getByText('数据来源')).toBeVisible()
  })
})
