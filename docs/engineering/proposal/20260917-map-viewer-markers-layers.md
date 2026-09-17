# 地图浏览器 R2：文字描边、标记补全与显隐面板、图层管理

> 关联：[地图浏览器技术提案](20260917-map-viewer.md)、[站点概念设计](../../product/released/20260719-site-concept.md)
> 来源：地图浏览器验收打回（3 项），经审核节点完成数据调研（基于线上 API 与全部 21 个关卡的 `UILevelMapLoadConfig` 实测）后产出，交由实现节点开发。
> 范围约定：无法以 JSON 读取的动态 POI 坐标（`GameplayConfigWorldEntityRegistry.json` 为自定义二进制）本期**跳过不做**。

## 一、标注文字描边

**问题**：地名/定居点等标注文字仅用 `textShadow` 微光（`src/pages/map/MarkerLayer.tsx`），在浅色底图区域对比度不足。

**方案**：新增共享组件 `StrokedText`（放 `src/pages/map/` 或 `src/components/`），双层文字实现真描边：

- 底层 `::before`（`content: attr(data-text)`，absolute 叠在同一位置）设置 `-webkit-text-stroke: 3px #0A0A0D`（站点 ink 底色），形成只向外扩的描边；上层正常 fill 文字。
- 退化（非 webkit）：8 方向 `text-shadow`（±1px 四正 + 四对角，色 `#0A0A0D`），用 `@supports not (-webkit-text-stroke: 1px black)` 切换。
- 应用范围：MarkerLayer 的 PlaceName、settlement 名称及后续所有文字类标注（含新增 POI 的 hover 标签）；tooltip 气泡内文字不需要。
- 可同步微调字号/字重（地名 `text-xs`→`text-sm`、`font-medium`→`font-semibold`），保持 archive 配色不变。

**验收**：组件测试断言描边样式存在；人工确认浅色区域可读性。

## 二、标记补全与显隐面板

**问题**：当前仅渲染 staticElements type 1/2/3/4/6/7 的自绘图形，缺游戏内 POI 标记（协议传送点、采集点等），且无显隐管理。

### 数据调研结论（已实测）

1. **staticElements 全类型**（21 关卡统计）：type1 关卡入口×36、type2 地名×192、type3 区域×2、type4 定居点×6、type5 未知×1（map01_lv003）、type6 区域×1（map02_lv001）、type7 层间跳转×30、type8 状态图×24。当前 `VALID_TYPES` 漏掉 5 和 8。
   - type5 无区分字段，用通用圆点兜底渲染。
   - type8 为状态图（`defaultImgPath` + `imagePhases` 按全局变量切换），只渲染 `defaultImgPath`，图片路径 = Bundle `sprites/map/commonstaticelement/{defaultImgPath}.png`（已验证可下载，如 `map02_lv008_bridge_1.png`）。
   - type7 的 `targetLevelSpriteName` 对应 `sprites/levelmap/switchmask/{name}.png`，可作跳转区高亮（可选增强）。
2. **游戏内 POI 标记体系 = MapMark 系列表**（API 均为 JSON 可访问）：
   - `MapMarkTempTable`（285 条）：markInfoId → activeIcon/inActiveIcon、name（i18n id）、markType、defaultVisible、isTpRelatedMark、visibleLayer（1/2/3，疑为位掩码）、visibleInMist、showJumpTpBtn、sortOrder。
   - `MapMarkTypeTable`（28 条）：筛选面板用的类型定义，含 category + icon + name + sortId。
   - `MapMarkCategoryTable`（5 类）：综合(sortId 1)/资源(2)/作战(3)/收集(4)/设备(5)。
   - `MapMarkInsTable`（34 条静态实例）：levelId + pos{x,y,z} + markInfoId + activeMethod/visibleMethod，可按 levelId 过滤直接上图。
   - 图标资源：`sprites/map/markicon/{activeIcon}.png` 与 `markiconsmall/` 小图，均有 `_unactive` 变体（已验证 `icon_map_campfire.png` 可下载）。
   - 「协议传送点」= `mark_sp_campfire`（icon_map_campfire，isTpRelatedMark=true）；「采集点」对应资源类的集中矿点/稀有采集物/稀有矿物/资源回收站（icon_map_mine 等）。
