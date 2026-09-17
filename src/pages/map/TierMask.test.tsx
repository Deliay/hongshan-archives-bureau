import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import TierMask from './TierMask'
import type { LevelMapConfig } from '../../lib/map/mapConfig'

function config(): LevelMapConfig {
  return {
    levelId: 'test',
    worldRect: { left: 0, bottom: 0, right: 256, top: 256 },
    inverseXZ: false,
    chunks: { l: [], m: [], h: [] },
    staticElements: [],
    tiers: [{ tierId: 171, rects: [{ left: 600, top: 600, width: 300, height: 300 }] }],
    tierTextureRects: {},
  }
}

describe('TierMask', () => {
  afterEach(() => cleanup())

  it('renders dark cells outside the active tier rect', () => {
    const { getAllByTestId } = render(
      <div style={{ position: 'relative', width: 1200, height: 1200 }}>
        <TierMask config={config()} tierId={171} />
      </div>,
    )
    const masks = getAllByTestId('tier-mask')
    expect(masks.length).toBeGreaterThan(0)
    for (const mask of masks) {
      const left = Number.parseFloat(mask.style.left)
      const top = Number.parseFloat(mask.style.top)
      const width = Number.parseFloat(mask.style.width)
      const height = Number.parseFloat(mask.style.height)
      const overlaps = left < 900 && left + width > 600 && top < 900 && top + height > 600
      expect(overlaps).toBe(false)
    }
  })

  it('renders nothing for an unknown tier', () => {
    const { queryAllByTestId } = render(<TierMask config={config()} tierId={999} />)
    expect(queryAllByTestId('tier-mask')).toHaveLength(0)
  })
})
