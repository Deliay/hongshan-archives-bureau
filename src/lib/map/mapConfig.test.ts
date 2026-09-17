import { describe, it, expect } from 'vitest'
import {
  PIXELS_PER_UNIT,
  TILE_PIXELS,
  LOD_WORLD_UNITS,
  parseLevelMapConfig,
  worldToCanvas,
  canvasSize,
  chunkRect,
  lodTileSize,
  tileUrl,
  pickLod,
  visibleChunks,
  fitView,
  clampView,
  zoomAt,
  adaptStaticElements,
  MARKER_MIN_LOD,
} from './mapConfig'
import type { LevelMapConfig, MapChunk } from './mapConfig'

const MAP01_RAW = {
  basic: {
    worldRectLeftBottom: { x: -896, y: -768 },
    worldRectRightTop: { x: 384, y: 256 },
    needInverseXZ: false,
  },
  lowChunks: {
    l_map01_lv001_1_1: {
      chunkId: 'l_map01_lv001_1_1',
      lodType: 0,
      x: 1,
      y: 1,
      worldLeftBottom: { x: -896, y: -768 },
      worldRightTop: { x: -384, y: -256 },
      grids: ['map01_lv001_1_1'],
    },
    'l_map01_lv001_2_1': {
      chunkId: 'l_map01_lv001_2_1',
      lodType: 1,
      x: 2,
      y: 1,
      worldLeftBottom: { x: -384, y: -768 },
      worldRightTop: { x: 128, y: -256 },
    },
  },
  mediumChunks: {
    m_map01_lv001_1_1: {
      chunkId: 'm_map01_lv001_1_1',
      lodType: 1,
      x: 1,
      y: 1,
      worldLeftBottom: { x: -896, y: -768 },
      worldRightTop: { x: -640, y: -512 },
    },
  },
  highChunks: {
    h_map01_lv001_1_1: {
      chunkId: 'h_map01_lv001_1_1',
      lodType: 2,
      x: 1,
      y: 1,
      worldLeftBottom: { x: -896, y: -768 },
      worldRightTop: { x: -768, y: -640 },
    },
  },
  staticElements: {
    map01_lv001_se_1: {
      id: 'map01_lv001_se_1',
      type: 1,
      position: { x: -639.7866, y: 0, z: -136.533325 },
      targetLevelId: 'map01_lv002',
      directionAngle: 150,
    },
    map01_lv001_se_10: {
      id: 'map01_lv001_se_10',
      type: 2,
      position: { x: -178.773315, y: 0, z: -605.44 },
      textId: 'scene_map01_lv001_sub01_location_tips_10',
    },
    'map01_lv001_se_unknown': { id: 'map01_lv001_se_unknown', type: 8, position: { x: 0, y: 0, z: 0 } },
    'map01_lv001_se_bad': { id: 'map01_lv001_se_bad', type: 3, position: { x: 0, y: 0, z: 0 } },
  },
}

const BASE01_RAW = {
  basic: {
    worldRectLeftBottom: { x: -256, y: -256 },
    worldRectRightTop: { x: 256, y: 256 },
    needInverseXZ: true,
  },
  lowChunks: {},
  mediumChunks: {},
  highChunks: {},
  staticElements: {
    base01_lv001_se_1: {
      id: 'base01_lv001_se_1',
      type: 2,
      position: { x: 128, y: 0, z: 0 },
      textId: 'scene_base01_lv001_tips_1',
    },
  },
}

function worldXForCanvas(canvasX: number): number {
  return -896 + canvasX / PIXELS_PER_UNIT
}

function hChunkAt(id: string, canvasLeft: number, canvasTop: number): MapChunk {
  const rty = 256 - canvasTop / PIXELS_PER_UNIT
  return {
    chunkId: id,
    x: 1,
    y: 1,
    worldLeftBottom: { x: worldXForCanvas(canvasLeft), y: rty - 128 },
    worldRightTop: { x: worldXForCanvas(canvasLeft + 600), y: rty },
  }
}

function emptyConfig(overrides: Partial<LevelMapConfig>): LevelMapConfig {
  return {
    levelId: 'test',
    worldRect: { left: -896, bottom: -768, right: 384, top: 256 },
    inverseXZ: false,
    chunks: { l: [], m: [], h: [] },
    staticElements: [],
    ...overrides,
  }
}

