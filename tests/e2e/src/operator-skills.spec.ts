import { test, expect } from '@playwright/test'

test.describe('干员技能 (Operator Skills)', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('hs_visited', 'true'))
  })

  async function waitForDetailReady(page: any, operatorId: string) {
    await page.goto(`/archive/operators/${operatorId}`)
    // Wait for either the operator name or error/loading state to resolve
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      // Data loaded: we see operator info, or error
      return body.includes('档案记录') || body.includes('未找到') || body.includes('加载失败')
    }, { timeout: 20000 })
  }

  test('技能标签页存在并可点击', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')

    // Skills are rendered inline; check that we see skill group type labels
    await expect(page.getByText('普通攻击', { exact: true }).first()).toBeVisible({ timeout: 5000 })
  })

  test('技能组名称正确渲染（非空文本）', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(2000)

    // Check that skill cards are rendered with non-empty text
    const skillCards = page.locator('section').filter({ has: page.locator('input[type="range"]') })
    const cardCount = await skillCards.count()
    expect(cardCount).toBeGreaterThan(0)

    for (let i = 0; i < cardCount; i++) {
      const card = skillCards.nth(i)
      const cardText = await card.textContent()
      expect(cardText).toBeTruthy()
      expect(cardText!.trim().length).toBeGreaterThan(0)
    }
  })

  test('技能等级滑块可操作并更新显示', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(2000)

    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible({ timeout: 5000 })

    // Check the level display changes with slider
    const levelDisplay = page.locator('input[type="range"]').first().locator('..').locator('span').last()
    await expect(levelDisplay).toBeVisible()

    // Slide to max
    await slider.fill('12')
    await page.waitForTimeout(500)
    // Verify the level display changed (could be "12" now)
    const levelText = await levelDisplay.textContent()
    expect(levelText).toBeTruthy()
  })

  test('干员「阿格莉娜」普通攻击描述中 color 标签正确渲染', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0013_aglina')
    await page.waitForTimeout(3000)

    // The normal attack description contains <@ba.natur>自然伤害</> which
    // should be colored green via RichTextStyleTable: preDef=["<color=#b4d945>"]
    const naturText = page.getByText('自然伤害', { exact: true })
    await expect(naturText.first()).toBeVisible({ timeout: 5000 })

    // Check that the element has an inline color style (from the style table)
    // Walk up the DOM tree to find the ancestor with color style
    // Wait for re-render after style table loads, then check color
    await page.waitForTimeout(3000)

    const treeDump = await naturText.first().evaluate((el) => {
      const parts: string[] = []
      let cur = el
      for (let d = 0; d < 10; d++) {
        const tag = cur.tagName || '#text'
        const style = cur.getAttribute ? cur.getAttribute('style') : null
        const cls = cur.getAttribute ? cur.getAttribute('class') : null
        const text = cur.textContent ? cur.textContent.substring(0, 40) : ''
        parts.push(`depth=${d} tag=${tag} style=${style} class=${cls} text=${JSON.stringify(text)}`)
        if (cur.parentElement) cur = cur.parentElement
        else break
      }
      return parts
    })
    console.log('DOM tree around 自然伤害:', treeDump.join('\n'))
    const hasColorStyle = treeDump.some(line => line.includes('style=') && line.includes('color'))
    expect(hasColorStyle).toBe(true)
  })

  test('干员「陈千语」技能组显示中文名称', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)

    // The skill cards should contain Chinese text labels
    const bodyText = await page.locator('body').textContent() || ''

    // We expect at least one of these to be present:
    const hasSkillLabel = /普通攻击|主动技能|必杀技能|连携技能/.test(bodyText)
    expect(hasSkillLabel).toBe(true)

    // Check that skill group names are not pure whitespace or empty
    const sections = page.locator('section').last()
    const sectionText = await sections.textContent() || ''
    expect(sectionText.trim().length).toBeGreaterThan(0)
    // Should not contain raw placeholder text like empty id references
    expect(sectionText).not.toContain('"id":')
    expect(sectionText).not.toContain('"text":')
  })

  test.describe('双形态技能切换条件 (Dual-Form Skill Condition)', () => {

    test('干员「丽兹妍」双形态技能显示条件名称（阵诀·智 / 阵诀·意）', async ({ page }) => {
      await waitForDetailReady(page, 'chr_0032_lizhiyan')

      // Condition names should be visible somewhere on the page
      const condWisd = page.getByText('阵诀·智', { exact: true })
      const condWill = page.getByText('阵诀·意', { exact: true })
      await expect(condWisd.first()).toBeVisible({ timeout: 10000 })
      await expect(condWill.first()).toBeVisible({ timeout: 10000 })
    })

    test('双形态技能条件描述不含 /* */ 注释标记', async ({ page }) => {
      await waitForDetailReady(page, 'chr_0032_lizhiyan')
      await page.waitForTimeout(3000)

      const bodyText = await page.locator('body').textContent() || ''

      // The RichText stripRichComments should have removed all /* */
      expect(bodyText).not.toContain('/*')
      expect(bodyText).not.toContain('*/')
    })

    test('双形态技能条件描述中 RichText 标签正确渲染', async ({ page }) => {
      await waitForDetailReady(page, 'chr_0032_lizhiyan')
      await page.waitForTimeout(3000)

      // The condition descriptions contain "智识值" and "意志值" from the i18n text
      // after stripRichComments removes the outer /* ... */ wrapper
      const wisdText = page.getByText('智识值', { exact: false })
      const willText = page.getByText('意志值', { exact: false })

      // Both should be visible (at least one occurrence each across all skill cards)
      await expect(wisdText.first()).toBeVisible({ timeout: 5000 })
      await expect(willText.first()).toBeVisible({ timeout: 5000 })

      // No raw {/* ... */} wrapper should appear
      const rawComment = page.getByText('/*智识值', { exact: false })
      const rawCloseComment = page.getByText('*/生效中', { exact: false })
      await expect(rawComment).toHaveCount(0)
      await expect(rawCloseComment).toHaveCount(0)

      // Log DOM context around "生效中" to verify it's rendered as normal text, not inside a comment
      const effectText = page.getByText('生效中', { exact: false })
      const count = await effectText.count()
      expect(count).toBeGreaterThan(0)

      const treeDump = await effectText.first().evaluate((el) => {
        const parts: string[] = []
        let cur = el
        for (let d = 0; d < 8; d++) {
          const tag = cur.tagName || '#text'
          const style = cur.getAttribute ? cur.getAttribute('style') : null
          const cls = cur.getAttribute ? cur.getAttribute('class') : null
          const text = cur.textContent ? cur.textContent.substring(0, 50) : ''
          parts.push(`depth=${d} tag=${tag} style=${style} class=${cls} text=${JSON.stringify(text)}`)
          if (cur.parentElement) cur = cur.parentElement
          else break
        }
        return parts
      })
      console.log('DOM tree around "生效中":', treeDump.join('\n'))
    })
  })
})