3. **范围锁定**：动态 POI 运行时实例坐标在 `Data/Json/GameplayConfigWorldEntityRegistry.json`，该文件为自定义二进制（66KB，长度前缀字符串 + int64 记录流），现有 `fetchJson` 无法解析。按验收指示**跳过不做**。本期标记范围 = staticElements 全类型 + MapMarkInsTable 静态实例。

### 实现方案

- **数据层**：`mapConfig.ts` 或新文件 `mapMarks.ts` 增加 MapMark 解析（`fetchTableAll('MapMarkInsTable'/'MapMarkTempTable'/'MapMarkTypeTable'/'MapMarkCategoryTable')` + 对应 i18n dict）；`useMapConfig` 聚合输出 poiMarkers（kind='poi'，带 icon/category/markType/name）。
- **渲染**：MarkerLayer 支持 icon 型标记（`<img>` markiconsmall 图标，沿用 `1/scale` 反向缩放与 `translate(-50%,-100%)` 锚点），hover 显示名称 tooltip。
- **显隐面板**：画布右侧可折叠「标记」面板 —— 按 category（sortId 排序）分组，组内列出类型（icon + 本土化名称），checkbox 控制；每组提供全选/清空；默认勾选遵循 `defaultVisible`。状态用 `Set<markType>`（及静态元素 kind）存于 MapViewerPage/MapCanvas，传入 MarkerLayer 过滤。
- **多语言**：标记名用 `resolveI18n(name, markDict)`；面板 UI 文案走 `scripts/i18n-custom.json` 全流程（14 语言）。

**验收**：各图可见协议传送点等静态实例图标；面板勾选实时显隐；单元测试覆盖 MapMark 解析与过滤；E2E 新增面板交互用例。

## 三、图层展示与管理

**问题**：多楼层地图（地上/二楼/地下实验室等）未展示图层，无法切换。

### 数据调研结论（已实测全部 21 关卡）

1. **图层数据结构**在 `UILevelMapLoadConfig/{levelId}.json`：
   - `basic.isSingleLevel`：是否单层；21 关中 15 关有图层（2~8 个，如 map02_lv005 有 8 层、map01_lv001 有 7 层），base01/indie_dg005 等单层。
   - `tierNames`：`{ tierId → TextTable textId }`，已验证解析为「裂地者营哨/集成工业研究所二楼/顶楼/底部联通区/实验室通道/地下实验室/基地区二层」等（`TextTable[textId].id` → `/i18n/{locale}/{id}`）。
   - `tierInfos`：key = `{h块id}_tier_{tierId}`，value = `{ tierId, worldCenter, worldLeftBottom, worldRightTop }`，与 h 块网格对齐（128 世界单位）。同一世界区域可叠多层（如 map01_lv001 的 tier 114/115 同为 x:0~128、y:-512~-256，即同一建筑的二楼/顶楼）。
2. **更正（R3 返工）：分层专用贴图存在**。此前只统计了 `levelmapchunks` 目录，遗漏了独立的 `levelmaptiers` 目录，得出「无分层贴图」的错误结论。实测：
   - `UILevelMapLoadConfig` 的 `lowChunks/mediumChunks/highChunks` 每个 chunk 都有 `tiers` 字段：`{ [tierId]: 贴图ID }`，例如 `h_map01_lv001_2_3.tiers = { "173": "h_map01_lv001_2_3_tier_173" }`；`tierInfos.tierLoadId` 即该贴图 ID。
   - 贴图路径：`sprites/levelmap/levelmaptiers/{levelId 去下划线}/{贴图ID}.png`（`levelmaptiers`，非 `textures/levelmapchunks`）。已实测 `.../levelmaptiers/map01lv001/l_tier_173.png` 返回 200，600×600 含 alpha 的区域楼层贴图。
   - 低/中档贴图 ID 为通用名（`l_tier_173` / `m_tier_173`，不含坐标），高档为 `h_{level}_{x}_{y}_tier_{tierId}`，均与 `chunk.tiers` 中的值一致。
   - **同一 l/m textureId 会被多个 chunk 引用**（跨 chunk 边界），其真实矩形在 `tierInfos[tierLoadId]`，远小于 chunk（如 map01_lv001 `l_tier_171` 约 46.93×84.48 世界单位，而 l chunk 为 512×512）；渲染必须按 textureId 去重并取 tierInfos rect。h 档贴图按 chunk 命名，`tierInfos` rect 恰等于 128 单位 chunk 矩形。
   - 贴图为 WebP 内容 + `.png` 后缀，浏览器按内容嗅探可正常显示。
   - 资源搜索实测：全服共 16 个关卡、432 张分层贴图（map01lv001×29、map02lv008×61、dung01wrdg001×44 等），凡 `tiers.length>0` 的关卡基本都有对应贴图。