describe('parseLevelMapConfig', () => {
  const config = parseLevelMapConfig('map01_lv001', MAP01_RAW)

  it('maps world rect from basic', () => {
    expect(config.worldRect).toEqual({ left: -896, bottom: -768, right: 384, top: 256 })
    expect(config.inverseXZ).toBe(false)
  })

  it('converts chunk dicts to arrays', () => {
    expect(config.chunks.m.map((c) => c.chunkId)).toEqual(['m_map01_lv001_1_1'])
    expect(config.chunks.h.map((c) => c.chunkId)).toEqual(['h_map01_lv001_1_1'])
  })

  it('drops chunks whose lodType does not match their tier', () => {
    expect(config.chunks.l.map((c) => c.chunkId)).toEqual(['l_map01_lv001_1_1'])
  })

  it('filters unknown element types', () => {
    expect(config.staticElements.map((e) => e.id)).toEqual([
      'map01_lv001_se_1',
      'map01_lv001_se_10',
      'map01_lv001_se_bad',
    ])
  })

  it('drops the raw height component of positions', () => {
    expect(config.staticElements[0].position).toEqual({ x: -639.7866, z: -136.533325 })
  })
})

describe('worldToCanvas', () => {
  const config = parseLevelMapConfig('map01_lv001', MAP01_RAW)

  it('maps the world bottom-left to the canvas bottom-left', () => {
    expect(worldToCanvas(config, -896, -768)).toEqual({ x: 0, y: 4800 })
  })

  it('flips the world z axis into canvas y', () => {
    const point = worldToCanvas(config, -639.7866, -136.533325)
    expect(point.x).toBeCloseTo(1201)
    expect(point.y).toBeCloseTo(1840)
  })

  it('negates both axes when needInverseXZ is set', () => {
    const base = parseLevelMapConfig('base01_lv001', BASE01_RAW)
    expect(worldToCanvas(base, 256, 256)).toEqual({ x: 0, y: 2400 })
    expect(worldToCanvas(base, -256, -256)).toEqual({ x: 2400, y: 0 })
  })
})

describe('canvasSize / lodTileSize / chunkRect', () => {
  const config = parseLevelMapConfig('map01_lv001', MAP01_RAW)

  it('computes canvas size from the world rect', () => {
    expect(canvasSize(config)).toEqual({ width: 6000, height: 4800 })
  })

  it('sizes tiles per lod tier', () => {
    expect(lodTileSize('h')).toBe(600)
    expect(lodTileSize('m')).toBe(1200)
    expect(lodTileSize('l')).toBe(2400)
    expect(PIXELS_PER_UNIT).toBeCloseTo(TILE_PIXELS / LOD_WORLD_UNITS.h)
  })

  it('anchors the first low chunk at the top-left of the covered area', () => {
    const first = config.chunks.l[0]
    expect(chunkRect(config, first, 'l')).toEqual({ left: 0, top: 2400, size: 2400 })
  })
})

describe('tileUrl', () => {
  it('strips underscores from the level id and uses the levelmap path', () => {
    expect(tileUrl('map01_lv001', 'h_map01_lv001_1_1')).toBe(
      'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/textures/levelmap/levelmapchunks/map01lv001/h_map01_lv001_1_1.png',
    )
  })
})

describe('pickLod', () => {
  it('selects the lowest tier that covers the requested display scale', () => {
    expect(pickLod(0.1)).toBe('l')
    expect(pickLod(0.25)).toBe('l')
    expect(pickLod(0.3)).toBe('m')
    expect(pickLod(0.5)).toBe('m')
    expect(pickLod(0.51)).toBe('h')
    expect(pickLod(1)).toBe('h')
  })
})

describe('visibleChunks', () => {
  const config = emptyConfig({
    chunks: {
      l: [],
      m: [],
      h: [
        hChunkAt('visible', 0, 4200),
        hChunkAt('far', 1200, 4200),
        hChunkAt('margin', 1000, 4200),
      ],
    },
  })

  it('keeps only chunks intersecting the viewport (plus one tile of margin)', () => {
    const view = { scale: 1, offsetX: 0, offsetY: -4200 }
    const result = visibleChunks(config.chunks.h, config, 'h', view, { width: 600, height: 600 })
    expect(result.map((c) => c.chunkId)).toEqual(['visible', 'margin'])
  })

  it('excludes chunks more than one tile beyond the viewport', () => {
    const view = { scale: 1, offsetX: 0, offsetY: -4200 }
    const result = visibleChunks(config.chunks.h, config, 'h', view, { width: 600, height: 600 })
    expect(result.map((c) => c.chunkId)).not.toContain('far')
  })
})

