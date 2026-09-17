import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../../lib/locale'
import { I18nProvider } from '../../i18n'
import MapViewerPage from './MapViewerPage'
import type { LevelMapConfig } from '../../lib/map/mapConfig'
import { useMapConfig, useMapRegionList } from '../../hooks/useData'

vi.mock('../../hooks/useData', () => ({
  useMapRegionList: vi.fn(),
  useMapConfig: vi.fn(),
}))

const mockRegionList = vi.mocked(useMapRegionList)
const mockMapConfig = vi.mocked(useMapConfig)

const GROUPS = [
  {
    mapId: 'map01',
    name: '四号谷地',
    regions: [
      { levelId: 'map01_lv001', name: '区域一' },
      { levelId: 'map01_lv002', name: '区域二' },
    ],
  },
  { mapId: null, name: '', regions: [{ levelId: 'dung01_wrdg001', name: '特殊区域' }] },
]

function fakeConfig(levelId: string): LevelMapConfig {
  return {
    levelId,
    worldRect: { left: 0, bottom: 0, right: 128, top: 128 },
    inverseXZ: false,
    chunks: {
      l: [],
      m: [],
      h: [{ chunkId: `h_${levelId}`, x: 1, y: 1, worldLeftBottom: { x: 0, y: 0 }, worldRightTop: { x: 128, y: 128 } }],
    },
    staticElements: [],
    tiers: [],
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <I18nProvider locale="CN">
          <MapViewerPage />
        </I18nProvider>
      </LocaleProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  mockRegionList.mockReturnValue({ data: GROUPS, loading: false, error: null, refetch: vi.fn() })
  mockMapConfig.mockImplementation((levelId) => ({
    data: levelId ? { config: fakeConfig(levelId), markers: [], tiers: [] } : null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MapViewerPage', () => {
  it('renders grouped region names and selects the first region by default', async () => {
    renderPage()
    expect(screen.getByText('四号谷地')).toBeTruthy()
    expect(screen.getByText('特殊区域')).toBeTruthy()
    await waitFor(() => expect(mockMapConfig).toHaveBeenCalledWith('map01_lv001'))
  })

  it('requests the corresponding config when a region is selected', async () => {
    renderPage()
    await waitFor(() => expect(mockMapConfig).toHaveBeenCalledWith('map01_lv001'))
    fireEvent.click(screen.getByRole('button', { name: '区域二' }))
    await waitFor(() => expect(mockMapConfig).toHaveBeenCalledWith('map01_lv002'))
  })

  it('shows an unavailable placeholder and does not crash when config is missing', async () => {
    mockMapConfig.mockReturnValue({ data: null, loading: false, error: 'failed', refetch: vi.fn() })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('map-unavailable')).toBeTruthy())
  })

  it('shows an unavailable placeholder when no high-resolution chunks exist', async () => {
    mockMapConfig.mockImplementation((levelId) => ({
      data: levelId
        ? { config: { ...fakeConfig(levelId), chunks: { l: [], m: [], h: [] } }, markers: [], tiers: [] }
        : null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    }))
    renderPage()
    await waitFor(() => expect(screen.getByTestId('map-unavailable')).toBeTruthy())
  })
})
