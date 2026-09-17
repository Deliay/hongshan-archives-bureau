import { ASSET_BASE, resolveI18n } from '../adapter'

export type MapLod = 'l' | 'm' | 'h'

export const TILE_PIXELS = 600
export const LOD_WORLD_UNITS: Record<MapLod, number> = { l: 512, m: 256, h: 128 }
export const PIXELS_PER_UNIT = TILE_PIXELS / LOD_WORLD_UNITS.h

export const LOD_ORDER: Record<MapLod, number> = { l: 0, m: 1, h: 2 }

const LOD_TYPE: Record<MapLod, number> = { l: 0, m: 1, h: 2 }
const VALID_TYPES = new Set([1, 2, 3, 4, 5, 6, 7, 8])

export interface LevelMapConfig {
  levelId: string
  worldRect: { left: number; bottom: number; right: number; top: number }
  inverseXZ: boolean
  chunks: Record<MapLod, MapChunk[]>
  staticElements: StaticMapElement[]
  tiers: MapTier[]
  tierTextureRects: Record<string, TierRect>
}

export interface TierRect {
  left: number
  top: number
  width: number
  height: number
}

export interface MapTier {
  tierId: number
  textId?: string
  rects: TierRect[]
}

export interface MapChunk {
  chunkId: string
  x: number
  y: number
  worldLeftBottom: { x: number; y: number }
  worldRightTop: { x: number; y: number }
  tiers: Record<string, string>
}

export interface StaticMapElement {
  id: string
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  position: { x: number; z: number }
  textId?: string
  targetLevelId?: string
  directionAngle?: number
  settlementId?: string
  isPermanent?: boolean
  displayTierId: number
  defaultVisible: boolean
  defaultImgPath?: string
}

export interface MapView {
  scale: number
  offsetX: number
  offsetY: number
}

export type MapMarkerKind = 'level-entrance' | 'place-name' | 'region' | 'settlement' | 'tier-switch' | 'poi' | 'static-image'

export interface MapMarker {
  id: string
  kind: MapMarkerKind
  canvas: { x: number; y: number }
  label: string
  targetLevelId?: string
  directionAngle?: number
  tierId: number
  typeKey: string
  typeLabel?: string
  defaultVisible: boolean
  icon?: string
  imagePath?: string
  categoryId?: number | null
  categoryName?: string
  categorySortId?: number
}

export const MARKER_MIN_LOD: Record<MapMarkerKind, MapLod> = {
  'level-entrance': 'l',
  settlement: 'l',
  'tier-switch': 'm',
  region: 'm',
  'place-name': 'h',
  poi: 'l',
  'static-image': 'm',
}

export const STATIC_KIND_KEYS: Record<Exclude<MapMarkerKind, 'poi'>, string> = {
  'level-entrance': 'map.markerKind.levelEntrance',
  'place-name': 'map.markerKind.placeName',
  region: 'map.markerKind.region',
  settlement: 'map.markerKind.settlement',
  'tier-switch': 'map.markerKind.tierSwitch',
  'static-image': 'map.markerKind.staticImage',
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
      tiers: (c.tiers && typeof c.tiers === 'object'
        ? Object.fromEntries(Object.entries(c.tiers).filter(([, v]) => typeof v === 'string'))
        : {}) as Record<string, string>,
    }))
}

const KIND_BY_TYPE: Record<number, MapMarkerKind> = {
  1: 'level-entrance',
  2: 'place-name',
  3: 'region',
  4: 'settlement',
  5: 'region',
  6: 'region',
  7: 'tier-switch',
  8: 'static-image',
}

function toCanvasRect(lb: any, rt: any, worldRect: LevelMapConfig['worldRect']): TierRect {
  return {
    left: (num(lb.x) - worldRect.left) * PIXELS_PER_UNIT,
    top: (worldRect.top - num(rt.y)) * PIXELS_PER_UNIT,
    width: (num(rt.x) - num(lb.x)) * PIXELS_PER_UNIT,
    height: (num(rt.y) - num(lb.y)) * PIXELS_PER_UNIT,
  }
}

function parseTiers(raw: any, worldRect: LevelMapConfig['worldRect']): { tiers: MapTier[]; textureRects: Record<string, TierRect> } {
  const tiers = new Map<number, MapTier>()
  const textureRects: Record<string, TierRect> = {}
  for (const [tierIdStr, textId] of Object.entries(raw?.tierNames ?? {})) {
    const tierId = Number(tierIdStr)
    if (!Number.isFinite(tierId)) continue
    tiers.set(tierId, { tierId, textId: typeof textId === 'string' ? textId : undefined, rects: [] })
  }
  for (const info of Object.values(raw?.tierInfos ?? {})) {
    const entry = info as any
    const tierId = entry?.tierId
    if (typeof tierId !== 'number') continue
    if (!tiers.has(tierId)) tiers.set(tierId, { tierId, rects: [] })
    const lb = entry.worldLeftBottom
    const rt = entry.worldRightTop
    if (!lb || !rt) continue
    const rect = toCanvasRect(lb, rt, worldRect)
    tiers.get(tierId)!.rects.push(rect)
    if (typeof entry.tierLoadId === 'string') textureRects[entry.tierLoadId] = rect
  }
  return { tiers: [...tiers.values()].sort((a, b) => a.tierId - b.tierId), textureRects }
}