describe('fitView / clampView', () => {
  it('fits and centers a wide canvas', () => {
    const view = fitView(6000, 4800, 600, 400)
    expect(view.scale).toBeCloseTo(1 / 12)
    expect(view.offsetX).toBeCloseTo(50)
    expect(view.offsetY).toBeCloseTo(0)
  })

  it('centers a canvas smaller than the viewport', () => {
    expect(clampView({ scale: 1, offsetX: 999, offsetY: 999 }, 100, 100, 600, 400)).toEqual({
      scale: 1,
      offsetX: 250,
      offsetY: 150,
    })
  })

  it('clamps a large canvas to its bounds', () => {
    const config = emptyConfig({})
    const size = canvasSize(config)
    expect(clampView({ scale: 1, offsetX: -10000, offsetY: 500 }, size.width, size.height, 600, 400)).toEqual({
      scale: 1,
      offsetX: -5400,
      offsetY: 0,
    })
  })
})

describe('zoomAt', () => {
  it('keeps the canvas point under the pointer fixed', () => {
    const before = { scale: 0.5, offsetX: -100, offsetY: -200 }
    const after = zoomAt(before, 1, 300, 200)
    const canvasXBefore = (300 - before.offsetX) / before.scale
    const canvasYBefore = (200 - before.offsetY) / before.scale
    expect((300 - after.offsetX) / after.scale).toBeCloseTo(canvasXBefore)
    expect((200 - after.offsetY) / after.scale).toBeCloseTo(canvasYBefore)
  })
})

describe('adaptStaticElements', () => {
  it('resolves place names through TextTable and the table dictionary', () => {
    const config = parseLevelMapConfig('map01_lv001', MAP01_RAW)
    const markers = adaptStaticElements(config, {
      textTable: { scene_map01_lv001_sub01_location_tips_10: { id: '8869186797471693286', text: '' } },
      textDict: { '8869186797471693286': '山地顶端' },
      regionName: (id) => (id === 'map01_lv002' ? '源石原野' : ''),
    })
    const place = markers.find((m) => m.id === 'map01_lv001_se_10')
    expect(place?.kind).toBe('place-name')
    expect(place?.label).toBe('山地顶端')
    expect(place?.canvas.x).toBeCloseTo(3362)
    expect(place?.canvas.y).toBeCloseTo(4038)
    const entrance = markers.find((m) => m.id === 'map01_lv001_se_1')
    expect(entrance?.kind).toBe('level-entrance')
    expect(entrance?.label).toBe('源石原野')
    expect(entrance?.directionAngle).toBe(150)
  })

  it('degrades to an empty label when the text chain is broken', () => {
    const config = parseLevelMapConfig('map01_lv001', MAP01_RAW)
    const markers = adaptStaticElements(config, { textTable: {}, textDict: {} })
    const place = markers.find((m) => m.id === 'map01_lv001_se_10')
    expect(place?.label).toBe('')
  })

  it('resolves settlement names via String(id) lookup', () => {
    const config = emptyConfig({
      staticElements: [
        {
          id: 'se_settlement',
          type: 4,
          position: { x: -690, z: -552 },
          settlementId: 'stm_tundra_1',
        },
      ],
    })
    const markers = adaptStaticElements(config, {
      settlementTable: { stm_tundra_1: { settlementName: { id: '-4547946061020742596', text: '' } } },
      settlementDict: { '-4547946061020742596': '苔原定居点' },
    })
    expect(markers[0].kind).toBe('settlement')
    expect(markers[0].label).toBe('苔原定居点')
  })

  it('exposes lod display thresholds per marker kind', () => {
    expect(MARKER_MIN_LOD['place-name']).toBe('h')
    expect(MARKER_MIN_LOD['level-entrance']).toBe('l')
  })
})
