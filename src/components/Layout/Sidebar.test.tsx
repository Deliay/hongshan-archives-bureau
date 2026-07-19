import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../../lib/locale'
import Sidebar from './Sidebar'

vi.mock('../../hooks/useData', () => ({
  useI18nLocales: () => ({ data: ['CN', 'EN'], loading: false, error: null, refetch: vi.fn() }),
}))

const NAV_GROUPS = [
  { label: '人事档案', items: ['干员档案', '干员种族', '干员阵营'] },
  { label: '物资档案', items: ['道具材料', '武器档案', '装备系统', '工厂系统'] },
  { label: '地理档案', items: ['地区地理'] },
  { label: '威胁档案', items: ['敌人图鉴'] },
  { label: '大事记', items: ['剧情记录', '更新日志'] },
]

function renderSidebar(initialEntries: string[] = ['/archive']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LocaleProvider>
        <Sidebar />
      </LocaleProvider>
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all group labels and navigation links', () => {
    renderSidebar()
    for (const group of NAV_GROUPS) {
      expect(screen.getByText(group.label)).toBeTruthy()
      for (const item of group.items) {
        expect(screen.getByRole('link', { name: item })).toBeTruthy()
      }
    }
  })

  it('group labels are not interactive', () => {
    renderSidebar()
    for (const group of NAV_GROUPS) {
      const label = screen.getByText(group.label)
      expect(label.tagName).toBe('DIV')
      expect(label.getAttribute('role')).not.toBe('button')
    }
  })

  it('highlights active link based on current path', () => {
    renderSidebar(['/archive/weapons'])
    const activeLink = screen.getByRole('link', { name: '武器档案' })
    expect(activeLink.className).toContain('text-archive-gold')
    expect(activeLink.className).toContain('bg-archive-gold/10')
  })

  it('does not highlight inactive links', () => {
    renderSidebar(['/archive/weapons'])
    const inactiveLink = screen.getByRole('link', { name: '干员档案' })
    expect(inactiveLink.className).not.toContain('text-archive-gold')
    expect(inactiveLink.className).not.toContain('bg-archive-gold/10')
  })
})