export function parseLevelMapConfig(levelId: string, raw: any): LevelMapConfig {
  const basic = raw?.basic ?? {}
  const chunks: LevelMapConfig['chunks'] = {
    l: parseChunks(raw?.lowChunks, 'l'),
    m: parseChunks(raw?.mediumChunks, 'm'),
    h: parseChunks(raw?.highChunks, 'h'),
  }
  const worldRect = {
    left: num(basic.worldRectLeftBottom?.x),
    bottom: num(basic.worldRectLeftBottom?.y),
    right: num(basic.worldRectRightTop?.x),
    top: num(basic.worldRectRightTop?.y),
  }
  const { tiers, textureRects } = parseTiers(raw, worldRect)
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
      displayTierId: typeof e.displayTierId === 'number' ? e.displayTierId : 0,
      defaultVisible: e.defaultVisible !== false,
      defaultImgPath: typeof e.defaultImgPath === 'string' ? e.defaultImgPath : undefined,
    }))
  return {
    levelId,
    worldRect,
    inverseXZ: !!basic.needInverseXZ,
    chunks,
    staticElements,
    tiers,
    tierTextureRects: textureRects,
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

export function tierTileUrl(levelId: string, textureId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/levelmap/levelmaptiers/${levelId.replaceAll('_', '')}/${textureId}.png`
}

export function markIconUrl(icon: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/map/markiconsmall/${icon}.png`
}

export function staticElementImageUrl(path: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/map/commonstaticelement/${path}.png`
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
      tierId: el.displayTierId,
      typeKey: kind,
      defaultVisible: el.type === 8 ? el.defaultVisible : true,
      imagePath: el.defaultImgPath,
      categoryId: null,
    }
  })
}

export interface PoiSources {
  insRaw?: Record<string, any>
  tempRaw?: Record<string, any>
  typeRaw?: Record<string, any>
  categoryRaw?: Record<string, any>
  tempDict?: Record<string, string>
  typeDict?: Record<string, string>
  categoryDict?: Record<string, string>
}

export function adaptPoiMarkers(config: LevelMapConfig, levelId: string, sources: PoiSources = {}): MapMarker[] {
  const markers: MapMarker[] = []
  for (const value of Object.values(sources.insRaw ?? {})) {
    const ins = value as any
    if (!ins || ins.levelId !== levelId) continue
    const temp = sources.tempRaw?.[ins.markInfoId]
    const tempName = temp ? resolveI18n(temp.name, sources.tempDict) : ''
    const markInfoType = typeof temp?.markInfoType === 'number' ? temp.markInfoType : null
    const typeDef = markInfoType !== null ? sources.typeRaw?.[String(markInfoType)] : undefined
    const categoryId = typeof typeDef?.category === 'number' ? typeDef.category : null
    const category = categoryId !== null ? sources.categoryRaw?.[String(categoryId)] : undefined
    const typeLabel = typeDef ? resolveI18n(typeDef.name, sources.typeDict) : tempName
    markers.push({
      id: String(ins.markInsId ?? `${levelId}_${ins.markInfoId}`),
      kind: 'poi',
      canvas: worldToCanvas(config, num(ins.pos?.x), num(ins.pos?.z)),
      label: tempName,
      tierId: 0,
      typeKey: `poi:${markInfoType ?? ins.markInfoId}`,
      typeLabel: typeLabel || tempName || String(ins.markInfoId ?? ''),
      defaultVisible: temp?.defaultVisible !== false,
      icon: temp?.activeIcon ? markIconUrl(temp.activeIcon) : undefined,
      categoryId,
      categoryName: categoryId !== null ? resolveI18n(category?.name, sources.categoryDict) : '',
      categorySortId: typeof category?.sortId === 'number' ? category.sortId : 999,
    })
  }
  return markers
}

export interface TierTile extends TierRect {
  chunkId: string
  textureId: string
}

export function tierTiles(
  config: LevelMapConfig,
  lod: MapLod,
  tierId: number,
  view: MapView,
  viewport: { width: number; height: number },
): TierTile[] {
  if (view.scale <= 0) return []
  const viewLeft = -view.offsetX / view.scale
  const viewTop = -view.offsetY / view.scale
  const viewRight = viewLeft + viewport.width / view.scale
  const viewBottom = viewTop + viewport.height / view.scale
  const seen = new Set<string>()
  const tiles: TierTile[] = []
  for (const chunk of visibleChunks(config.chunks[lod], config, lod, view, viewport)) {
    const textureId = chunk.tiers[String(tierId)]
    if (!textureId || seen.has(textureId)) continue
    seen.add(textureId)
    const rect = config.tierTextureRects[textureId] ?? chunkRect(config, chunk)
    const intersects = rect.left < viewRight && rect.left + rect.width > viewLeft
      && rect.top < viewBottom && rect.top + rect.height > viewTop
    if (!intersects) continue
    tiles.push({ chunkId: chunk.chunkId, textureId, ...rect })
  }
  return tiles
}
