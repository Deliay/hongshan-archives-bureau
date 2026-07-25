import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import type { Activity } from '../../lib/types'
import ActivityArchive from './ActivityArchive'

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
    sortId: 1,
    ...overrides,
  }
}

const now = Date.now()
const FIXTURE: Activity[] = [
  makeActivity({ id: 'a_ongoing', name: '进行中活动', status: 'ongoing' }),
  makeActivity({
    id: 'a_expired',
    name: '已结束活动',
    status: 'expired',
    timeRanges: [{ openTime: now - 100 * DAY, closeTime: now - 50 * DAY }],
  }),
  makeActivity({
    id: 'a_challenge',
    name: '挑战活动',
    group: 'challenge',
    status: 'ongoing',
    timeRanges: [{ openTime: now - 3 * DAY, closeTime: now + 20 * DAY }],
  }),
  makeActivity({ id: 'a_unknown', name: '无时间活动', status: 'unknown', timeRanges: [] }),
]

let mockResult: { data: Activity[] | null; loading: boolean; error: string | null } = {
  data: FIXTURE,
  loading: false,
  error: null,
}

vi.mock('../../hooks/useData', () => ({
  useActivities: () => ({ ...mockResult, refetch: vi.fn() }),
}))

function renderPage() {
  return render(
    <I18nProvider locale="CN">
      <ActivityArchive />
    </I18nProvider>,
  )
}

describe('ActivityArchive', () => {
  afterEach(() => {
    cleanup()
    mockResult = { data: FIXTURE, loading: false, error: null }
  })

  it('shows skeleton while loading', () => {
    mockResult = { data: null, loading: true, error: null }
    renderPage()
    expect(screen.getByTestId('skeleton')).toBeTruthy()
  })

  it('shows error message on failure', () => {
    mockResult = { data: null, loading: false, error: 'network' }
    renderPage()
    expect(screen.getByText(/数据加载失败/)).toBeTruthy()
  })

  it('renders ongoing activities by default and hides expired and unknown', () => {
    renderPage()
    expect(screen.getByText('进行中活动')).toBeTruthy()
    expect(screen.getByText('挑战活动')).toBeTruthy()
    expect(screen.queryByText('已结束活动')).toBeNull()
    expect(screen.queryByText('无时间活动')).toBeNull()
  })

  it('shows expired activity after enabling the expired status chip', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '已结束' }))
    expect(screen.getByText('已结束活动')).toBeTruthy()
  })

  it('hides ongoing rows when ongoing status chip is toggled off', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '进行中' }))
    expect(screen.queryByText('进行中活动')).toBeNull()
    expect(screen.queryByText('挑战活动')).toBeNull()
    expect(screen.getByText('没有符合条件的活动')).toBeTruthy()
  })

  it('filters by type group chip', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '签到' }))
    expect(screen.queryByText('进行中活动')).toBeNull()
    expect(screen.getByText('挑战活动')).toBeTruthy()
  })

  it('opens tooltip when a bar is clicked and closes it via the close button', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('gantt-bar-a_ongoing'))
    expect(screen.getAllByText('进行中活动').length).toBeGreaterThan(1)
    expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryAllByRole('dialog').length).toBe(0)
  })
})
