import { ASSET_BASE, resolveI18n } from '../adapter'

export type MapLod = 'l' | 'm' | 'h'

export const TILE_PIXELS = 600
export const LOD_WORLD_UNITS: Record<MapLod, number> = { l: 512, m: 256, h: 128 }
export const PIXELS_PER_UNIT = TILE_PIXELS / LOD_WORLD_UNITS.h

export const LOD_ORDER: Record<MapLod, number> = { l: 0, m: 1, h: 2 }

const LOD_TYPE: Record<MapLod, number> = { l: 0, m: 1, h: 2 }
const VALID_TYPES = new Set([1, 2, 3, 4, 6, 7])

export interface LevelMapConfig {
  levelId: string
  worldRect: { left: number; bottom: number; right: number; top: number }
  inverseXZ: boolean
  chunks: Record<MapLod, MapChunk[]>
  staticElements: StaticMapElement[]
}

export interface MapChunk {
  chunkId: string
  x: number
  y: number
  worldLeftBottom: { x: number; y: number }
  worldRightTop: { x: number; y: number }
}

export interface StaticMapElement {
  id: string
  type: 1 | 2 | 3 | 4 | 6 | 7
  position: { x: number; z: number }
  textId?: string
  targetLevelId?: string
  directionAngle?: number
  settlementId?: string
  isPermanent?: boolean
}

export interface MapView {
  scale: number
  offsetX: number
  offsetY: number
}

export type MapMarkerKind = 'level-entrance' | 'place-name' | 'region' | 'settlement' | 'tier-switch'

export interface MapMarker {
  id: string
  kind: MapMarkerKind
  canvas: { x: number; y: number }
  label: string
  targetLevelId?: string
  directionAngle?: number
}

