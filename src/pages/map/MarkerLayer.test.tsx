import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../../lib/locale'
import { I18nProvider } from '../../i18n'
import MarkerLayer from './MarkerLayer'
import type { MapMarker } from '../../lib/map/mapConfig'

const markers: MapMarker[] = [
  { id: 'entrance', kind: 'level-entrance', canvas: { x: 100, y: 200 }, label: '目标区域', targetLevelId: 'map01_lv002', directionAngle: 90 },
  { id: 'place', kind: 'place-name', canvas: { x: 300, y: 400 }, label: '山地顶端' },
  { id: 'blank', kind: 'place-name', canvas: { x: 500, y: 600 }, label: '' },
  { id: 'region', kind: 'region', canvas: { x: 700, y: 800 }, label: '' },
]

function renderLayer(scale: number, regionIds = new Set(['map01_lv002']), onSelectRegion = vi.fn()) {
  render(
    <MemoryRouter>
      <LocaleProvider>
        <I18nProvider locale="CN">
          <MarkerLayer markers={markers} scale={scale} regionIds={regionIds} onSelectRegion={onSelectRegion} />
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
    expect(screen.getByText('山地顶端')).toBeTruthy()
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
})