3. **标记的层归属**：staticElements.`displayTierId`（0=全层显示，实测 288 个为 0、少数为具体 tierId）；`MapMarkTempTable.visibleLayer` ∈ {1,2,3}（疑为位掩码 1=主层/2=副层/3=全部，实现时先用 displayTierId 做静态元素过滤，visibleLayer 语义验证后再用于 POI 过滤）。
4. `mistInfos`（迷雾）仍不在本期范围（PRD 明确不含迷雾）。

### 实现方案

- **数据层**：`parseLevelMapConfig` 增加解析 tierNames/tierInfos → `LevelMapConfig.tiers: [{ tierId, name, rects: [{left,top,width,height}]（世界坐标换算 canvas 像素）}]`，并解析 `chunk.tiers`（tierId → 贴图 ID）；单层关卡 tiers 为空。
- **UI**：新增 LayerPanel 图层切换器（画布右侧竖排列表，与标记面板可同侧上下排布），仅 `tiers.length > 0` 时显示；列表项 = 图层名（多语言），首项「全部图层」（默认选中，保持现状行为）。
- **选中某图层时**：
  1. 底图切层 —— l/m/h 档按 `chunk.tiers[activeTier]` 收集当前档该层的贴图 ID，**按 textureId 去重**后渲染 `levelmaptiers` 分层贴图（`tierTileUrl`，与瓦片同坐标系、同缩放，绝对定位，叠加在底图之上、标记之下）。贴图矩形取自 `tierInfos[tierLoadId]`（l/m 档为「一张 tier 一图」，rect 远小于 chunk 且可跨 chunk；h 档贴图按 chunk 命名、其 tierInfos rect 恰等于 128 单位 chunk 矩形），缺失条目回退 `chunkRect`；
  2. 非本层暗色蒙层 —— **分层贴图与非本层暗色蒙层并存**：在底图之上、分层贴图/标记之下，对当前 tier 的 `tiers[].rects`（canvas 像素）覆盖区域之外的底图叠加半透明暗色遮罩（`complementRects` 精确矩形补集，`rgba(0,0,0,.55)`）；切回「全部图层」时移除；
  3. 选层缩放居中 —— 选中某图层时取该层 rects 的包围盒，`tierFitView` 以 5% padding 计算 `scale = min(vw·0.9/bboxW, vh·0.9/bboxH)` 并 clamp 到 `[minScale, maxScale]`，offset 使包围盒中心对准视口中心，最后过 `clampView`；切回「全部图层」恢复全图 `fitView`；
   4. MarkerLayer 过滤 —— 静态元素仅显示 `displayTierId===0 || ===activeTier` 者，POI 按 visibleLayer 语义过滤；
   5. 画布角标显示当前图层名。
- type7 层间跳转标记保持现有跳关行为；可选增强：switchmask 图作为跳转区高亮。

**验收**：map01_lv001 图层列表含 7 层且名称本土化；切层后渲染该层分层贴图（`levelmaptiers`）、非本层出现暗色蒙层、视图缩放居中适配该层包围盒且标记数量变化；切回「全部图层」恢复全图并移除贴图与蒙层；单层关卡不出现图层面板；单元测试覆盖 tiers 解析（多层/单层/缺 tierInfos）、chunk.tiers 贴图映射、`complementRects` 与 `tierFitView`；E2E 新增切层用例（断言 tier 贴图 img、蒙层与 transform 变化）。

## 共性约束

- 新 UI 文案全部走 `scripts/i18n-custom.json`（14 语言，禁止占位/留空/复制中文），重新生成 dicts。
- 补齐单元测试与 E2E（`tests/e2e/src/map.spec.ts` 增加图层面板、标记面板用例）。
- `npm run lint && npm run test && npm run build` 全绿后提交。
