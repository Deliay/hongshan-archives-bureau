import { test, expect } from '@playwright/test'

const MODULE_GROUPS = [
  {
    label: '人事档案',
    modules: ['干员档案', '干员种族', '干员阵营'],
  },
  {
    label: '物资档案',
    modules: ['道具材料', '武器档案', '装备系统', '工厂系统'],
  },
  {
    label: '地理档案',
    modules: ['地区地理'],
  },
  {
    label: '威胁档案',
    modules: ['敌人图鉴'],
  },
  {
    label: '大事记',
    modules: ['剧情记录', '更新日志'],
  },
]

test.describe('档案馆首页 (Archive Home)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
    await page.goto('/archive')
  })

  test('显示欢迎语和分组入口', async ({ page }) => {
    await expect(page.getByText('档案局总览')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('选择一卷档案开始调阅')).toBeVisible()
    for (const group of MODULE_GROUPS) {
      await expect(page.getByRole('main').getByText(group.label).first()).toBeVisible()
      for (const name of group.modules) {
        await expect(page.getByRole('main').getByText(name).first()).toBeVisible()
      }
    }
  })

  test('侧边栏显示档案局标题', async ({ page }) => {
    await expect(page.getByRole('complementary').getByText('宏山档案局')).toBeVisible({ timeout: 15000 })
  })

  test('面包屑显示档案局路径', async ({ page }) => {
    await expect(page.getByRole('link', { name: '档案局', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('点击模块链接导航到对应页面', async ({ page }) => {
    await page.getByRole('main').getByRole('link', { name: '干员档案' }).click()
    await page.waitForURL('/archive/operators')
  })

  test('页脚显示数据来源', async ({ page }) => {
    await expect(page.getByText('数据来源')).toBeVisible({ timeout: 15000 })
  })
})