export const MARKER_MIN_LOD: Record<MapMarkerKind, MapLod> = {
  'level-entrance': 'l',
  settlement: 'l',
  'tier-switch': 'm',
  region: 'm',
  'place-name': 'h',
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseChunks(raw: any, lod: MapLod): MapChunk[] {
  const expected = LOD_TYPE[lod]
  return Object.values(raw ?? {})
    .filter((c: any) => c && typeof c.chunkId === 'string' && c.lodType === expected)
    .map((c: any) => ({
      chunkId: c.chunkId,
      x: num(c.x),
      y: num(c.y),
      worldLeftBottom: { x: num(c.worldLeftBottom?.x), y: num(c.worldLeftBottom?.y) },
      worldRightTop: { x: num(c.worldRightTop?.x), y: num(c.worldRightTop?.y) },
    }))
}

const KIND_BY_TYPE: Record<number, MapMarkerKind> = {
  1: 'level-entrance',
  2: 'place-name',
  3: 'region',
  4: 'settlement',
  6: 'region',
  7: 'tier-switch',
}

export function parseLevelMapConfig(levelId: string, raw: any): LevelMapConfig {
  const basic = raw?.basic ?? {}
  const chunks: LevelMapConfig['chunks'] = {
    l: parseChunks(raw?.lowChunks, 'l'),
    m: parseChunks(raw?.mediumChunks, 'm'),
    h: parseChunks(raw?.highChunks, 'h'),
  }
  const staticElements: StaticMapElement[] = Object.values(raw?.staticElements ?? {})
    .filter((e: any) => e && VALID_TYPES.has(e.type))
    .map((e: any) => ({
      id: String(e.id ?? ''),
      type: e.type,
      position: { x: num(e.position?.x), z: num(e.position?.z) },
      textId: typeof e.textId === 'string' ? e.textId : undefined,
      targetLevelId: typeof e.targetLevelId === 'string' ? e.targetLevelId : undefined,
      directionAngle: typeof e.directionAngle === 'number' ? e.directionAngle : undefined,
      settlementId: typeof e.settlementId === 'string' ? e.settlementId : undefined,
      isPermanent: e.isPermanent,
    }))
  return {
    levelId,
    worldRect: {
      left: num(basic.worldRectLeftBottom?.x),
      bottom: num(basic.worldRectLeftBottom?.y),
      right: num(basic.worldRectRightTop?.x),
      top: num(basic.worldRectRightTop?.y),
    },
    inverseXZ: !!basic.needInverseXZ,
    chunks,
    staticElements,
  }
}

export function worldToCanvas(config: LevelMapConfig, wx: number, wz: number): { x: number; y: number } {
  const x = config.inverseXZ ? -wx : wx
  const z = config.inverseXZ ? -wz : wz
  return {
    x: (x - config.worldRect.left) * PIXELS_PER_UNIT,
    y: (config.worldRect.top - z) * PIXELS_PER_UNIT,
  }
}

export function canvasSize(config: LevelMapConfig): { width: number; height: number } {
  return {
    width: (config.worldRect.right - config.worldRect.left) * PIXELS_PER_UNIT,
    height: (config.worldRect.top - config.worldRect.bottom) * PIXELS_PER_UNIT,
  }
}

export function lodTileSize(lod: MapLod): number {
  return LOD_WORLD_UNITS[lod] * PIXELS_PER_UNIT
}

export function chunkRect(config: LevelMapConfig, chunk: MapChunk): { left: number; top: number; width: number; height: number } {
  return {
    left: (chunk.worldLeftBottom.x - config.worldRect.left) * PIXELS_PER_UNIT,
    top: (config.worldRect.top - chunk.worldRightTop.y) * PIXELS_PER_UNIT,
    width: (chunk.worldRightTop.x - chunk.worldLeftBottom.x) * PIXELS_PER_UNIT,
    height: (chunk.worldRightTop.y - chunk.worldLeftBottom.y) * PIXELS_PER_UNIT,
  }
}

export function tileUrl(levelId: string, chunkId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/levelmap/levelmapchunks/${levelId.replaceAll('_', '')}/${chunkId}.png`
}

export function pickLod(scale: number): MapLod {
  if (scale <= 0.25) return 'l'
  if (scale <= 0.5) return 'm'
  return 'h'
}

export function visibleChunks(
  chunks: MapChunk[],
  config: LevelMapConfig,
  lod: MapLod,
  view: MapView,
  viewport: { width: number; height: number },
): MapChunk[] {
  if (view.scale <= 0) return chunks
  const size = lodTileSize(lod)
  const left = -view.offsetX / view.scale
  const top = -view.offsetY / view.scale
  const right = left + viewport.width / view.scale
  const bottom = top + viewport.height / view.scale
  return chunks.filter((chunk) => {
    const rect = chunkRect(config, chunk)
    return (
      rect.left < right + size &&
      rect.left + rect.width > left - size &&
      rect.top < bottom + size &&
      rect.top + rect.height > top - size
    )
  })
}

export function fitView(canvasW: number, canvasH: number, viewportW: number, viewportH: number): MapView {
  if (canvasW <= 0 || canvasH <= 0 || viewportW <= 0 || viewportH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 }
  }
  const scale = Math.min(viewportW / canvasW, viewportH / canvasH)
  return {
    scale,
    offsetX: (viewportW - canvasW * scale) / 2,
    offsetY: (viewportH - canvasH * scale) / 2,
  }
}

export function clampView(
  view: MapView,
  canvasW: number,
  canvasH: number,
  viewportW: number,
  viewportH: number,
): MapView {
  const scaledW = canvasW * view.scale
  const scaledH = canvasH * view.scale
  const offsetX = scaledW <= viewportW
    ? (viewportW - scaledW) / 2
    : Math.min(0, Math.max(viewportW - scaledW, view.offsetX))
  const offsetY = scaledH <= viewportH
    ? (viewportH - scaledH) / 2
    : Math.min(0, Math.max(viewportH - scaledH, view.offsetY))
  return { scale: view.scale, offsetX, offsetY }
}

export function zoomAt(view: MapView, nextScale: number, px: number, py: number): MapView {
  const k = nextScale / view.scale
  return {
    scale: nextScale,
    offsetX: px - (px - view.offsetX) * k,
    offsetY: py - (py - view.offsetY) * k,
  }
}

export interface MarkerSources {
  textTable?: Record<string, any>
  textDict?: Record<string, string>
  settlementTable?: Record<string, any>
  settlementDict?: Record<string, string>
  regionName?: (levelId: string) => string
}

function resolveTextLabel(textId: string | undefined, sources: MarkerSources): string {
  if (!textId) return ''
  const entry = sources.textTable?.[textId]
  if (!entry || entry.id === undefined || entry.id === null) return ''
  return sources.textDict?.[String(entry.id)] ?? ''
}

function resolveSettlementLabel(settlementId: string | undefined, sources: MarkerSources): string {
  if (!settlementId) return ''
  const entry = sources.settlementTable?.[settlementId]
  if (!entry) return ''
  return resolveI18n(entry.settlementName, sources.settlementDict)
}

function resolveTargetLabel(targetLevelId: string | undefined, sources: MarkerSources): string {
  if (!targetLevelId) return ''
  return sources.regionName?.(targetLevelId) ?? ''
}

export function adaptStaticElements(config: LevelMapConfig, sources: MarkerSources = {}): MapMarker[] {
  return config.staticElements.map((el) => {
    const kind = KIND_BY_TYPE[el.type] ?? 'region'
    let label = ''
    if (el.type === 2) label = resolveTextLabel(el.textId, sources)
    else if (el.type === 4) label = resolveSettlementLabel(el.settlementId, sources)
    else if (el.type === 1 || el.type === 7) label = resolveTargetLabel(el.targetLevelId, sources)
    return {
      id: el.id,
      kind,
      canvas: worldToCanvas(config, el.position.x, el.position.z),
      label,
      targetLevelId: el.targetLevelId,
      directionAngle: el.directionAngle,
    }
  })
}
