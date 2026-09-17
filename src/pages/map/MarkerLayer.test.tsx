import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../../lib/locale'
import { I18nProvider } from '../../i18n'
import MarkerLayer from './MarkerLayer'
import type { MapMarker } from '../../lib/map/mapConfig'

const markers: MapMarker[] = [
  { id: 'entrance', kind: 'level-entrance', canvas: { x: 100, y: 200 }, label: '目标区域', targetLevelId: 'map01_lv002', directionAngle: 90, tierId: 0, typeKey: 'level-entrance', defaultVisible: true },
  { id: 'place', kind: 'place-name', canvas: { x: 300, y: 400 }, label: '山地顶端', tierId: 0, typeKey: 'place-name', defaultVisible: true },
  { id: 'blank', kind: 'place-name', canvas: { x: 500, y: 600 }, label: '', tierId: 0, typeKey: 'place-name', defaultVisible: true },
  { id: 'region', kind: 'region', canvas: { x: 700, y: 800 }, label: '', tierId: 0, typeKey: 'region', defaultVisible: true },
  { id: 'poi', kind: 'poi', canvas: { x: 900, y: 100 }, label: '协议传送点', typeKey: 'poi:10', defaultVisible: true, tierId: 0, icon: 'https://example.com/icon.png' },
]

function renderLayer(
  scale: number,
  regionIds = new Set(['map01_lv002']),
  onSelectRegion = vi.fn(),
  hiddenKeys = new Set<string>(),
  activeTier: number | null = null,
) {
  render(
    <MemoryRouter>
      <LocaleProvider>
        <I18nProvider locale="CN">
          <MarkerLayer
            markers={markers}
            scale={scale}
            regionIds={regionIds}
            onSelectRegion={onSelectRegion}
            hiddenKeys={hiddenKeys}
            activeTier={activeTier}
          />
        </I18nProvider>
      </LocaleProvider>
    </MemoryRouter>,
  )
  return onSelectRegion
}

describe('MarkerLayer', () => {
  afterEach(() => cleanup())

  it('positions markers with the canvas coordinates', () => {
    renderLayer(1)
    const entrance = screen.getAllByTestId('map-marker')[0]
    expect(entrance.style.left).toBe('100px')
    expect(entrance.style.top).toBe('200px')
  })

  it('hides place names at low lod tiers and shows them when zoomed in', () => {
    renderLayer(0.3)
    expect(screen.queryAllByText('山地顶端')).toHaveLength(0)
    cleanup()
    renderLayer(0.6)
    expect(screen.getAllByText('山地顶端').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a dot instead of text when a place name label is empty', () => {
    renderLayer(0.6)
    const blank = screen.getAllByTestId('map-marker').find((el) => el.getAttribute('data-kind') === 'place-name' && el.textContent === '')
    expect(blank).toBeTruthy()
  })

  it('invokes the region callback when a clickable entrance is activated', () => {
    const onSelect = renderLayer(1)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('map01_lv002')
  })

  it('does not render a button when the entrance target is not in the region list', () => {
    renderLayer(1, new Set())
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders place names with the stroked text component', () => {
    renderLayer(0.6)
    const place = screen.getAllByTestId('map-marker').find((el) => el.getAttribute('data-kind') === 'place-name')
    expect(place?.querySelector('.stroked-text__stroke')).toBeTruthy()
  })

  it('hides markers whose type key is toggled off', () => {
    renderLayer(1, new Set(['map01_lv002']), vi.fn(), new Set(['region']))
    const kinds = screen.getAllByTestId('map-marker').map((el) => el.getAttribute('data-kind'))
    expect(kinds).not.toContain('region')
  })

  it('filters tier-bound markers when a layer is active', () => {
    const tiered: MapMarker[] = [
      { id: 'all', kind: 'place-name', canvas: { x: 0, y: 0 }, label: 'A', tierId: 0, typeKey: 'place-name', defaultVisible: true },
      { id: 't1', kind: 'place-name', canvas: { x: 10, y: 0 }, label: 'B', tierId: 171, typeKey: 'place-name', defaultVisible: true },
      { id: 't2', kind: 'place-name', canvas: { x: 20, y: 0 }, label: 'C', tierId: 172, typeKey: 'place-name', defaultVisible: true },
    ]
    render(
      <MemoryRouter>
        <LocaleProvider>
          <I18nProvider locale="CN">
            <MarkerLayer markers={tiered} scale={0.6} regionIds={new Set()} onSelectRegion={vi.fn()} hiddenKeys={new Set()} activeTier={171} />
          </I18nProvider>
        </LocaleProvider>
      </MemoryRouter>,
    )
    const ids = screen.getAllByTestId('map-marker').map((el) => el.textContent)
    expect(ids.some((text) => text?.includes('A'))).toBe(true)
    expect(ids.some((text) => text?.includes('B'))).toBe(true)
    expect(ids.some((text) => text?.includes('C'))).toBe(false)
  })

  it('renders poi markers at every lod tier', () => {
    renderLayer(0.1)
    expect(screen.getAllByTestId('map-marker').some((el) => el.getAttribute('data-kind') === 'poi')).toBe(true)
  })
})
