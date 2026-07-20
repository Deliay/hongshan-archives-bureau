import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../../lib/locale'
import { I18nProvider } from '../../i18n'
import Sidebar from './Sidebar'

vi.mock('../../hooks/useData', () => ({
  useI18nLocales: () => ({ data: ['CN', 'EN', 'JP', 'MX', 'TH'], loading: false, error: null, refetch: vi.fn() }),
}))

const NAV_GROUPS_CN = [
  { label: '人事档案', items: ['干员', '干员种族', '干员阵营'] },
  { label: '威胁档案', items: ['威胁图鉴'] },
  { label: '物资档案', items: ['道具材料', '武器图鉴', '装备图鉴', '工厂系统'] },
  { label: '地理档案', items: ['地区地理'] },
  { label: '大事记', items: ['档案搜索', '教学记录', '更新日志'] },
]

const NAV_GROUPS_EN = [
  { label: 'Personnel Files', items: ['Operators', 'Operator Races', 'Operator Factions'] },
  { label: 'Material Files', items: ['Item Files', 'Weapon Files', 'Gear Files', 'Factory System'] },
  { label: 'Geography Files', items: ['Area Geography'] },
  { label: 'Chronicle', items: ['Archive Search', 'Tutorials', 'Update Logs'] },
]

function renderSidebar(locale = 'CN', initialEntries: string[] = ['/archive']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LocaleProvider>
        <I18nProvider locale={locale}>
          <Sidebar />
        </I18nProvider>
      </LocaleProvider>
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all group labels and navigation links in CN', () => {
    renderSidebar('CN')
    for (const group of NAV_GROUPS_CN) {
      expect(screen.getByText(group.label)).toBeTruthy()
      for (const item of group.items) {
        expect(screen.getByRole('link', { name: item })).toBeTruthy()
      }
    }
  })

  it('renders all group labels and navigation links in EN', () => {
    renderSidebar('EN')
    for (const group of NAV_GROUPS_EN) {
      const labels = screen.getAllByText(group.label)
      expect(labels.length).toBeGreaterThanOrEqual(1)
      for (const item of group.items) {
        const links = screen.queryAllByRole('link', { name: item })
        expect(links.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('group labels are not interactive', () => {
    renderSidebar('CN')
    for (const group of NAV_GROUPS_CN) {
      const label = screen.getByText(group.label)
      expect(label.tagName).toBe('DIV')
      expect(label.getAttribute('role')).not.toBe('button')
    }
  })

  it('highlights active link based on current path', () => {
    renderSidebar('CN', ['/archive/weapons'])
    const activeLink = screen.getByRole('link', { name: '武器图鉴' })
    expect(activeLink.className).toContain('text-archive-gold')
    expect(activeLink.className).toContain('bg-archive-gold/10')
  })

  it('does not highlight inactive links', () => {
    renderSidebar('CN', ['/archive/weapons'])
    const inactiveLink = screen.getByRole('link', { name: '干员' })
    expect(inactiveLink.className).not.toContain('text-archive-gold')
    expect(inactiveLink.className).not.toContain('bg-archive-gold/10')
  })
})
