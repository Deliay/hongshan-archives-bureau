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
  adaptPoiMarkers,
  tierTiles,
  tierTileUrl,
  complementRects,
  tierFitView,
  markIconUrl,
  staticElementImageUrl,
  MARKER_MIN_LOD,
} from './mapConfig'
import type { LevelMapConfig, MapChunk, PoiSources } from './mapConfig'

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
    'map01_lv001_se_unknown': { id: 'map01_lv001_se_unknown', type: 99, position: { x: 0, y: 0, z: 0 } },
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

function hChunkAt(id: string, canvasLeft: number, canvasTop: number, worldWidth = 128, worldHeight = 128): MapChunk {
  const rty = 256 - canvasTop / PIXELS_PER_UNIT
  const lbx = worldXForCanvas(canvasLeft)
  return {
    chunkId: id,
    x: 1,
    y: 1,
    worldLeftBottom: { x: lbx, y: rty - worldHeight },
    worldRightTop: { x: lbx + worldWidth, y: rty },
    tiers: {},
  }
}

function emptyConfig(overrides: Partial<LevelMapConfig>): LevelMapConfig {
  return {
    levelId: 'test',
    worldRect: { left: -896, bottom: -768, right: 384, top: 256 },
    inverseXZ: false,
    chunks: { l: [], m: [], h: [] },
    staticElements: [],
    tiers: [],
    tierTextureRects: {},
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
    expect(chunkRect(config, first)).toEqual({ left: 0, top: 2400, width: 2400, height: 2400 })
  })

  it('sizes partial edge chunks by their real world extent (no square stretch)', () => {
    const config = emptyConfig({})
    const partial = hChunkAt('partial', 0, 4200, 256, 512)
    const rect = chunkRect(config, partial)
    expect(rect.left).toBeCloseTo(0)
    expect(rect.width).toBeCloseTo(1200)
    expect(rect.height).toBeCloseTo(2400)
  })

  it('keeps fractional chunk extents proportional', () => {
    const config = emptyConfig({
      worldRect: { left: -1792, bottom: -512, right: -1408, top: -128 },
      chunks: { l: [], m: [], h: [] },
    })
    const fractional: MapChunk = {
      chunkId: 'l_indie_dg005_1_1',
      x: 1,
      y: 1,
      worldLeftBottom: { x: -1792, y: -512 },
      worldRightTop: { x: -1406.3, y: -126.3 },
      tiers: {},
    }
    const rect = chunkRect(config, fractional)
    expect(rect.width).toBeCloseTo(385.7 * PIXELS_PER_UNIT)
    expect(rect.height).toBeCloseTo(385.7 * PIXELS_PER_UNIT)
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
          displayTierId: 0,
          defaultVisible: true,
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

describe('static element types 5 / 8', () => {
  const raw = {
    basic: { worldRectLeftBottom: { x: 0, y: 0 }, worldRectRightTop: { x: 256, y: 256 } },
    lowChunks: {},
    mediumChunks: {},
    highChunks: {},
    staticElements: {
      five: { id: 'se5', type: 5, position: { x: 0, y: 0, z: 0 }, displayTierId: 0, defaultVisible: true },
      two: { id: 'se2', type: 2, position: { x: 0, y: 0, z: 0 }, displayTierId: 0, defaultVisible: false },
      eight: {
        id: 'se8',
        type: 8,
        position: { x: 128, y: 0, z: 64 },
        displayTierId: 171,
        defaultVisible: false,
        defaultImgPath: 'map02_lv008_bridge_1',
      },
    },
  }

  it('keeps type 5 as a generic region dot', () => {
    const config = parseLevelMapConfig('lv', raw)
    const marker = adaptStaticElements(config).find((m) => m.id === 'se5')
    expect(marker?.kind).toBe('region')
    expect(marker?.typeKey).toBe('region')
    expect(marker?.defaultVisible).toBe(true)
  })

  it('keeps non-image static elements visible by default regardless of raw defaultVisible', () => {
    const config = parseLevelMapConfig('lv', raw)
    const marker = adaptStaticElements(config).find((m) => m.id === 'se2')
    expect(marker?.defaultVisible).toBe(true)
  })

  it('keeps type 8 as a state image with tier and default visibility', () => {
    const config = parseLevelMapConfig('lv', raw)
    const marker = adaptStaticElements(config).find((m) => m.id === 'se8')
    expect(marker?.kind).toBe('static-image')
    expect(marker?.imagePath).toBe('map02_lv008_bridge_1')
    expect(marker?.tierId).toBe(171)
    expect(marker?.defaultVisible).toBe(false)
  })
})

describe('parseLevelMapConfig tiers', () => {
  const raw = {
    basic: {
      worldRectLeftBottom: { x: -256, y: -256 },
      worldRectRightTop: { x: 256, y: 256 },
      isSingleLevel: false,
    },
    lowChunks: {},
    mediumChunks: {},
    highChunks: {},
    staticElements: {},
    tierNames: { '171': 'scene_a_layer_tips_1', '172': 'scene_a_layer_tips_2' },
    tierInfos: {
      'h_a_1_1_tier_171': {
        tierId: 171,
        worldLeftBottom: { x: -256, y: -256 },
        worldRightTop: { x: -128, y: -128 },
      },
      'h_a_2_1_tier_171': {
        tierId: 171,
        worldLeftBottom: { x: -128, y: -256 },
        worldRightTop: { x: 0, y: -128 },
      },
      'h_a_1_1_tier_179': {
        tierId: 179,
        worldLeftBottom: { x: -256, y: -256 },
        worldRightTop: { x: -128, y: -128 },
      },
    },
  }

  it('parses tier names, rects and keeps info-only tiers', () => {
    const config = parseLevelMapConfig('a', raw)
    expect(config.tiers.map((tier) => tier.tierId)).toEqual([171, 172, 179])
    const t171 = config.tiers[0]
    expect(t171.textId).toBe('scene_a_layer_tips_1')
    expect(t171.rects).toHaveLength(2)
    expect(t171.rects[0].left).toBe(0)
    expect(t171.rects[0].width).toBeCloseTo(128 * PIXELS_PER_UNIT)
    expect(config.tiers[1].rects).toHaveLength(0)
  })

  it('returns no tiers for single-layer maps', () => {
    const single = parseLevelMapConfig('b', { ...raw, tierNames: {}, tierInfos: {}, basic: { ...raw.basic, isSingleLevel: true } })
    expect(single.tiers).toEqual([])
  })

})

describe('chunk.tiers parsing and tier tiles', () => {
  const raw = {
    basic: {
      worldRectLeftBottom: { x: 0, y: 0 },
      worldRectRightTop: { x: 1024, y: 512 },
      needInverseXZ: false,
    },
    lowChunks: {
      l_a_1_1: {
        chunkId: 'l_a_1_1',
        lodType: 0,
        x: 1,
        y: 1,
        worldLeftBottom: { x: 0, y: 0 },
        worldRightTop: { x: 512, y: 512 },
        tiers: { '171': 'l_tier_171', '174': 'l_tier_174' },
      },
      l_a_2_1: {
        chunkId: 'l_a_2_1',
        lodType: 0,
        x: 2,
        y: 1,
        worldLeftBottom: { x: 512, y: 0 },
        worldRightTop: { x: 1024, y: 512 },
        tiers: { '171': 'l_tier_171' },
      },
    },
    mediumChunks: {},
    highChunks: {
      h_a_1_1: {
        chunkId: 'h_a_1_1',
        lodType: 2,
        x: 1,
        y: 1,
        worldLeftBottom: { x: 0, y: 0 },
        worldRightTop: { x: 128, y: 128 },
        tiers: { '173': 'h_a_1_1_tier_173' },
      },
    },
    staticElements: {},
    tierNames: { '171': 't171', '173': 't173', '174': 't174' },
    tierInfos: {
      l_tier_171: {
        tierLoadId: 'l_tier_171',
        tierId: 171,
        worldLeftBottom: { x: 0, y: 427.52 },
        worldRightTop: { x: 46.9333528, y: 512 },
      },
      l_tier_174: {
        tierLoadId: 'l_tier_174',
        tierId: 174,
        worldLeftBottom: { x: 0, y: 0 },
        worldRightTop: { x: 512, y: 512 },
      },
      h_a_1_1_tier_173: {
        tierLoadId: 'h_a_1_1_tier_173',
        tierId: 173,
        worldLeftBottom: { x: 0, y: 0 },
        worldRightTop: { x: 128, y: 128 },
      },
    },
  }

  it('reads per-chunk tier texture ids and drops non-string values', () => {
    const config = parseLevelMapConfig('a', raw)
    expect(config.chunks.l[0].tiers).toEqual({ '171': 'l_tier_171', '174': 'l_tier_174' })
    expect(config.chunks.l[1].tiers).toEqual({ '171': 'l_tier_171' })
    expect(config.chunks.h[0].tiers).toEqual({ '173': 'h_a_1_1_tier_173' })
  })

  it('maps tier texture ids to their tierInfos rect', () => {
    const config = parseLevelMapConfig('a', raw)
    const rect = config.tierTextureRects.l_tier_171
    expect(rect.width).toBeCloseTo(46.9333528 * PIXELS_PER_UNIT)
    expect(rect.height).toBeCloseTo(84.480011 * PIXELS_PER_UNIT)
  })

  it('builds tier texture urls under sprites/levelmap/levelmaptiers', () => {
    expect(tierTileUrl('map01_lv001', 'l_tier_173')).toBe(
      'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/levelmap/levelmaptiers/map01lv001/l_tier_173.png',
    )
  })

  it('dedupes a texture shared by multiple chunks and uses the tierInfos rect', () => {
    const config = parseLevelMapConfig('a', raw)
    const view = { scale: 1, offsetX: 0, offsetY: 0 }
    const viewport = { width: 600, height: 600 }
    const tiles = tierTiles(config, 'l', 171, view, viewport)
    expect(tiles).toHaveLength(1)
    expect(tiles[0].textureId).toBe('l_tier_171')
    expect(tiles[0].width).toBeCloseTo(46.9333528 * PIXELS_PER_UNIT)
    expect(tiles[0].width).not.toBeCloseTo(512 * PIXELS_PER_UNIT)
  })

  it('falls back to the chunk rect when a texture is absent from tierInfos', () => {
    const config = parseLevelMapConfig('a', { ...raw, tierInfos: {} })
    const view = { scale: 1, offsetX: 0, offsetY: 0 }
    const viewport = { width: 600, height: 600 }
    const tiles = tierTiles(config, 'l', 171, view, viewport)
    expect(tiles).toHaveLength(1)
    expect(tiles[0].width).toBeCloseTo(512 * PIXELS_PER_UNIT)
  })

  it('selects tiles per tier and lod', () => {
    const config = parseLevelMapConfig('a', raw)
    const view = { scale: 1, offsetX: 0, offsetY: 0 }
    const viewport = { width: 600, height: 600 }
    expect(tierTiles(config, 'l', 174, view, viewport)).toHaveLength(1)
    expect(tierTiles(config, 'l', 999, view, viewport)).toHaveLength(0)
    const hTiles = tierTiles(config, 'h', 173, { scale: 1, offsetX: 0, offsetY: -1800 }, viewport)
    expect(hTiles).toHaveLength(1)
    expect(hTiles[0].width).toBeCloseTo(128 * PIXELS_PER_UNIT)
  })
})

describe('complementRects', () => {
  it('splits a canvas around a single rectangular hole', () => {
    const rects = complementRects(100, 100, [{ left: 20, top: 30, width: 40, height: 50 }])
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0)
    expect(area).toBeCloseTo(100 * 100 - 40 * 50)
    const coversHole = rects.some((rect) => rect.left <= 20 && rect.top <= 30 && rect.left + rect.width >= 60 && rect.top + rect.height >= 80)
    expect(coversHole).toBe(false)
  })

  it('handles multiple and overlapping holes without covering them', () => {
    const holes = [
      { left: 10, top: 10, width: 30, height: 30 },
      { left: 25, top: 25, width: 30, height: 30 },
    ]
    const rects = complementRects(100, 100, holes)
    for (const rect of rects) {
      const overlaps = holes.some((hole) => rect.left < hole.left + hole.width && rect.left + rect.width > hole.left && rect.top < hole.top + hole.height && rect.top + rect.height > hole.top)
      expect(overlaps).toBe(false)
    }
  })

  it('returns the whole canvas when there are no holes', () => {
    expect(complementRects(100, 50, [])).toEqual([{ left: 0, top: 0, width: 100, height: 50 }])
  })
})

describe('tierFitView', () => {
  const rects = [{ left: 1000, top: 400, width: 200, height: 400 }]

  it('centers the tier bounding box and applies padding', () => {
    const view = tierFitView(rects, { width: 1000, height: 800 }, { minScale: 0.1, maxScale: 2 })
    expect(view).not.toBeNull()
    // scale = min(1000*0.9/200, 800*0.9/400) = min(4.5, 1.8) = 1.8
    expect(view!.scale).toBeCloseTo(1.8)
    expect(view!.offsetX).toBeCloseTo(500 - 1100 * 1.8)
    expect(view!.offsetY).toBeCloseTo(400 - 600 * 1.8)
  })

  it('clamps the scale into the allowed range', () => {
    const small = tierFitView([{ left: 0, top: 0, width: 10, height: 10 }], { width: 1000, height: 800 }, { minScale: 0.2, maxScale: 1 })
    expect(small!.scale).toBe(1)
    const large = tierFitView([{ left: 0, top: 0, width: 10000, height: 10000 }], { width: 1000, height: 800 }, { minScale: 0.3, maxScale: 1 })
    expect(large!.scale).toBe(0.3)
  })

  it('returns null for empty rects or viewport', () => {
    expect(tierFitView([], { width: 100, height: 100 }, { minScale: 0.1, maxScale: 1 })).toBeNull()
    expect(tierFitView(rects, { width: 0, height: 100 }, { minScale: 0.1, maxScale: 1 })).toBeNull()
  })
})

describe('adaptPoiMarkers', () => {
  const config = emptyConfig({})
  const sources: PoiSources = {
    insRaw: {
      camp1: { markInsId: 'camp1', levelId: 'map01_lv001', markInfoId: 'mark_sp_campfire', pos: { x: -435.3924, y: 92.75, z: -497.6 } },
      other: { markInsId: 'other', levelId: 'map01_lv002', markInfoId: 'mark_sp_campfire', pos: { x: 0, y: 0, z: 0 } },
      arrow: { markInsId: 'arrow1', levelId: 'map01_lv001', markInfoId: 'mark_arrow', pos: { x: 24.3, y: 1.72, z: -19.73 } },
    },
    tempRaw: {
      mark_sp_campfire: { markInfoId: 'mark_sp_campfire', activeIcon: 'icon_map_campfire', name: { id: '-2121041299115105838', text: '' }, markInfoType: 10, markType: 8, defaultVisible: true },
    },
    typeRaw: { '17': { category: 3, name: { id: '7895377814877820927', text: '' } } },
    categoryRaw: { '3': { category: 3, name: { id: '3469853632634058657', text: '' }, sortId: 2 } },
    tempDict: { '-2121041299115105838': '协议传送点' },
    typeDict: { '7895377814877820927': '集中矿点' },
    categoryDict: { '3469853632634058657': '资源' },
  }

  it('only returns instances of the requested level', () => {
    const markers = adaptPoiMarkers(config, 'map01_lv001', sources)
    expect(markers.map((m) => m.id)).toEqual(['camp1', 'arrow1'])
  })

  it('resolves the campfire name, icon and defaults', () => {
    const marker = adaptPoiMarkers(config, 'map01_lv001', sources)[0]
    expect(marker.kind).toBe('poi')
    expect(marker.label).toBe('协议传送点')
    expect(marker.icon).toBe('https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/map/markiconsmall/icon_map_campfire.png')
    expect(marker.defaultVisible).toBe(true)
    expect(marker.typeKey).toBe('poi:10')
  })

  it('falls back gracefully when the mark template is unknown', () => {
    const marker = adaptPoiMarkers(config, 'map01_lv001', sources).find((m) => m.id === 'arrow1')
    expect(marker?.icon).toBeUndefined()
    expect(marker?.typeKey).toBe('poi:mark_arrow')
    expect(marker?.categoryId).toBeNull()
  })

  it('resolves category metadata for typed marks', () => {
    const typedSources: PoiSources = {
      insRaw: { mine1: { markInsId: 'mine1', levelId: 'lv', markInfoId: 'mark_mine', pos: { x: 0, y: 0, z: 0 } } },
      tempRaw: { mark_mine: { activeIcon: 'icon_map_mine', name: { id: '1', text: '' }, markInfoType: 17, defaultVisible: false } },
      typeRaw: sources.typeRaw,
      categoryRaw: sources.categoryRaw,
      typeDict: sources.typeDict,
      categoryDict: sources.categoryDict,
    }
    const marker = adaptPoiMarkers(config, 'lv', typedSources)[0]
    expect(marker.categoryId).toBe(3)
    expect(marker.categoryName).toBe('资源')
    expect(marker.typeLabel).toBe('集中矿点')
    expect(marker.defaultVisible).toBe(false)
  })
})

describe('mark icon / static image urls', () => {
  it('builds mark icon and static element urls', () => {
    expect(markIconUrl('icon_map_campfire')).toContain('/sprites/map/markiconsmall/icon_map_campfire.png')
    expect(staticElementImageUrl('map02_lv008_bridge_1')).toContain('/sprites/map/commonstaticelement/map02_lv008_bridge_1.png')
  })
})
