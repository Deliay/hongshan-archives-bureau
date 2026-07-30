import { test, expect } from '@playwright/test'

test.describe('干员语音音频播放 (Voice Audio Playback)', () => {

  async function waitForDetailReady(page: any, operatorId: string) {
    await page.goto(`/archive/operators/${operatorId}`)
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('语音记录') || body.includes('未找到') || body.includes('加载失败')
    }, { timeout: 20000 })
  }

  test('语音记录模块可见', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await expect(page.getByText('语音记录', { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test('播放按钮可见', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButtons = page.locator('button[aria-label="Play"]')
    const count = await playButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('点击播放按钮触发播放', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButton = page.locator('button[aria-label="Play"]').first()
    await playButton.click()
    await expect(page.locator('button[aria-label="Pause"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('点击暂停按钮停止播放', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButton = page.locator('button[aria-label="Play"]').first()
    await playButton.click()
    await expect(page.locator('button[aria-label="Pause"]').first()).toBeVisible({ timeout: 5000 })
    const pauseButton = page.locator('button[aria-label="Pause"]').first()
    await pauseButton.click()
    await expect(page.locator('button[aria-label="Play"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('管理员干员语音记录显示', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0002_endminm')
    await page.waitForTimeout(3000)
    const voiceSection = page.getByText('语音记录', { exact: true })
    await expect(voiceSection.first()).toBeVisible({ timeout: 10000 })
  })
})
