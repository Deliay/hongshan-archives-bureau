import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import type { Activity } from '../../lib/types'
import ActivityTooltip from './ActivityTooltip'
import { formatActivityTime } from './timeFormat'

const DAY = 86400000

function makeActivity(overrides: Partial<Activity>): Activity {
  const now = Date.now()
  return {
    id: 'act_x',
    name: '活动X',
    desc: '活动描述文本',
    type: 2,
    group: 'checkin',
    status: 'ongoing',
    timeRanges: [{ openTime: now - 10 * DAY, closeTime: now + 10 * DAY }],
    tags: ['限时签到'],
    tabImg: 'https://example.com/tab.png',
    tabImgColor: '',
    sortId: 1,
    ...overrides,
  }
}

function renderTooltip(activity: Activity, onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <I18nProvider locale="CN">
        <ActivityTooltip activity={activity} onClose={onClose} />
      </I18nProvider>,
    ),
  }
}

describe('formatActivityTime', () => {
  it('displays wall clock in UTC+8', () => {
    expect(formatActivityTime(Date.UTC(2025, 11, 8, 20, 0, 0))).toBe('2025/12/9 04:00')
    expect(formatActivityTime(Date.UTC(2026, 6, 26, 16, 30, 0))).toBe('2026/7/27 00:30')
  })
})

describe('ActivityTooltip', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders name, badges, time range, desc and tags', () => {
    const a = makeActivity({ id: 'a1' })
    renderTooltip(a)
    expect(screen.getByText('活动X')).toBeTruthy()
    expect(screen.getByText('签到')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
    expect(screen.getByText('活动描述文本')).toBeTruthy()
    expect(screen.getByText('限时签到')).toBeTruthy()
    const open = formatActivityTime(a.timeRanges[0].openTime)
    expect(screen.getByText(new RegExp(open.replace(/\//g, '\\/')))).toBeTruthy()
  })

  it('shows permanent label for open-ended range', () => {
    const now = Date.now()
    const a = makeActivity({ id: 'a2', status: 'permanent', timeRanges: [{ openTime: now - DAY, closeTime: null }] })
    renderTooltip(a)
    expect(screen.getByText(/~ 常驻/)).toBeTruthy()
  })

  it('shows unknownTime when timeRanges is empty', () => {
    const a = makeActivity({ id: 'a3', status: 'unknown', timeRanges: [] })
    renderTooltip(a)
    expect(screen.getAllByText('时间未知').length).toBeGreaterThan(0)
  })

  it('hides desc and tags sections when empty', () => {
    const a = makeActivity({ id: 'a4', desc: '', tags: [] })
    renderTooltip(a)
    expect(screen.queryByText('活动描述文本')).toBeNull()
    expect(screen.queryByText('活动标签')).toBeNull()
  })

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderTooltip(makeActivity({ id: 'a5' }))
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay backdrop is clicked', () => {
    const { onClose } = renderTooltip(makeActivity({ id: 'a6' }))
    const dialogs = screen.getAllByRole('dialog')
    fireEvent.click(dialogs[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when panel content is clicked', () => {
    const { onClose } = renderTooltip(makeActivity({ id: 'a7' }))
    fireEvent.click(screen.getByText('活动X'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
