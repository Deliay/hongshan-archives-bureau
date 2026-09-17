---
description: 地图浏览器实现方案 — 数据验证结论、mapConfig 算法细节、页面组件与布局例外、分阶段实施与测试计划
type: Fleeting
---

# 地图浏览器 - 实现方案

**对应产品文档**: [[20260917-map-viewer|地图浏览器 PRD]]
**对应技术方案**: [[20260917-map-viewer|地图浏览器技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-09-17
**作者**: Kimi Code
**需求总分支**: `feat/map-viewer`
**开发分支**: `feat/map-viewer-impl`（基于 `feat/map-viewer`，遵循 `feat/<slug>-impl` 先例）

## 1. 概述

### 1.1 目标

按技术提案落地 `/archive/map` 地图浏览模块：21 个关卡地图分组切换、连续缩放（l/m/h 三档自动切换）与拖拽平移、静态标注（地名/关卡入口/定居点/跨层切换）按世界坐标叠加。复用现有 `api.ts → cache.ts → useData.ts` 数据链路与 CDN 优选，无 contract 变更、无新增依赖。

### 1.2 范围

- **做**：`src/lib/map/mapConfig.ts`（配置解析/坐标换算/LOD/标注适配）、`api.ts` 新增 `fetchJsonDataRaw`、`useData.ts` 新增两个 Hook、`src/pages/map/` 六个组件、路由与四处入口注册、`ArchiveLayout` 全幅例外、i18n 文案（14 语言）、单元/组件/E2E 测试。
- **不做**（同提案）：迷雾遮罩、分层叠加、跨层连线、`MapMarkInsTable` 动态 POI、用户编辑能力、移动端触控专项优化。

### 1.3 数据验证结论（对技术提案的确认与修正）

实现前已对数据服务（内网镜像，接口与线上一致）逐项抽样验证，提案中的数据链路全部成立，四处细节修正如下。

**已确认**：

| 项 | 结论 |
|---|---|
| 关卡清单 | `LoadListConfig.json` → `{ loadLevelList: [21 个 levelId] }`（注意字段名为 `loadLevelList`） |
| 单关卡配置 | top keys：`basic / staticElements / tierNames / lowChunks / mediumChunks / highChunks / gridInfos / mistInfos / tierInfos` |
| 世界矩形 | `basic.worldRectLeftBottom/RightTop` = `{x, y}`（`y` 即世界 z 轴）；map01_lv001 为 (-896,-768)→(384,256) = 1280×1024 世界单位 |
| 瓦片档位 | 每块 600×600 px；l/m/h 档每块覆盖 512/256/128 世界单位（`lodType` 0/1/2 ↔ l/m/h） |
| 瓦片响应 | GET 200，`Content-Type: image/webp`，600×600，`Cache-Control: max-age=604800` + Etag；目录名为 levelId 去下划线（`map01lv001`） |
| needInverseXZ | base01_lv001 为 `true`，矩形 (-256,-256)→(256,256)，h 档 16 块 |
| 标注 | type 1 带 `targetLevelId`+`directionAngle`；type 2 带 `textId`；type 4 带 `settlementId`；type 7 带 `targetLevelId`+`targetLevelSpriteName`；`position` = `{x, y, z}`（y 为高度，忽略） |
| 区域名/分组名 | `LevelDescTable[levelId].showName.id`、`MapIdTable[mapId].showName.id` 均为数值 id，走现有表字典接口；dung/indie 等特殊关卡（如 indie_dg005、dung01_wrdg001）在 LevelDescTable 均有条目 |
| 标注模板 | `MapMarkTempTable` 292 条，含 `activeIcon`/`name{id}`/`markType`/`sortOrder` 等 |

**修正 1：textId 文案解析路径已确定，无需求 hash（提案 §5.4 难点消除）**。

提案假设 `staticElements[].textId` 字符串需要还原 64 位 hash 才能翻译，实测存在直通路径：

```
textId（如 scene_map01_lv001_sub01_location_tips_10）
  → TextTable[textId].id            （TextTable 以字符串 id 为键，22506 条，条目形如 { id: 8869186797471693286, text: "" }）
  → I18nDict TextTable[String(id)]  （/i18n/dict/{locale}/table/TextTable/all，22383 条）
  → 文案（CN "山地顶端" / EN "Mountain Top" ✓ 14 语言随站点切换）
```

即复用现有 `getTableI18nDict('TextTable', locale)` + `resolveI18n` 模式，一次表请求 + 一次字典请求即可解析全部地名，FNV 等 hash 假设均已证伪且不再需要。`tierNames` 的字符串 id 同理可解（本期不展示）。

**修正 2：chunks / staticElements 为 dict 而非数组**。

`lowChunks/mediumChunks/highChunks` 是以 `chunkId` 为键的对象（chunk 内含 `chunkId/lodType/x/y/worldCenter/worldLeftBottom/worldRightTop/grids/mists/tiers`），`staticElements` 是以元素 id 为键的对象。解析时 `Object.values()`。提案 §4 数据模型的数组形态相应修正（见 §3.2）。

**修正 3：LOD 选择规则公式化**。

提案描述为「默认加载 m 档全景」，本方案改为按分辨率匹配推导（见 §3.2），目标一致（全景不拉高价瓦片、放大自动切清晰档），且阈值可单测。

**修正 4：布局全幅例外的具体方案**。

`ArchiveLayout` 的 `<main>` 带 `max-w-7xl mx-auto px-4` 且有 `Breadcrumb`/`Footer`，与「画布占满侧边栏外剩余区域」冲突。方案见 §3.5：按路由前缀对 `/archive/map` 例外处理，不动其他页面。

**标注图标决策**：自绘 CSS/SVG 图标（圆点、方向箭头、文字标签），不引入 `MapMarkTempTable` 图标关联（staticElements 无 `markTempId` 字段，关联路径不确定）；type 7 的 `targetLevelSpriteName` 经 Bundle 搜索确认为 switchmask 遮罩图（`/sprites/levelmap/switchmask/…`），不是标注图标，弃用。标注视觉与游戏近似即可，PRD 验收点是「位置一致、多语言」，不要求图标与游戏一致。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/map/mapConfig.ts` | 类型、配置解析、坐标换算、LOD 规则、瓦片 URL、可见块计算、视图钳制、标注适配 |
| `src/lib/map/mapConfig.test.ts` | 上述纯函数单元测试（同目录并置，跟随 `lib/factory/chain.test.ts` 先例） |
| `src/pages/map/MapViewerPage.tsx` | 页面装配：区域列表 + 画布 + 状态 |
| `src/pages/map/RegionPicker.tsx` | 分组区域列表 |
| `src/pages/map/MapCanvas.tsx` | 缩放平移容器（wheel/拖拽/双击、钳制、LOD 双档叠加） |
| `src/pages/map/TileLayer.tsx` | 瓦片层（可见块渲染） |
| `src/pages/map/MarkerLayer.tsx` | 标注层（位置联动、反向缩放、分档显隐） |
| `src/pages/map/ZoomControls.tsx` | 缩放控件 |
| `src/pages/map/MarkerLayer.test.tsx` | 标注层组件测试 |
| `src/pages/map/MapViewerPage.test.tsx` | 页面组件测试（mock hooks） |
| `tests/e2e/tests/map.spec.ts` | E2E 关键路径 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/api.ts` | 新增 `fetchJsonDataRaw(path)`；`fetchMissionDetail` 改为委托（一行） |
| `src/hooks/useData.ts` | 文件末尾新增 `// ---------- 地图 ----------` 分区：`useMapRegionList`、`useMapConfig` |
| `src/App.tsx` | 注册 `/archive/map` 懒加载路由 |
| `src/components/Layout/ArchiveLayout.tsx` | `/archive/map` 全幅例外（去 max-w/padding/Breadcrumb/Footer，高度约束改为视口） |
| `src/components/Layout/Sidebar.tsx` | geography 组新增地图入口 |
| `src/components/Layout/Breadcrumb.tsx` | `useListLabel` 新增 `map` 段映射 |
| `src/routes/ArchiveHome.tsx` | `useModuleGroups` 新增地图模块条目 |
| `src/data/archiveMeta.ts` | `MODULE_CODES` 新增 `map: 'HSA-MAP'`（若 ArchiveHome 条目使用） |
| `scripts/i18n-custom.json` | 新增 `nav.map`、`nav.mapDesc`、`map.*`、`api.fetchingMapData`（14 语言） |
| `src/components/Layout/Sidebar.test.tsx` | 同步硬编码分组断言 |
| `tests/e2e/tests/navigation.spec.ts`、`archive-home.spec.ts` | 若断言模块清单则同步 |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 数据层：`fetchJsonDataRaw`（api.ts）

照 `fetchMissionDetail`（api.ts:140）现有模式，泛化为任意 JsonData raw 路径：

```typescript
export async function fetchJsonDataRaw(path: string): Promise<any> {
  return trackFetch('正在加载地图数据', () => fetchJson(`${getApiBase()}/vfs/JsonData/raw/${path}`), 'api.fetchingMapData')
}
```

- 自动获得 `safeParse`（≥17 位数字转字符串，防 64 位 id 精度丢失）、CDN 失败计数切换、加载提示与重试。
- `fetchMissionDetail` 内部改为 `fetchJsonDataRaw(\`Data/Json/MissionRuntimeAsset/${missionId}.json\`)`，行为不变。
- 瓦片/图标不进 `fetch`，URL 一律用 `ASSET_BASE`（adapter.ts:6，随 CDN 切换）拼接后交给 `<img>`。

### 3.2 地图配置模块（`src/lib/map/mapConfig.ts`）

全部为纯函数，可单测。

**常量与数据模型**（修正后）：

```typescript
export type MapLod = 'l' | 'm' | 'h'

export const TILE_PIXELS = 600
export const LOD_WORLD_UNITS: Record<MapLod, number> = { l: 512, m: 256, h: 128 }
// 画布基准坐标系 = h 档原生分辨率
export const PIXELS_PER_UNIT = TILE_PIXELS / LOD_WORLD_UNITS.h // 4.6875

export interface LevelMapConfig {
  levelId: string
  worldRect: { left: number; bottom: number; right: number; top: number } // y 即世界 z
  inverseXZ: boolean
  chunks: Record<MapLod, MapChunk[]>
  staticElements: StaticMapElement[]
}

export interface MapChunk {
  chunkId: string              // 如 h_map01_lv001_1_1，即瓦片文件名（去 .png）
  x: number; y: number         // 1 起始，仅调试用
  worldLeftBottom: { x: number; y: number }
  worldRightTop: { x: number; y: number }
}

export interface StaticMapElement {
  id: string
  type: 1 | 2 | 3 | 4 | 6 | 7
  position: { x: number; z: number } // 原始 position.y（高度）丢弃
  textId?: string
  targetLevelId?: string
  directionAngle?: number
  settlementId?: string
  isPermanent?: boolean
}

export interface MapView { scale: number; offsetX: number; offsetY: number }

export interface MapMarker {
  id: string
  kind: 'level-entrance' | 'place-name' | 'region' | 'settlement' | 'tier-switch'
  canvas: { x: number; y: number }   // h 基准画布坐标
  label: string                      // 已解析文案，解析失败为 ''
  targetLevelId?: string
  directionAngle?: number
}
```

**解析** `parseLevelMapConfig(levelId, raw)`：

- `worldRect`：`left = basic.worldRectLeftBottom.x`、`bottom = basic.worldRectLeftBottom.y`、`right = basic.worldRectRightTop.x`、`top = basic.worldRectRightTop.y`。
- `chunks`：`{ l: Object.values(raw.lowChunks), m: …, h: … }`，仅保留所需字段；用 `lodType`（0/1/2）交叉校验所属档位，不一致时丢弃该块（防御数据异常）。
- `staticElements`：`Object.values`，过滤未知 type。

**坐标换算**：

```typescript
export function worldToCanvas(config: LevelMapConfig, wx: number, wz: number) {
  const x = config.inverseXZ ? -wx : wx
  const z = config.inverseXZ ? -wz : wz
  return {
    x: (x - config.worldRect.left) * PIXELS_PER_UNIT,
    y: (config.worldRect.top - z) * PIXELS_PER_UNIT, // 世界 y（z 轴）向上，画布 y 向下，翻转
  }
}

export function canvasSize(config: LevelMapConfig) {
  return {
    width: (config.worldRect.right - config.worldRect.left) * PIXELS_PER_UNIT,
    height: (config.worldRect.top - config.worldRect.bottom) * PIXELS_PER_UNIT,
  }
}
```

要点：瓦片定位**不做**取反——chunk 自带的 `worldLeftBottom/RightTop` 与 `worldRect` 同处地图坐标系（已用 map01_lv001 数据交叉验证：l 档首块 LB (-896,-768) 恰为矩形左下角）；`needInverseXZ` 仅作用于 `staticElements.position`（实体坐标→地图坐标）。`worldRect` 的 `bottom` 字段只用于 `canvasSize`，换算用 `top`。提案 §3.4 公式中 `py = (worldRect.right - wz)` 为笔误，以本方案为准。

**瓦片定位与 URL**：

```typescript
export function lodTileSize(lod: MapLod): number {
  return LOD_WORLD_UNITS[lod] * PIXELS_PER_UNIT // h:600 m:1200 l:2400（h 基准坐标系）
}

export function chunkRect(config: LevelMapConfig, chunk: MapChunk) {
  return {
    left: (chunk.worldLeftBottom.x - config.worldRect.left) * PIXELS_PER_UNIT,
    top: (config.worldRect.top - chunk.worldRightTop.y) * PIXELS_PER_UNIT,
    size: lodTileSize(/* chunk 所属档 */),
  }
}

export function tileUrl(levelId: string, chunkId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/levelmap/levelmapchunks/${levelId.replaceAll('_', '')}/${chunkId}.png`
}
```

**LOD 选择**（修正 3）：显示分辨率 = `scale × PIXELS_PER_UNIT`，选满足「源分辨率 ≥ 显示分辨率」的最小档：

```typescript
export function pickLod(scale: number): MapLod {
  if (scale <= 0.25) return 'l'
  if (scale <= 0.5) return 'm'
  return 'h'
}
```

（l 档源分辨率 600/512 = 1.17 px/单位，恰覆盖 scale ≤ 0.25；m 档 2.34 覆盖 ≤ 0.5；其余用 h。）

**可见块计算**：

```typescript
export function visibleChunks(
  chunks: MapChunk[], config: LevelMapConfig, lod: MapLod,
  view: MapView, viewport: { width: number; height: number },
): MapChunk[]
```

视口画布坐标矩形 = `(-offsetX/scale, -offsetY/scale, viewport.width/scale, viewport.height/scale)`，与每块 `chunkRect` 求交，四周各外延 1 块余量防边缘闪白。

**视图状态**：

```typescript
export function fitView(canvasW, canvasH, viewportW, viewportH): MapView
// scale = min(vw/cw, vh/ch)，offset 居中

export function clampView(view, canvasW, canvasH, viewportW, viewportH): MapView
// 轴独立：scaledW ≤ viewportW 时该轴居中；否则 offsetX ∈ [viewportW - scaledW, 0]

export function zoomAt(view: MapView, nextScale: number, px: number, py: number): MapView
// k = nextScale / view.scale
// offset' = pointer - (pointer - offset) × k，随后 clampView
```

缩放范围：`minScale = fitView 的 scale`（全景恰适配视口），`maxScale = 1`（h 档原生分辨率，避免过度放大失真）。wheel 指数缩放 `scale ×= exp(-deltaY × 0.0015)`（触控板捏合产生 ctrl+wheel，同一公式兼容）；双击 ×1.5；按钮 ×1.25 / ÷1.25。

**标注适配** `adaptStaticElements(config, sources): MapMarker[]`：

| type | kind | label 解析 |
|------|------|-----------|
| 1 | level-entrance | 由页面层用区域清单 id→name map 填 `targetLevelId` 对应区域名 |
| 2 | place-name | `textTableRaw[textId].id` → `textDict[String(id)]`（修正 1 链路） |
| 3 / 6 | region | 无文案（弱圆点） |
| 4 | settlement | `settlementRaw[settlementId].settlementName.id` → `settlementDict[String(id)]` |
| 7 | tier-switch | 由页面层填目标区域名 |

任一环节缺失：`label = ''`，标注降级为圆点/图标，不空白、不报错（对应 PRD 异常表「标注文本暂无翻译回退」）。`String(id)` 防 64 位精度问题（engineering-spec 硬性要求）。

显隐分档（LOD 序 l < m < h，当前档 ≥ 最小档即显示）：

```typescript
export const MARKER_MIN_LOD: Record<MapMarker['kind'], MapLod> = {
  'level-entrance': 'l',
  'settlement': 'l',
  'tier-switch': 'm',
  'region': 'm',
  'place-name': 'h',
}
```

### 3.3 Hooks（useData.ts 末尾新增分区）

```typescript
export interface MapRegion { levelId: string; name: string }
export interface MapRegionGroup { mapId: string | null; name: string; regions: MapRegion[] } // mapId=null → 页面显示 t('map.groupOther')

export function useMapRegionList(): UseDataResult<MapRegionGroup[]>
export function useMapConfig(levelId: string | null): UseDataResult<{ config: LevelMapConfig; markers: MapMarker[] } | null>
```

`useMapRegionList`（deps `[locale]`，模式参照 `useLevelInfo`，useData.ts:1581）：

1. `getCachedData('UILevelMapLoadConfig_LoadList', () => fetchJsonDataRaw('Data/Json/UILevelMapLoadConfig/LoadListConfig.json'))` → `loadLevelList`。
2. 并行：`LevelDescTable`/`MapIdTable`/`SpecialLevelToMapTable` 三表（`fetchTableAll`）+ LevelDescTable、MapIdTable 两本字典（`getTableI18nDict`）。
3. 分组：`SpecialLevelToMapTable[levelId]?.mapId ?? resolveLevelMapId(levelId, mapIdRaw) ?? null`（`resolveLevelMapId`，adapter.ts:516，已有单测；dung01_wrdg001 两类都查不到 → `null` → 「其他」组兜底）。
4. 组名：`resolveI18n(mapIdRaw[mapId].showName, dict)`；区域名：`resolveI18n(levelDescRaw[levelId].showName, dict)`；缺失条目跳过该区域（防御）。
5. 排序：组按 MapIdTable key 序（map01 → map02 → base01_lv001 → 其他），组内保持 `loadLevelList` 原始顺序。

`useMapConfig`（deps `[levelId, locale]`，`levelId` 为空直接返回 null）：

1. `getCachedData(\`UILevelMapLoadConfig_${levelId}\`, () => fetchJsonDataRaw(\`Data/Json/UILevelMapLoadConfig/${levelId}.json\`))` → `parseLevelMapConfig`。
2. 并行：`TextTable` 全表 + TextTable 字典 + `SettlementBasicDataTable` 全表 + 其字典。
3. `adaptStaticElements` 产出 markers。

`levelId` 出现在缓存 key 中，切换区域互不污染；版本变化时按现有机制整体失效。TextTable（22506 条）与字典各一次请求，LRU+IndexedDB 复用，仅访问地图页时加载。

### 3.4 页面组件（`src/pages/map/`）

**MapViewerPage**（默认导出）：

- `useMapRegionList` + `useState<string | null> currentLevelId`；区域清单到位且未选择时初始化为 `groups[0].regions[0].levelId`（`useEffect`）。
- `useMapConfig(currentLevelId)`；区域 id→name map（`useMemo`）补填 entrance/tier-switch 标注的目标区域名。
- 布局：根 `flex-1 min-h-0 flex`；左 `<RegionPicker>`（`w-60 shrink-0 overflow-y-auto border-r border-archive-border bg-archive-file`），右 `<MapCanvas>`（`flex-1 min-w-0 min-h-0`）。
- 清单加载中：`ListSkeleton`；配置加载失败或 `chunks.h` 为空：占位提示 `t('map.unavailable')`（PRD 异常表要求），不影响切换其他区域。
- `onSelectRegion(levelId)`：区域列表点击与入口标注点击共用。

**RegionPicker**：组名小标题（`text-archive-dust`），区域条目 `<button>` 整行，选中态 `text-archive-gold border-archive-gold` 高亮；`mapId === null` 的组标题用 `t('map.groupOther')`。

**MapCanvas**：

- 容器 ref + `ResizeObserver` 测量视口尺寸（state）；`config` 或视口尺寸首次就绪时 `fitView` 重置；config 变化（切换区域）重新 fit。
- 事件：wheel 用 `ref.addEventListener('wheel', h, { passive: false })`（React 合成 wheel 为 passive，无法 preventDefault）；`pointerdown/move/up` + `setPointerCapture` 拖拽；`onDoubleClick`。每次变更经 `zoomAt`/`clampView` 收敛后 `setView`。
- 渲染结构：外层 `relative overflow-hidden`；内层 `style={{ transform: translate(offsetX, offsetY) scale(scale), transformOrigin: '0 0', width, height }}`，内嵌两个 `TileLayer`（当前档 + 前一档底衬，见下）与 `MarkerLayer`；`ZoomControls` 绝对定位右下角（不随 transform）。
- LOD 双档叠加：`lod = pickLod(view.scale)`；`prevLod` state 在 `lod` 变化时保留旧档，300ms 后卸载（`useEffect` + timeout，cleanup 防竞态）。旧档渲染在下层，新档瓦片逐块就绪自然覆盖，避免换档空白。

**TileLayer**：`visibleChunks` 过滤后每块一个 `<img>`：绝对定位 `left/top/width/height`（`chunkRect`）、`draggable={false}`、`alt=""`、`select-none`；`onError` 置本地失败集合不再渲染该块（碎片缺失不拖垮整图）。

**MarkerLayer**：

- 按 `MARKER_MIN_LOD` 与当前 `pickLod(scale)` 过滤。
- 每个标注：外层 `absolute` 定位到 `canvas` 坐标；内层 `transform: translate(-50%, -100%) scale(1/s)`（锚点底部居中，反向缩放保持视觉尺寸恒定，仅位置联动——验收「不漂移」即靠与瓦片共用 `worldToCanvas`）。
- 视觉（自绘，archive-* 色板）：level-entrance = 菱形箭头（按 `directionAngle` 旋转）+ hover tooltip 显示 `t('map.gotoRegion', { name })`，可点击触发 `onSelectRegion(targetLevelId)`（目标在区域清单中才可点）；settlement = 圆点 + 名称；place-name = 文字标签（`text-archive-ivory`，`text-shadow` 描边保证底图上可读，`label` 为空降级小圆点）；region = 弱圆点；tier-switch = 双向箭头 + hover 目标名。
- 入口按钮不嵌套 `<Link>`（frontend-spec 禁令），用 `onClick` 回调。

**ZoomControls**：`+` / `−` / 适配三个 `<button>`，`aria-label` 走 `t('map.zoomIn'/'map.zoomOut'/'map.zoomFit')`，面板样式 `bg-archive-file border-archive-border rounded`。

### 3.5 布局与注册点

**ArchiveLayout 全幅例外**（修正 4）：

```tsx
const { pathname } = useLocation()
const fullBleed = pathname.startsWith('/archive/map')
// 右列容器：fullBleed 时 'flex-1 flex flex-col min-w-0 h-screen overflow-hidden md:ml-60'
// main：     fullBleed 时 'flex-1 min-h-0 flex flex-col pt-14 md:pt-0'，否则保持现有类
// fullBleed 时不渲染 <Breadcrumb /> 与 <Footer />
```

其他页面路径不匹配前缀，渲染输出逐字节不变；E2E 全量回归兜底。

**注册点清单**：

- `src/App.tsx`：`const MapViewer = lazy(() => import('./pages/map/MapViewerPage'))`，`<Route path="map" element={<Suspense fallback={<ListSkeleton />}><MapViewer /></Suspense>} />`（geography 行之后）。
- `Sidebar.tsx` `useNavGroups`：geography 组 items 追加 `{ label: t('nav.map'), path: '/archive/map' }`。
- `ArchiveHome.tsx` `useModuleGroups`：追加地图条目（`label: t('nav.map')`、`desc: t('nav.mapDesc')`、`path: '/archive/map'`）。
- `Breadcrumb.tsx` `useListLabel`：追加 `map` 段。
- `archiveMeta.ts` `MODULE_CODES`：追加 `map: 'HSA-MAP'`。
- `Sidebar.test.tsx`：同步硬编码分组断言。

### 3.6 i18n 文案清单（`scripts/i18n-custom.json`，14 语言齐全后运行 `node scripts/generate-i18n-dicts.ts`）

| key | CN 示例 | 用途 |
|-----|---------|------|
| `nav.map` | 地图 | 侧边栏/首页/面包屑 |
| `nav.mapDesc` | 浏览各区域地图与地名标注 | ArchiveHome 模块描述 |
| `map.groupOther` | 其他区域 | 无分组关卡兜底组名 |
| `map.unavailable` | 该区域地图暂不可用 | 素材缺失/加载失败占位 |
| `map.zoomIn` / `map.zoomOut` / `map.zoomFit` | 放大 / 缩小 / 适配视图 | 缩放控件 aria-label |
| `map.gotoRegion` | 前往{{name}} | 入口标注 hover（`{{name}}` 插值） |
| `api.fetchingMapData` | 正在加载地图数据 | trackFetch 加载提示 |

## 4. 实现顺序

每个阶段一个提交点（单一提交聚焦一个改动点，common-rules），均在开发分支 `feat/map-viewer-impl` 上进行，完成后 PR 合回 `feat/map-viewer`。

### 阶段一：数据层与算法

1. `api.ts`：`fetchJsonDataRaw` + `fetchMissionDetail` 委托；`i18n-custom.json` 加 `api.fetchingMapData` 并重新生成字典。
2. `src/lib/map/mapConfig.ts` 全量纯函数 + `mapConfig.test.ts`。
3. 校验：`npx tsc --noEmit && npx vitest run src/lib/map/mapConfig.test.ts`。

### 阶段二：Hooks 与页面骨架（静态可看）

1. `useData.ts` 两个 Hook。
2. `MapViewerPage` / `RegionPicker` / `TileLayer`（先固定 fit 视图）+ `ArchiveLayout` 例外 + 全部注册点 + 其余 i18n keys。
3. `Sidebar.test.tsx` 同步。
4. 校验：`npx tsc --noEmit && npm run lint && npm run test`；手工 `npm run dev` 确认 21 个区域列出、底图按 fit 渲染。

### 阶段三：缩放平移交互

1. `MapCanvas`（wheel/拖拽/双击、钳制、双档叠加换档）+ `ZoomControls`。
2. 校验：手工验证锚点缩放、边界钳制、换档无空白。

### 阶段四：标注层

1. `adaptStaticElements` 接入 + `MarkerLayer` + 分档显隐 + 入口跳转 + `MarkerLayer.test.tsx`。
2. 校验：对照游戏截图抽查 2–3 张图（含 base01_lv001 验证 `needInverseXZ` 分支）标注位置。

### 阶段五：测试补齐与全量验证

1. `MapViewerPage.test.tsx`、E2E `map.spec.ts`；`navigation.spec.ts`/`archive-home.spec.ts` 如有模块清单断言则同步。
2. `npm run lint && npm run test && npm run build && cd tests/e2e && npm run test` 全量通过。

## 5. 测试计划

### 5.1 单元测试（`src/lib/map/mapConfig.test.ts`）

fixture 用验证阶段转储的真实数据精简版（map01_lv001 一块 chunk + 各 type 标注一条；base01_lv001 用于 inverseXZ 分支），避免与实现同源同错（data-pitfalls 经验）。

| 用例 | 断言 |
|------|------|
| `parseLevelMapConfig` | dict→数组转换、rect 四值映射、lodType 交叉校验、未知 type 过滤 |
| `worldToCanvas` | map01 已知点换算正确（chunk LB→(0, height-块高) 等基准点）；inverseXZ 分支取反 |
| `chunkRect` / `lodTileSize` | l 档首块 left=0/top=0（覆盖矩形左下角基准），三档 size 600/1200/2400 |
| `tileUrl` | levelId 去下划线、路径段正确 |
| `pickLod` | 0.25 / 0.5 边界归属正确 |
| `visibleChunks` | 视口包含/相离/部分相交；外延余量生效 |
| `fitView` / `clampView` | 宽图/高图适配；小图居中、大图夹取边界 |
| `zoomAt` | 锚点不动点性质：缩放前后指针下画布坐标一致；越界后 clamp |
| `adaptStaticElements` | textId→TextTable→dict 全链路；dict 缺 id / TextTable 缺 key 降级 `label=''`；settlement 名称解析；`String(id)` 键查找 |

### 5.2 组件测试

- `MarkerLayer.test.tsx`：view 变化时位置联动更新；LOD 过滤生效；`label=''` 降级圆点不报错；入口点击回调携带 `targetLevelId`。
- `MapViewerPage.test.tsx`：`vi.mock('../../hooks/useData')` 打桩——清单加载后默认选中首个区域；切换区域触发对应 `useMapConfig`；配置加载失败显示 `map.unavailable` 占位。
- 组件测试包裹 `MemoryRouter` + `LocaleProvider`/`I18nProvider`（参照 `Sidebar.test.tsx:1-12`）。

### 5.3 E2E（`tests/e2e/tests/map.spec.ts`）

- 侧边栏进入 `/archive/map`，画布与区域列表（21 项、分组标题）可见。
- 切换区域后画布内容更新（首块 `<img>` src 变化）。
- wheel 缩放与拖拽后 transform 变化、无页面报错。
- 放大至 h 档后出现地名标注。
- 现有 19 个 spec 全量回归（重点 `navigation.spec.ts` / `archive-home.spec.ts` / `responsive.spec.ts` 受 ArchiveLayout 改动影响）。

### 5.4 构建与手工验证

- `npm run lint` / `npm run test` / `npm run build` 全部通过。
- 手工：对照游戏内地图抽查 map01_lv001（大图）与 base01_lv001（inverseXZ）标注位置；慢网节流（DevTools Slow 3G）下换档不出现长空白；切语言后区域名与地名人名跟着切换。

## 6. 验收标准

- [ ] 地图画布占满除侧边栏外的剩余区域，窗口尺寸变化自适应（其他页面布局零变化）。
- [ ] 21 个关卡地图按地理分组列出并可无刷新切换，当前选中高亮，名称 14 语言正确；素材缺失区域显示占位提示。
- [ ] 滚轮/捏合/按钮连续缩放，以指针为锚点；缩放跨 l/m/h 档自动切换清晰度，无长时间空白；平移钳制在地图范围内。
- [ ] 地名、关卡入口、定居点、跨层切换标注位置与游戏内一致（含 base01_lv001 inverseXZ 分支），随缩放平移不漂移；标注文字随站点语言切换，缺失时降级不空白；地名仅在高缩放档显示，低密度档不堆叠。
- [ ] 关卡入口标注可点击跳转到目标区域。
- [ ] `npm run lint` / `npm run test` / `npm run build` 通过；E2E 新增用例与全量回归通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `needInverseXZ` 语义仅靠对称矩形样本推断 | base01_lv001 标注/底图错位 | 阶段四对照游戏人工核验该图；单测覆盖两分支；若方向反了只需改 `worldToCanvas` 一处 |
| TextTable 全表 + 字典体积大（约 2.2 万条 × 2） | 首次进地图页多两个请求 | 一次请求 + LRU/IndexedDB 缓存；仅地图页触发；版本不变不重复拉取 |
| h 档单关卡最多 80 块 | 慢网加载碎片化 | 仅渲染可见块 + 外延余量；双档底衬换档；浏览器 HTTP 缓存 7 天 |
| 双档卸载时机不当 | 换档闪烁 | 300ms 延迟卸载 + 旧档置底层；手工慢网验证 |
| ArchiveLayout 例外误伤其他页面 | 布局回归 | 严格 `startsWith('/archive/map')` 匹配；E2E 全量回归 |
| 特殊关卡（dung01_wrdg001）无分组 | 列表出现游离项 | 「其他」组兜底，组名走 i18n |
| 数据服务更新改变 JSON 结构 | 解析失败 | 解析层防御（缺字段跳过/空数组）；页面级占位提示兜底；版本变化缓存自动失效 |

回滚策略：纯新增模块 + 一处布局条件分支 + 四处入口注册。下线 = 移除路由与入口（ArchiveLayout 条件自然失效）；按阶段提交可逐阶段回滚。

## 8. 相关文档

- [[20260917-map-viewer|地图浏览器 PRD]]
- [[20260917-map-viewer|地图浏览器技术提案]]
- [通用开发规范](../common-rules.md)
- [前端开发规范](../frontend-spec.md)
- [工程架构规范](../engineering-spec.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
