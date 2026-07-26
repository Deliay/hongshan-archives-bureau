import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import type { Activity } from '../../lib/types'
import ActivityGantt from './ActivityGantt'

const DAY = 86400000

function makeActivity(overrides: Partial<Activity>): Activity {
  const now = Date.now()
  return {
    id: 'act_x',
    name: '活动X',
    desc: '',
    type: 2,
    group: 'checkin',
    status: 'ongoing',
    timeRanges: [{ openTime: now - 10 * DAY, closeTime: now + 10 * DAY }],
    tags: [],
    tabImg: '',
    tabImgColor: '',
    rewardId: '',
    sortId: 1,
    ...overrides,
  }
}

function renderGantt(activities: Activity[], onSelect = vi.fn()) {
  return {
    onSelect,
    ...render(
      <I18nProvider locale="CN">
        <ActivityGantt activities={activities} onSelect={onSelect} />
      </I18nProvider>,
    ),
  }
}

describe('ActivityGantt', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders one row per activity with name', () => {
    const now = Date.now()
    const activities = [
      makeActivity({ id: 'a1', name: '活动甲' }),
      makeActivity({ id: 'a2', name: '活动乙', status: 'expired', timeRanges: [{ openTime: now - 100 * DAY, closeTime: now - 50 * DAY }] }),
    ]
    renderGantt(activities)
    expect(screen.getByText('活动甲')).toBeTruthy()
    expect(screen.getByText('活动乙')).toBeTruthy()
  })

  it('renders multiple bars for multi-range activity', () => {
    const now = Date.now()
    const a = makeActivity({
      id: 'multi',
      timeRanges: [
        { openTime: now - 30 * DAY, closeTime: now - 20 * DAY },
        { openTime: now - 5 * DAY, closeTime: now + 5 * DAY },
      ],
    })
    renderGantt([a])
    expect(screen.getAllByTestId('gantt-bar-multi').length).toBe(2)
  })

  it('sorts rows by status priority then openTime', () => {
    const now = Date.now()
    const expired = makeActivity({ id: 'a_exp', name: '已结束活动', status: 'expired', timeRanges: [{ openTime: now - 100 * DAY, closeTime: now - 50 * DAY }] })
    const ongoing = makeActivity({ id: 'a_ong', name: '进行中活动', status: 'ongoing' })
    const upcoming = makeActivity({ id: 'a_up', name: '未开始活动', status: 'upcoming', timeRanges: [{ openTime: now + 5 * DAY, closeTime: now + 15 * DAY }] })
    renderGantt([expired, upcoming, ongoing])
    const rowIds = screen.getAllByTestId('activity-row').map(
      (row) => row.querySelector('[data-testid^="gantt-bar-"]')?.getAttribute('data-testid'),
    )
    expect(rowIds).toEqual(['gantt-bar-a_ong', 'gantt-bar-a_up', 'gantt-bar-a_exp'])
  })


  it('shows date range on non-permanent bars', () => {
    const a = makeActivity({
      id: 'dated',
      timeRanges: [{ openTime: Date.UTC(2025, 11, 8, 20, 0, 0), closeTime: Date.UTC(2026, 1, 7, 4, 0, 0) }],
    })
    renderGantt([a])
    expect(screen.getByText('2025/12/9 ~ 2026/2/7')).toBeTruthy()
  })

  it('does not show date range on permanent bars', () => {
    const a = makeActivity({
      id: 'perm',
      status: 'permanent',
      timeRanges: [{ openTime: Date.now() - 10 * DAY, closeTime: null }],
    })
    renderGantt([a])
    expect(screen.queryByText(/~/)).toBeNull()
  })

  it('renders today line when now is within axis', () => {
    renderGantt([makeActivity({ id: 'a1' })])
    expect(screen.getByTestId('gantt-today-line')).toBeTruthy()
  })

  it('dims expired bars', () => {
    const now = Date.now()
    const a = makeActivity({ id: 'old', status: 'expired', timeRanges: [{ openTime: now - 100 * DAY, closeTime: now - 50 * DAY }] })
    renderGantt([a])
    expect(screen.getByTestId('gantt-bar-old').className).toContain('opacity-40')
  })

  it('calls onSelect with the activity when a bar is clicked', () => {
    const a = makeActivity({ id: 'click', name: '可点活动' })
    const { onSelect } = renderGantt([a])
    fireEvent.click(screen.getByTestId('gantt-bar-click'))
    expect(onSelect).toHaveBeenCalledWith(a)
  })
})
