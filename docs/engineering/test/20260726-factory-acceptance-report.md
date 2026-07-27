---
description: 工厂系统验收问题记录与修复方案
type: Fleeting
---

# 工厂系统验收报告

**关联 PRD**: [[20260725-factory-system|工厂系统（工厂配方与制作链路）]]
**关联技术方案**: [[20260725-factory-system|工厂系统 - 技术提案]]
**关联实现方案**: [[20260725-factory-system-plan|工厂系统 - 实现方案]]
**PR**: [#39 feat/factory-archive-impl](https://github.com/Deliay/hongshan-archives-bureau/pull/39) → [#38 feat/factory-archive](https://github.com/Deliay/hongshan-archives-bureau/pull/38)
**验收日期**: 2026-07-26

---

## 1. 需求与技术方案概述

### 1.1 产品需求（PRD 摘要）

工厂系统包含两个子页面：

| 子页面 | 路由 | 核心功能 |
|--------|------|----------|
| 工厂配方 | `/archive/factory/recipes`（默认） | 左右结构：左侧物品列表 + 右侧配方展示，以物品为中心双向查询 |
| 制作链路 | `/archive/factory/chains` | 选择目标产物，以图的形式展示完整制作链路 |

**关键验收标准**：
- 左侧列表完整覆盖参与机器制造的物品
- 配方卡片展示产物、材料、所需机器、制作时长与每分钟产能
- 链路图以所选产物为最终点，循环依赖有标记且不卡死
- 两个子页面独立路由，刷新后状态不丢失

### 1.2 技术方案要点

- **数据层**：消费 `FactoryMachineCraftTable`、`FactoryBuildingTable`、`FactoryMinerTable` 等表，沿用 `getCachedData` + adapter 纯函数模式
- **路由**：嵌套子路由 + `Outlet`，选中状态经 `useSearchParams` 同步 URL
- **链路图**：`lib/factory/chain.ts` 纯函数构建（DFS 环检测 + 速率换算），`@xyflow/react` + `@dagrejs/dagre` 渲染
- **每分钟换算**：`count × 60000 / totalProgress`

### 1.3 实现计划

| 阶段 | 内容 |
|------|------|
| 阶段一 | 数据层（types / recipes / chain）+ i18n |
| 阶段二 | RecipeCard 组件 + 路由框架 + hooks |
| 阶段三 | FactoryRecipes + FactoryChains 页面 |
| 阶段四 | 单元测试 + E2E 测试 |

---

## 2. 验收问题清单

### 2.1 左侧物品列表缺少分页

**问题描述**：工厂配方页左侧物品列表一次性渲染所有物品，数据量大时滚动卡顿。

**根因**：左侧列表使用 `filteredIds.map()` 直接渲染全部匹配项，无分页机制。

**修复方案**：
- 新增 `LIST_PAGE_SIZE = 50` 分页常量
- 左侧列表按分页切片渲染，底部显示 `‹ 1/5 ›` 分页控件
- 搜索过滤时自动重置到第 1 页

**涉及文件**：`src/pages/factory/FactoryRecipes.tsx`

**提交**：`b832dc0 feat(factory): add pagination to left sidebar item list (50 per page)`

---

### 2.2 右侧配方列表缺少分页

**问题描述**：选中物品后，右侧配方列表一次性渲染所有相关配方，数据量大时性能差。

**根因**：右侧配方区域无分页，直接渲染全部 `RecipeCard`。

**修复方案**：
- 新增 `PAGE_SIZE = 12` 分页常量
- 「作为产物」「作为材料」两组各自独立分页
- 分组标题显示总数（如 `作为产物 (35)`）
- 切换物品时自动重置分页

**涉及文件**：`src/pages/factory/FactoryRecipes.tsx`

**提交**：`6d8e5c7 feat(factory): add pagination to recipe list (12 per page)`

---

### 2.3 `FullBottleTable` 重复加载

**问题描述**：打开物品较多的页面时，每次都会加载 `/table/FullBottleTable/all`。

**根因**：`ItemIcon` 组件每个实例都调用 `getCachedData('FullBottleTable', ...)`，并发渲染时多个实例同时触发请求。

**修复方案**：
- 在 `useFactoryData` 中预加载 `FullBottleTable`
- 在 `cache.ts` 中添加 in-flight 请求去重机制（`inflight` Map），同一 key 的并发调用共享同一个 Promise

**涉及文件**：`src/hooks/useData.ts`、`src/lib/cache.ts`

**提交**：
- `f8fc0c5 fix(factory): pre-fetch FullBottleTable in useFactoryData`
- `a79f9f8 fix(cache): deduplicate in-flight requests in getCachedData`

---

### 2.4 `ItemTable` 和 i18n 字典重复加载

**问题描述**：除 `FullBottleTable` 外，`ItemTable` 和 `ItemTable` i18n 字典也存在大量重复请求。

**根因**：与 2.3 相同，`ItemTile` 和 `ItemIcon` 组件各自独立请求。

**修复方案**：在 `useFactoryData` 中预加载 `ItemTable` + `ItemTable` i18n dict，配合 cache 的 in-flight 去重，后续组件直接命中缓存。

**涉及文件**：`src/hooks/useData.ts`

**提交**：`a79f9f8 fix(cache): deduplicate in-flight requests in getCachedData`

---

### 2.5 物品 ID 来源错误（依赖 Income/Outcome 索引表）

**问题描述**：左侧物品列表显示的不是实际参与配方的物品 ID。

**根因**：`useFactoryData` 从 `FactoryItemAsMachineCrafterIncomeTable` / `OutcomeTable` 获取物品 ID，但这些表的 key 可能不是 item ID。

**修复方案**：
- 去掉对 Income/Outcome 表的依赖
- 直接从 `FactoryMachineCraftTable` 的 `ingredients` 和 `outcomes` 中提取物品 ID，去重后作为左侧列表数据源
- 索引（`asIngredient` / `asOutcome`）也从 recipes 构建

**涉及文件**：`src/hooks/useData.ts`

**提交**：`c860ff0 fix(factory): extract item IDs directly from recipe data`

---

### 2.6 配方 ID 解析错误 — 点击任意物品总显示同一配方

**问题描述**：工厂配方页面，点击任意物品，出现的配方总是 `item_equip_script_4_3` 的配方。

**根因**：`adaptFactoryRecipe` 使用 `raw.formulaId ?? raw.$key ?? ''` 取 ID，但 `FactoryMachineCraftTable` 的数据字段是 `id`（不是 `formulaId` 也不是 `$key`）。所有 recipe 的 ID 都是空字符串，导致索引查询时全部匹配到同一个配方。

**修复方案**：ID 解析链增加 `raw.id` 兜底：`raw.formulaId ?? raw.id ?? raw.$key ?? ''`

**涉及文件**：`src/lib/factory/recipes.ts`

**提交**：`3847de7 fix(factory): use raw.id as fallback for recipe ID`

---

### 2.7 `adaptFactoryRecipe` 数据结构不匹配

**问题描述**：页面报错 `group[0].map is not a function`，工厂配方页无法渲染。

**根因**：`flattenGroup` 函数假设 `ingredients` 格式为 `{ id, count }[][]`，但实际数据格式为 `[{ group: [{ id, count }] }]`。

**修复方案**：修改 `flattenGroup` 签名，适配实际数据结构 `[{ group: [{ id, count }] }]`。

**涉及文件**：`src/lib/factory/recipes.ts`

**提交**：`92e5c0c fix(factory): fix recipe data adapter`

---

### 2.8 配方展示逻辑 — 「作为产物/作为材料」改为按机器分组

**问题描述**：「作为产物」「作为材料」是 TianShiTools 的逻辑，不符合产品需求。需要按机器分组，每个配方一行，材料在左，箭头指向产物，箭头上标注生产时间。

**根因**：初版实现了 TianShiTools 风格的分组，未按产品文档要求实现机器分组视图。

**修复方案**：
- 重写 `RecipeCard` 为水平配方行：`[材料 ItemTile] → [制作时间 + 机器] → [产物 ItemTile]`
- `FactoryRecipes` 去掉「作为产物/作为材料」分组，改为按机器分组展示
- 每个机器区块有标题行（图标 + 名称 + 配方数量）
- 已选物品在配方行中高亮显示

**涉及文件**：`src/components/Craft/RecipeCard.tsx`、`src/pages/factory/FactoryRecipes.tsx`

**提交**：`2f785b6 refactor(factory): group recipes by machine, horizontal recipe row layout`

---

### 2.9 左侧物品列表排序不符合预期

**问题描述**：左侧物品列表按字母排序，未按稀有度排序。

**根因**：`itemIds` 使用 `Array.from(ids).sort()` 做字母排序，未考虑 rarity。

**修复方案**：改为按 `rarity` 倒序排列，相同 rarity 按名称字母排序。

**涉及文件**：`src/pages/factory/FactoryRecipes.tsx`

**提交**：`25aeb57 feat(factory): sort items by rarity desc, mobile collapsible item selector`

---

### 2.10 移动端物品选择体验差

**问题描述**：移动端左侧物品列表占据大量垂直空间，选择物品不便。

**根因**：左右结构在移动端直接堆叠，物品列表始终展开。

**修复方案**：
- 移动端将物品列表改为折叠+下拉选择器
- 默认收起，显示当前选中物品（或引导文案）
- 点击展开下拉列表，选择后自动收起
- 桌面端保持原有侧边栏列表不变

**涉及文件**：`src/pages/factory/FactoryRecipes.tsx`

**提交**：`25aeb57 feat(factory): sort items by rarity desc, mobile collapsible item selector`

---

### 2.11 链路图连线在深色主题下不可见

**问题描述**：制作链路页的图中，指代方向的连线在黑色主题下几乎看不见。

**根因**：边的 stroke 颜色为 `#4a4a52`，与深色背景 `#0F0F12` 对比度极低。

**修复方案**：
- 边颜色改为 `#C9A96E`（站点金色 accent），在深色背景上清晰可见
- 添加 `markerEnd` 箭头标记方向
- 线条宽度增至 1.5

**涉及文件**：`src/components/Factory/ChainGraph.tsx`

**提交**：`a6fdb27 fix(factory): make chain graph edges visible on dark theme`

> **二次修复**：初次仅改颜色未解决问题，实际是 ReactFlow 默认 CSS 覆盖了边样式。追加全局 CSS 覆盖 `react-flow__edge path` 和 `react-flow__arrow polygon`，并补充连通性单测。
> **追加提交**：`2e821ac`

---

### 2.12 制作链路选品 UI 与工厂配方不一致

**问题描述**：制作链路页使用搜索弹窗选品，工厂配方页使用左侧侧边栏+移动端折叠下拉，两端体验不一致。

**根因**：链路页初版实现了独立的搜索下拉逻辑，未复用配方页的侧边栏模式。

**修复方案**：
- 链路页改为与配方页相同的布局：桌面端左侧持久侧边栏 + 移动端折叠下拉
- 物品按 rarity 倒序排列，点击添加为目标产物（已选中的禁用）
- 已选产物展示在右侧面板，支持单个移除和清空

**涉及文件**：`src/pages/factory/FactoryChains.tsx`

**提交**：`159ca08 feat(factory): chains page uses same sidebar+dropdown as recipes page`

---

### 2.13 机器节点缺少名字和图标

**问题描述**：制作链路图中机器节点虽然存在，但名字和图标均为空白。

**根因**：`buildChainGraph` 未接收机器数据（`machines`），`layoutGraph` 中 `machineName` 和 `machineIcon` 被硬编码为空字符串 `''`。`ChainNode` 类型也缺少这两个字段。

**修复方案**：
- `ChainNode` 类型新增 `machineName` 和 `machineIcon` 可选字段
- `buildChainGraph` 新增可选 `machines` 参数，创建机器节点时填充名称和图标
- `useCraftingChain` 将 `factoryData.machines` 传入 `buildChainGraph`
- `layoutGraph` 从节点数据读取而非硬编码空值

**涉及文件**：
- `src/lib/factory/types.ts` — `ChainNode` 新增字段
- `src/lib/factory/chain.ts` — `buildChainGraph` 接收并使用 `machines`
- `src/hooks/useData.ts` — 传递 `factoryData.machines`
- `src/components/Factory/ChainGraph.tsx` — `layoutGraph` 使用节点数据

**提交**：`769a3b7 fix(factory): populate machine node name and icon in chain graph rendering`

---

### 2.14 机器图标资源路径错误

**问题描述**：机器图标使用 `itemicon/` 路径加载，实际应为 `factory/buildingpanelicon/`。

**根因**：`iconOnPanel` 字段值（如 `icon_port_furnance_1`）对应的资源位于 `factory/buildingpanelicon/` 目录，而非 `itemicon/`。代码中错误地沿用了物品图标的路径模式。

**修复方案**：将三处机器图标 URL 从 `itemicon/` 改为 `factory/buildingpanelicon/`。

**涉及文件**：
- `src/components/Factory/ChainGraph.tsx` — 链路图机器节点
- `src/pages/factory/FactoryRecipes.tsx` — 配方列表机器图标
- `src/components/Craft/RecipeCard.tsx` — 配方卡片机器图标

**提交**：`0cf0ef6 fix(factory): correct machine icon asset path to buildingpanelicon`

---

### 2.15 添加目标产物未使用 ItemTile 展示

**问题描述**：制作链路页「添加目标产物」使用原生 `<select>` 下拉框，选项仅显示物品名称文本，未使用 ItemTile 展示物品图标与稀有度，与全站物品展示规范不一致。

**根因**：chain v2 重构（§3.6）将选品 UI 改为原生 `<select>` 下拉（原生 `<option>` 无法渲染图标组件），回退了 2.12 中已与配方页对齐的侧边栏选品模式。

**修复方案**：
- 链路页恢复与配方页一致的布局：复用 `FactoryItemSidebar`（每行 `ItemTile size="sm"` + 名称），桌面端左侧持久侧边栏 + 移动端折叠下拉
- 使用 `FactoryItemSidebar` 已为多选场景预留的 `disableSelected`（已选目标禁用重复点击）与 `clearSearchOnSelect`（选中后清空搜索框，便于连续添加）
- 右侧区域保留已选目标列表（ItemTile + 产速输入 + 移除）、清空按钮与链路图
- 更新 E2E：原「通过下拉选择器添加目标产物」用例改为点击侧边栏物品行

**涉及文件**：
- `src/pages/factory/FactoryChains.tsx` — 移除原生 `<select>`，接入 `FactoryItemSidebar`
- `tests/e2e/src/factory.spec.ts` — 更新添加目标产物用例

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 13/13 passed（含更新后的「通过物品列表添加目标产物」）

**提交**：`5c71ff3 fix(factory): chains 添加目标产物改为 ItemTile 弹窗选择`

> ⚠️ 注：2.15 的侧边栏方案已被 2.16 取代（占位按钮 + 弹窗选择），最终代码以 2.16 为准。

---

### 2.16 添加目标产物改为占位按钮 + 弹窗选择

**问题描述**：验收要求制作链路页「添加目标产物」不使用常驻侧边栏，改为在原列表位置放置占位按钮，点击后弹出 dialog 进行物品选择。

**根因**：2.15 复用了配方页的常驻侧边栏，占用了链路图左侧空间；验收期望选品入口更轻量，仅在需要时弹出选择。

**修复方案**：
- 新增 `FactoryItemPickerDialog` 组件：模态弹窗（沿用 `ItemTooltip` 的 overlay 模式，点击遮罩 / Escape 关闭），内含搜索框 + 物品列表（每行 `ItemTile size="sm"` + 名称）+ 分页（50/页），已选目标高亮禁用，每次打开重置搜索与分页
- 链路页原侧边栏位置（`md:w-72`）改为虚线占位按钮（「+ 添加目标产物」），点击弹出 dialog
- 选中物品后弹窗自动关闭，目标加入已选列表；再次点击占位按钮可继续添加
- E2E「通过弹窗添加目标产物」：点击占位 → dialog 可见 → 点击物品行 → dialog 关闭且目标出现

**涉及文件**：
- `src/components/Factory/FactoryItemPickerDialog.tsx` — 新增选品弹窗
- `src/pages/factory/FactoryChains.tsx` — 侧边栏替换为占位按钮 + 弹窗
- `tests/e2e/src/factory.spec.ts` — 更新添加目标产物用例

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 13/13 passed（含「通过弹窗添加目标产物」）

**提交**：`5c71ff3 fix(factory): chains 添加目标产物改为 ItemTile 弹窗选择`

---

### 2.17 添加目标产物入口与目标产物列表合并

**问题描述**：验收要求「添加目标产物」入口不要单独占用左侧栏，应与目标产物列表放在一起，并使用与目标项相同的样式。

**根因**：2.16 将占位按钮放在独立的左侧栏（`md:w-72`）中，与右侧目标产物列表分离，且为虚线大按钮样式，与目标项（`bg-archive-gold/10` 卡片）风格不一致。

**修复方案**：
- 移除左侧栏布局，恢复单列布局
- 「添加目标产物」按钮移至目标产物列表末尾，复用目标项样式（`flex items-center gap-2 bg-archive-gold/10 rounded px-3 py-2`），图标位置用 ItemTile 同尺寸（`w-12 h-12`）的虚线「+」占位

**涉及文件**：`src/pages/factory/FactoryChains.tsx`

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 13/13 passed

**提交**：`5c71ff3 fix(factory): chains 添加目标产物改为 ItemTile 弹窗选择`

---

### 2.18 目标产物组件改为 fit-content 且名称/产速分行

**问题描述**：验收要求目标产物组件不要占满一行（fit content）；产物名字单独占一行，生产数量（产速输入）换行显示在下方。

**根因**：目标项为块级行（flex 容器默认 stretch 撑满父宽），名称、产速输入、单位全部在同一行内排列。

**修复方案**：
- 目标项与「添加目标产物」按钮加 `w-fit`，宽度按内容自适应
- 目标项内部改为：ItemTile + 右侧纵向 flex（第一行名称，第二行产速输入 + 单位），移除按钮 `self-start` 对齐顶部

**涉及文件**：`src/pages/factory/FactoryChains.tsx`

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 13/13 passed

**提交**：`5c71ff3 fix(factory): chains 添加目标产物改为 ItemTile 弹窗选择`

---

### 2.19 目标产物与添加入口改为横向排列可换行

**问题描述**：验收要求目标产物与「添加目标产物」占位按钮不要各自占一行，应横向排列、允许换行。

**根因**：2.18 中目标项容器为纵向 flex（`flex flex-col`），每个目标项独占一行。

**修复方案**：
- 目标项容器改为 `flex flex-wrap items-center gap-2`，目标项与添加按钮（均已 `w-fit`）横向排列、自动换行
- 「清空」按钮移出换行容器，保持独立一行左对齐

**涉及文件**：`src/pages/factory/FactoryChains.tsx`

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 13/13 passed

**提交**：`5c71ff3 fix(factory): chains 添加目标产物改为 ItemTile 弹窗选择`

---

### 2.20 机器节点配方渲染为原始 itemId 文本

**问题描述**：链路图画布中，机器节点渲染配方时直接显示原始 itemId 文本（如 `item_xxx + item_yyy → item_zzz×2`），而非物品图标。

**根因**：`MachineNode` 中配方以纯文本拼接渲染（`inputs.map(i => i.itemId).join(' + ')`），未使用 ItemTile。

**修复方案**：
- 机器节点配方改为类似「工厂配方」页的展示形式：输入 ItemTile（带数量角标）→ 输出 ItemTile（带数量角标）
- 机器节点宽度随配方物品数动态计算（新增 `nodeSize()`，输入+输出每个 tile 52px + 箭头/边距 40px，最小 120px，高度 180px），dagre 布局与 ReactFlow 显式尺寸统一走该函数
- 新增 E2E「机器节点以物品图标渲染配方」：断言节点文本不含 `item_` 原始 ID、包含 `→`、含多个 `<img>`

**涉及文件**：
- `src/components/Factory/ChainGraph.tsx` — `MachineNode` 配方渲染、新增 `nodeSize()`
- `tests/e2e/src/factory.spec.ts` — 新增用例

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 14/14 passed

**提交**：`bf57442 fix(factory): 链路图机器节点配方改用 ItemTile 渲染并显示名称`

---

### 2.21 链路图中 ItemTile 未显示名称

**问题描述**：链路图机器节点配方中的 ItemTile 未显示物品名称。

**根因**：2.20 实现时配方 ItemTile 传了 `showName={false}`。

**修复方案**：移除机器节点配方 ItemTile 的 `showName={false}`，恢复默认的名称覆盖层展示（名称渲染在 tile 内部底部，不影响节点尺寸）。

**涉及文件**：`src/components/Factory/ChainGraph.tsx`

**验证结果**：✅ lint / test（312 passed）/ build 通过；E2E 制作链路页 14/14 passed

**提交**：`bf57442 fix(factory): 链路图机器节点配方改用 ItemTile 渲染并显示名称`

---

### 2.22 链路图出现零产出封闭子图（左脚踩右脚）＋输入来源细化

**问题描述**：构建链路图时仍会出现净产出为 0 的无用子图——例如 1 个灌装机输入到 2 个拆解机（输入=输出，系统无产出）。以「气态赤铜」为例，正确解应输入赤铜矿，实际却走灌装机↔拆解机互喂回路。同时输入来源需细化：矿机（FactoryMinerTable）/气泵（FactoryGasMinerTable）/水泵（液体硬编码酸+水、耐酸泵抽酸）/种植（采种 1→2 + 种植增产循环）均需在链路图中体现对应机器。

**根因分析**（三层叠加）：
1. `WikiDefaultCraftTable` 的值为 craftId **纯字符串**（如 `"item_gas_copper": "liquid_transmuter_2_gas_gas_copper_1"`），但 `useCraftingChain` 按 `entry.craftId` 对象解析 → `defaultCrafts` 恒为空，官方指定默认配方被静默丢弃；
2. 回退策略 `asOutcome[0]` 按配方表 JSON 键序取首个，气态赤铜/空罐/赤铜块的首个配方恰好都是拆解机/转化机反向配方 → 必然构成净产出比 = 1 的封闭回路；且循环检测只打标记、不回溯尝试备选配方；
3. `FactoryFluidPumpInTable` 实际结构为 `enableLiquidIds: string[]`（不是矿机表的 `mineable[]`），adapter 按 `mineable` 解析 → 水泵来源恒为空，液体永远没有采集源头。

**修复方案**：
- **defaultCrafts 解析**：兼容字符串值（`typeof entry === 'string' ? entry : entry?.craftId`）
- **配方规划回溯**（chain.ts 新增规划阶段）：构建前先以带回溯的 DFS 为每个物品选定配方——候选顺序 用户 override > Wiki 默认 > 表键序；展开中遇到净产出比 ≤ 1 的封闭回路即失败回溯、尝试下一候选；有效循环（netRatio > 1，如采种/种植）允许；无可行配方时回退旧解析并保留封闭回路标记；override 为强制项不参与回溯
- **有效循环产能结算**：构建期循环点只记录不回流；构建结束后统一按稳态结算——循环机器总产 = 外部需求 × netRatio/(netRatio−1)（如目标作物 10/min → 种植机 20/min：10 交付 + 10 回流采种），机器台数/配方速率/物流边按增量补齐，非循环材料（如种植用水）按增量补展开；多目标合并基于「外部需求」一次性放大，不重复翻倍
- **水泵适配修复**：按 `enableLiquidIds` 解析，硬编码白名单 `item_liquid_acid`/`item_liquid_water` 无限采集（uncapped 不封顶）；酸仅 `pump_2` 耐酸水泵支持（表数据自然表达）
- **源节点机器展示**：SourceNode 渲染采集机器图标+名称（矿机/气泵/水泵），nodeSize 相应调整；同物品多台采集机器时保留首个（基础机型）展示

**涉及文件**：
- `src/lib/factory/chain.ts` — 配方规划回溯（planItem/candidateRecipes）、有效循环结算（analyzeCycle + 结算阶段）、uncapped 源
- `src/lib/factory/recipes.ts` — 水泵表 enableLiquidIds 适配 + PUMPABLE_LIQUIDS 白名单
- `src/lib/factory/types.ts` — `FactorySource.uncapped`
- `src/hooks/useData.ts` — defaultCrafts 字符串解析
- `src/components/Factory/ChainGraph.tsx` — SourceNode 机器图标/名称、nodeSize
- `src/lib/factory/chain.test.ts` / `recipes.test.ts` — 新增 10 个单测
- `tests/e2e/src/factory.spec.ts` — 新增 2 个用例（气态赤铜→赤铜矿、种植循环）

**验证结果**：✅ lint / test（323 passed）/ build 通过；E2E 制作链路页 16/16 passed

**提交**：`3b10eb0 fix(factory): 链路求解回溯消除封闭回路并细化采集源头`

---

### 2.23 链路求解未按供给需求综合考虑多种配方

**问题描述**：链路图不考虑供给/需求情况在多种配方间分配。例如息壤（息壤粉末）的制作，应综合考虑「气泵直接采集息壤气（经固气转化机）」与「碳块+水在天有洪炉生产」两种方案，而不是只走 Wiki 默认的洪炉路线。

**根因**：配方规划阶段每个物品只保留单一路线（首个可行配方），且 R4 源优先分支在采集达上限后仅标记 `supplyLimited`，不会把超额需求转交配方路线。

**修复方案**：
- **多路线规划**：`planItem` 从「首个可行即返回」改为收集全部可行配方路线（按 override > Wiki 默认 > 表键序，逐候选验证子树无封闭回路）；采集源物品同样收集路线（供超额转配方）
- **受限路线优先的多路线分配**：构建阶段 `expandRoutes` 按「路线天花板」排序——直接材料有采集上限的路线优先用满（天花板 = 材料剩余上限 × 产出/投入比），剩余需求依次落到不受限路线；全部受限仍有缺口时压给末条路线并以供应受限呈现。息壤粉末 150/min（武陵）= 转化机 100（气泵上限）+ 洪炉 50
- **采集源超额转配方**：R4 分支改为按全局余量分配（多消费方先到先得），超额部分自动走该物品的配方路线（如息壤气目标 100/min = 泵采 20 + 粉末转化 80，粉末由洪炉供给，不构成回路）

**涉及文件**：`src/lib/factory/chain.ts`（planItem 多路线收集、expandRoutes/expandRoute/routeCeiling、R4 超额转配方）

**验证结果**：✅ lint / test（331 passed）/ build 通过；E2E 制作链路页 18/18 passed

**提交**：`96680cc feat(factory): 链路求解按供给需求分配多配方路线，支持区域资源上限与循环预填充标识`

---

### 2.24 区域自然资源上限与区域切换

**问题描述**：需要对整体资源采集设置上限并支持切换区域。武陵地区：息壤气 100/min、惰气 460/min、源矿 540/min、蓝铁矿 120/min、赤铜矿 420/min；四号谷地：源矿 560/min、紫晶矿 240/min、蓝铁矿 1080/min。产出的链路也需要考虑区域最大资源上限。

**根因**：原实现采集上限仅来自矿机/气泵机台产能（produceRate/msPerRound），无区域概念。

**修复方案**：
- 新增 `src/lib/factory/regions.ts`：武陵/四号谷地两区域上限表（默认武陵）；经与需求方确认：**区域内未列出的自然资源不可采集（上限 0）**，需求全部改走配方路线或标记供应受限；液体泵采（酸/水）不受区域限制
- `buildChainGraph` 新增 `regionCaps` 参数：区域模式下列出资源应用区域上限、未列出资源上限 0
- 链路页新增区域切换按钮组（武陵地区/四号谷地），区域与 targets 同步到 URL（`?region=valley4&targets=...`）
- 区域不可采集且无配方路线的资源：源节点零供给标记供应受限，同时标记消费方机器

**涉及文件**：
- `src/lib/factory/regions.ts` — 新增区域定义
- `src/lib/factory/chain.ts` — regionCaps 上限覆盖
- `src/hooks/useData.ts` — `useCraftingChain(targets, regionId)`
- `src/pages/factory/FactoryChains.tsx` — 区域切换 UI + URL 同步
- `scripts/i18n-custom.json` — factory.region / regionWuling / regionValley4（14 语言）

**验证结果**：✅ lint / test（331 passed）/ build 通过；E2E 制作链路页 18/18 passed

**提交**：`96680cc feat(factory): 链路求解按供给需求分配多配方路线，支持区域资源上限与循环预填充标识`

---

### 2.25 有效循环缺少预填充标识

**问题描述**：允许的循环结构（如种植-采种增产循环）需要标识清楚哪个节点需要预填充、按配方提示需预填充什么物品。

**根因**：有效循环在稳态下自给自足，但冷启动时循环消费方（如采种机）没有输入可跑，必须预填一批循环物品才能启动；原实现无此提示。

**修复方案**：有效循环结算时，在循环消费方节点（循环基准物品的回流消费机器，如采种机）标记 `priming = { itemId, count }`（itemId 为循环基准物品如作物，count 为配方投入数）；机器节点渲染「需预填充」+ 物品 ItemTile（带数量角标），节点高度随标识行自适应。

**涉及文件**：
- `src/lib/factory/chain.ts` — 结算阶段 priming 标记
- `src/lib/factory/types.ts` — `ChainNode.priming`
- `src/components/Factory/ChainGraph.tsx` — 预填充标识渲染、nodeSize 高度调整
- `scripts/i18n-custom.json` — factory.priming（14 语言）

**验证结果**：✅ lint / test（331 passed）/ build 通过；E2E 制作链路页 18/18 passed

**提交**：`96680cc feat(factory): 链路求解按供给需求分配多配方路线，支持区域资源上限与循环预填充标识`

---

### 2.26 扩容反应池多配方共炉与炉内级联

**问题描述**：扩容反应池（mix_pool_2）可以处理多个配方，只要缓存区（slot）足够即可，甚至产物也可以在同一反应池内参加下一步反应；需要考虑缓存区数量不能溢出。普通反应池（mix_pool_1）没有这个功能。

**数据考证**（以游戏数据/文本为准）：
- 扩容反应池 = `mix_pool_2`、普通反应池 = `mix_pool_1`（FactoryBuildingTable）
- 缓存区数量在结构化表中不存在（经需求方确认该部分游戏数据尚未解包，以常量维护并注明出处）：教学文案「扩容反应池拥有8个缓存区」→ mix_pool_2 = **8**；「仅有5个缓存区的反应池无法同时进行这3个配方生产」→ mix_pool_1 = **5**
- slot 占用规则取自教学文案：「3个配方一共涉及8种不同的物质」+「将产出的芽针溶液存储在最后一个缓存区中」→ **缓存区占用 = 共炉配方涉及的不同物质种数（投入∪产出，产物也占缓存区，共享物质只算一次）**

**修复方案**：
- **共炉合并**：链路构建后处理 `mergeReactorGroups()`——全图 mix_pool_2 机器节点按缓存区上限贪心装箱（节点创建顺序 ≈ 链路顺序，相连配方相邻），每桶不同物质 ≤ 8 合并为一个反应池节点；与是否相连无关，只要缓存区容纳得下即合并
- **炉内级联**：共炉配方间的内部物流边取消（产物直接作为下一配方原料）；跨池物品保留外部物流边
- **不溢出**：装箱时物质集合超过 8 即拆分为多台反应池；台数 = 桶内各配方产线数最大值（每台可同时跑桶内整套配方）
- **路线优先**：不受限路线中扩容反应池优先于普通反应池（共炉省台数）
- **渲染**：反应池节点展示每条共炉配方（输入 ItemTile → 输出 ItemTile + 产速）与「缓存区 used/total」行；单配方 mix_pool_2 节点也标注缓存区占用
- **副产物适配修复**（附带发现）：配方的 `outcomes` 多 group 语义为「每组一个副产物」（全表 8 个配方，如 污水/惰性壤晶废液），原 adapter 只取首组导致副产物被丢弃——既影响缓存区物质计数，也使副产物物品失去配方路线候选。已改为展开全部产出组（材料侧确认为恒单组，维持取首组）
- **规划校验与修复 pass**（附带发现）：多路线规划在不同 DFS 分支为物品选定路线，跨分支组合后可能残留封闭回路（如气态赫铜=拆解机 × 满赫铜罐=灌装机各自「可行」、组合后互喂；息壤聚合链路真实触发）。规划完成后沿首选路线全局检测净产出比 ≤ 1 的环，剔除环上物品的首选路线并重规划（候选永久排除被剔路线、无替代则恢复原路线由构建阶段标记）。修复后气态赫铜正确走 Wiki 默认的提纯机路线（气态赤铜+滤芯）

**涉及文件**：
- `src/lib/factory/chain.ts` — `REACTOR_BUFFER_SLOTS` 常量（注明文案出处）、`mergeReactorGroups()`、路线排序 pool_2 优先
- `src/lib/factory/recipes.ts` — outcomes 多 group 副产物展开修复
- `src/lib/factory/types.ts` — `ReactorRecipeLine`、`ChainNode.recipes/slotsUsed/slotsTotal`
- `src/components/Factory/ChainGraph.tsx` — 反应池节点多配方渲染、缓存区行、nodeSize
- `src/lib/factory/chain.integration.test.ts` — 真实数据转储集成回归（气态赤铜/息壤聚合/种植）
- `scripts/i18n-custom.json` — factory.reactorSlots（14 语言）

**验证结果**：✅ lint / test（339 passed）/ build 通过；E2E 制作链路页 19/19 passed

**提交**：`f5eaaa7 feat(factory): 扩容反应池多配方共炉与炉内级联（缓存区约束）`

---

## 3. 制作链路重构方案（待 Review）

> **状态**: 🟡 第三轮评审
> **关联**: 制作链路图 `buildChainGraph` + `FactoryChains` 页面 UI

### 3.1 问题背景

当前实现存在以下问题：

1. **循环处理过于简单**：`expand()` 使用 DFS 路径检测，一律标记 `isCycle: true` 并跳过，无法区分有意义的循环和封闭回路
2. **速率计算不完整**：仅按配方产出计算，未考虑上游供应瓶颈
3. **UI 不合理**：左侧列表选择物品效率低，无法调整目标产速
4. **缺少机器数量**：图中未显示每种机器需要多少台
5. **图结构不合理**：以物品节点为中心，应改为以机器节点为中心

### 3.2 循环规则集

#### R0：循环定义

**循环路径**：从物品 A 出发，经过若干配方和中间物品，最终回到 A 的路径。

#### R1：净产出判定（核心规则）

对于检测到的循环，计算循环中被回传物品的**净产出**：

```
净产出 = 循环产出量 - 循环消耗量
```

| 净产出 | 判定 | 行为 |
|--------|------|------|
| > 0 | **有效循环** | 标记 `isCycle: true`，边上标注产出数量，继续向上游展开 |
| ≤ 0 | **封闭回路** | 标记 `isCycle: true` + `cycleType: 'closed'`，停止展开，特殊视觉标记 |

**净产出不做特殊节点标记**，但循环边上必须清晰标注产出数量（如 "×2 产出 / ×1 消耗"）。多层嵌套循环同理，只需标注清楚每层的产出数量。

**示例 1（灌装 → 拆解，净产出=0）**：
- 灌装机消耗 bottle1 ×1，产出 filled_bottle1 ×1
- 拆解机消耗 filled_bottle1 ×1，产出 bottle1 ×1
- 净产出 = 1 - 1 = 0 → 封闭回路，停止展开

**示例 2（采种 → 种植，净产出>0）**：
- 采种机消耗 leaf1 ×1，产出 leaf_seed ×2
- 种植机消耗 leaf_seed ×1，产出 leaf1 ×1
- 净产出 = 2 - 1 = 1 → 有效循环，盈余 1 个 leaf_seed

#### R2：配方比例分析

对循环路径上的每个配方，分析输入/输出比例：

```
比例 = 该配方产出的循环物品数量 / 该配方消耗的循环物品数量
```

| 比例 | 含义 | 处理 |
|------|------|------|
| = 1 | 等量替换 | 可能是封闭回路（需结合 R1 判定） |
| > 1 | 产出 > 消耗 | 循环有盈余 |
| < 1 | 产出 < 消耗 | 循环有亏缺，需外部补给 |

#### R3：副产物隔离

当配方产出多种物品时，只有继续循环的那种产出参与循环判定。其他产出作为**副产物**处理：

- 副产物不参与循环净产出计算
- 副产物在机器节点内显示为产出列表的一部分
- 副产物的速率按实际产出计算

#### R4：外部供应优先

如果循环中的某个物品同时有外部供应（如矿机采集），则在该点**打断循环**：

- 循环在有外部供应的节点处终止
- 外部供应被视为该物品的"真实来源"

#### R5：自消费防护

一个配方不能在无外部供应的情况下消费自己的产出。如果检测到这种配置，标记为异常状态。

#### R6：循环深度限制

为防止复杂链路中的无限递归，设置最大循环检测深度（建议值：10 层）。

### 3.3 速率计算：供应瓶颈规则

**核心原则**：节点的实际产出 = min(配方理论产出, 上游实际供应量)。

当上游链路的供应速率低于配方需求时，当前节点的产出必须按实际供应量结算。

#### 计算公式

```
节点实际产出 = min(
  配方理论产出速率,
  上游实际供应总量 / 配方单位消耗量 × 配方单位产出量
)
```

#### 示例

假设配方：10 个 X → 1 个 Y，耗时 2 秒（即每秒消耗 5 个 X，产出 0.5 个 Y）

| 上游供应 X 的速率 | 配方需求 X 的速率 | 实际产出 Y 的速率 | 说明 |
|-------------------|-------------------|-------------------|------|
| 10 个/2秒 = 5/秒 | 5/秒 | 0.5/秒 | 供需平衡，满产 |
| 10 个/4秒 = 2.5/秒 | 5/秒 | 0.25/秒 | 供应不足，半产 |
| 20 个/2秒 = 10/秒 | 5/秒 | 0.5/秒 | 供应过剩，仍满产 |

**实现方式**：`expand()` 函数在递归展开材料时，将上游的实际供应速率传递下去。当前节点计算产出时，取 min(理论产出, 按实际供应折算的产出)。

```typescript
function expand(itemId: string, availableRate: number, path: Set<string>, targetKey: string) {
  const recipe = resolveRecipe(itemId)
  if (!recipe) { /* 叶子/源节点 */ return }

  const theoryPm = perMinute(outcomeCount, recipe.totalProgress)
  const actualPm = Math.min(theoryPm, availableRate)
  const machineCount = Math.ceil(actualPm / theoryPm)

  for (const mat of recipe.ingredients) {
    const matConsumedPm = perMinute(mat.count, recipe.totalProgress) * machineCount
    expand(mat.itemId, matConsumedPm, newPath, matItemKey)
  }
}
```

### 3.4 物流设施：传送带与液体管道

#### 数据来源

物流设施的吞吐量数据必须从游戏 API 动态读取，**禁止硬编码**：

| 表名 | 用途 | API |
|------|------|-----|
| `FactoryGridBeltTable` | 固体传送带 | `fetchTableAll('FactoryGridBeltTable')` |
| `FactoryLiquidPipeTable` | 液体管道 | `fetchTableAll('FactoryLiquidPipeTable')` |

读取后构建查找表：

```typescript
const beltData = await fetchTableAll('FactoryGridBeltTable')
// → { grid_belt_01: { beltData: { msPerRound: 2000, ... } } }

const pipeData = await fetchTableAll('FactoryLiquidPipeTable')
// → { log_pipe_01: { pipeData: { msPerRound: 500, volume: 1, ... } } }

// 计算吞吐量（个/min 或 单位/min）
function calcThroughput(msPerRound: number, volume: number = 1): number {
  return msPerRound > 0 ? (volume * 60000) / msPerRound : 0
}
```

#### 物流设施在图中的表达

机器之间的连线代表物流设施，需要区分固体传送带和液体管道：

**固体传送带边**：
```
──传送带×3 (90/min)──→
```
- 金色实线 `#C9A96E`
- 方向箭头（`markerEnd`）
- 标签显示：传送带数量 + 总吞吐量

**液体管道边**：
```
──管道×2 (240/min)──→
```
- 蓝色虚线 `#3b82f6` + `strokeDasharray: '8 4'`
- 方向箭头（`markerEnd`）
- 标签显示：管道数量 + 总吞吐量

#### 数量计算

```
传送带数量 = ceil(实际传输速率 / 固体传送带吞吐量)
管道数量 = ceil(实际传输速率 / 液体管道吞吐量)
```

其中吞吐量从上述 API 数据动态计算，不硬编码。

#### 物品类型判断

根据配方数据判断传输的是固体还是液体：

- **液体物品 ID 前缀**：`liquid_`、`acid`、`water`、`oil` 等（需从 `LiquidTable` 确认）
- **固体物品**：其他所有物品
- 边的样式根据传输物品类型自动选择

### 3.5 机器节点为中心的图结构

#### 现有结构（将废弃）

以物品节点为中心：`物品 → 机器 → 物品 → 机器 → ...`

#### 新结构：以机器节点为中心

```
[采种机 ×3] ──传送带×1──→ [种植机 ×2]
     │                         │
     └──砂叶种子──┘        └──砂叶──┘
```

每个机器节点显示：

```
┌─────────────────────────┐
│ [图标] 采种机 ×3         │  ← 机器名 + 数量
│                         │
│ 砂叶 → 砂叶种子 ×2      │  ← 配方摘要（输入 → 产出 ×数量）
│                         │
│ 总产出: 6/min           │  ← 总产出 = 机器数 × 单台产出
│ 传送带: 2/min (输入)    │  ← 入口传送带需求
│         6/min (输出)    │  ← 出口传送带需求
└─────────────────────────┘
```

#### 副产物显示

如果配方有多种产出（如采种机产出砂叶种子 + 砂叶），在节点内列出所有产出：

```
┌─────────────────────────┐
│ [图标] 采种机 ×3         │
│                         │
│ 砂叶 → 砂叶种子 ×2      │  ← 主产出（用于循环）
│            砂叶 ×1      │  ← 副产物（独立产出）
│                         │
│ 总产出: 砂叶种子 6/min   │
│        砂叶 3/min       │
└─────────────────────────┘
```

#### 封闭回路的视觉表达

封闭回路（净产出 ≤ 0）需要特殊标记：

| 元素 | 有效循环 | 封闭回路 |
|------|----------|----------|
| 边样式 | 金色实线 `#C9A96E` | 橙色虚线 `#f59e0b` + `strokeDasharray: '5 5'` |
| 边标签 | 显示产出数量 | 显示 "↻ 封闭" + 产出数量 |
| 动画 | 无 | 有（流动动画提示循环） |
| 节点标记 | 无 | 封闭回路涉及的节点加锁图标 🔒 |

### 3.6 UI 重构：下拉选择 + 多目标 + 可调产速

#### 现有 UI（将废弃）

左侧分页列表 + 移动端折叠下拉，点击添加为目标产物。

#### 新 UI 设计

**布局**：顶部控制栏 + 全宽图

```
┌─────────────────────────────────────────────────────────┐
│  目标 1: [▼ 中容武陵电池     ] 产速: [6.0] 个/min  [×]  │
│  目标 2: [▼ 高纯硅晶片       ] 产速: [3.5] 个/min  [×]  │
│  [+ 添加目标产物]                                        │
│                                                         │
│                 [ReactFlow 链路图]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**交互流程**：

1. **选择目标产物**：下拉选择器，列出所有可制造物品（按 rarity 倒序），支持搜索
2. **设置需求产速**：选择后自动填入配方默认产速（如 6 个/min），用户可修改（允许非整数）
3. **添加多个目标**：点击 "+ 添加目标产物" 增加新目标，每个目标独立设置产速
4. **删除目标**：每个目标右侧有 [×] 按钮可删除
5. **实时求解**：产速变化时自动重新计算链路图（所有目标合并求解）
6. **URL 同步**：`?targets=xxx:6,yyy:3.5`，刷新后保持状态

#### URL 参数设计

```
?targets=iron_ingot:10,steel_ingot:5
```

格式：`targets={itemId}:{rate},{itemId}:{rate},...`

- 支持多个目标，逗号分隔
- 每个目标格式为 `{itemId}:{rate}`
- rate 为非负数，允许小数

#### 数据流

```
用户选择目标 → 设置产速 → buildChainGraph([{id, rate}, ...])
                                  ↓
                            合并求解所有目标
                                  ↓
                            链路图渲染（机器节点 + 传送带）
```

### 3.7 实现方案概要

#### 类型变更

```typescript
// types.ts
interface ChainTarget {
  itemId: string
  rate: number        // 需求产速（个/min），允许非负数
}

interface ChainEdge {
  from: string        // 源机器节点 key
  to: string          // 目标机器节点 key
  itemIds: string[]   // 传输的物品 ID 列表
  perMinute: number   // 传输速率（个/min 或 单位/min）
  beltCount: number   // 需要的传送带数量（固体）或管道数量（液体）
  isPipe: boolean     // 是否为液体管道
  isCycle?: boolean
  cycleType?: 'productive' | 'closed'
  cycleOutput?: number
  cycleInput?: number
}

interface ChainNode {
  key: string
  kind: 'machine' | 'source'
  machineId: string
  machineName: string
  machineIcon: string
  machineCount: number     // 需要的机器数量（向上取整）
  recipe: {
    id: string
    inputs: { itemId: string; count: number; rate: number }[]
    outputs: { itemId: string; count: number; rate: number }[]
    totalProgress: number
  }
  actualPm: number         // 实际产出速率（所有产出的总和）
  theoryPm: number         // 单台理论产出速率
  isClosedLoop?: boolean   // 是否涉及封闭回路
}
```

#### 核心函数重构

```typescript
function buildChainGraph(
  targets: ChainTarget[],          // 多目标 + 产速
  recipes: FactoryRecipe[],
  index: FactoryItemIndex,
  sources: FactorySource[],
  defaultCrafts: Record<string, string>,
  recipeOverride?: Record<string, string>,
  machines?: Record<string, { name: string; iconId: string }>,
  beltTable?: Record<string, any>,  // FactoryGridBeltTable 数据
  pipeTable?: Record<string, any>,  // FactoryLiquidPipeTable 数据
): ChainGraph
```

#### expand 函数签名变更

```typescript
function expand(
  itemId: string,
  availableRate: number,    // 上游实际可用速率
  path: Set<string>,
  targetKey: string,
)
```

#### 新增函数

```typescript
function calcCycleOutput(
  cycleItems: string[],
  recipeById: Map<string, FactoryRecipe>,
): { netOutput: number; outputQty: number; inputQty: number }

function calcMachineCount(actualPm: number, theoryPm: number): number {
  return Math.ceil(actualPm / theoryPm)
}

// 从 API 数据动态计算吞吐量
function calcThroughput(msPerRound: number, volume: number = 1): number {
  return msPerRound > 0 ? (volume * 60000) / msPerRound : 0
}

// 计算所需运输设施数量（传送带或管道）
function calcTransportCount(
  rate: number,
  transportTable: Record<string, any>,  // FactoryGridBeltTable 或 FactoryLiquidPipeTable
  isPipe: boolean,
): number {
  // 取第一个设施的吞吐量（当前游戏只有一种传送带/管道）
  const entry = Object.values(transportTable)[0]
  const data = isPipe ? entry.pipeData : entry.beltData
  const throughput = calcThroughput(data.msPerRound, data.volume ?? 1)
  return throughput > 0 ? Math.ceil(rate / throughput) : 0
}
```

#### FactoryChains 页面重构

- 移除左侧列表 + 分页逻辑
- 新增顶部多目标选择器 + 产速输入框
- URL 参数从 `targets` 改为 `targets=id:rate,id:rate`
- 移除 `LIST_PAGE_SIZE`、`listPage`、`mobileOpen` 等状态

#### ChainGraph 组件变更

- 节点类型从 `item` + `machine` 简化为 `machine` + `source`
- MachineNode 显示：机器名、数量、配方摘要、总产出、传送带需求
- 边渲染根据 `cycleType` 区分样式
- 封闭回路边使用虚线 + 动画，节点加锁图标

### 3.8 规则总结表

| 规则 | 名称 | 作用 | 优先级 |
|------|------|------|--------|
| R0 | 循环定义 | 定义什么构成循环 | 基础 |
| R1 | 净产出判定 | 决定循环是否有效，≤0 为封闭回路 | 核心 |
| R2 | 配方比例分析 | 分析单个配方的输入输出比 | 辅助 |
| R3 | 副产物隔离 | 处理多产出配方 | 辅助 |
| R4 | 外部供应优先 | 打断有外部来源的循环 | 优先 |
| R5 | 自消费防护 | 检测不可能的配置 | 优先 |
| R6 | 循环深度限制 | 防止无限递归 | 安全 |
| R7 | 供应瓶颈 | 实际产出 = min(理论产出, 上游供应) | 核心 |
| R8 | 机器数量 | 每个节点显示所需机器台数 | 核心 |
| R9 | 传送带/管道数量 | 每条边显示所需传送带或管道数（从 API 动态计算） | 核心 |
| R10 | 液体管道区分 | 根据物品类型自动选择边样式 | 核心 |

### 3.9 单元测试用例设计

所有测试写入 `src/lib/factory/chain.test.ts`，按功能模块分组。

#### 3.9.1 循环规则测试

```typescript
describe('cycle rules', () => {
  // --- R1: 净产出判定 ---

  describe('R1: net output determination', () => {
    it('closed loop: filling→dismantling (1:1 ratio, net=0)', () => {
      // 灌装机: liquid1 + bottle1 → filled_bottle1
      // 拆解机: filled_bottle1 → liquid1 + bottle1
      // 净产出 = 1 - 1 = 0 → 封闭回路
      const graph = buildChainGraph(...)
      const cycleEdges = graph.edges.filter(e => e.isCycle)
      expect(cycleEdges.some(e => e.cycleType === 'closed')).toBe(true)
      // 封闭回路不应继续展开上游
    })

    it('productive loop: seed_collector→planter (2:1 ratio, net>0)', () => {
      // 采种机: leaf1 → leaf_seed ×2
      // 种植机: leaf_seed ×1 → leaf1 ×1
      // 净产出 = 2 - 1 = 1 → 有效循环
      const graph = buildChainGraph(...)
      const cycleEdges = graph.edges.filter(e => e.isCycle)
      expect(cycleEdges.some(e => e.cycleType === 'productive')).toBe(true)
      // 有效循环应继续展开，盈余部分作为需求
    })

    it('deficit loop: net output < 0 stops expansion', () => {
      // 配方 A→B ×1, 配方 B→A ×0.5
      // 净产出 = 1 - 0.5 = 0.5 > 0 → 有效循环
      // 但如果反过来：A→B ×0.5, B→A ×1
      // 净产出 = 0.5 - 1 = -0.5 < 0 → 亏缺回路
    })

    it('cycle edge displays output/input quantities', () => {
      // 验证 cycleOutput 和 cycleInput 字段正确标注
      const graph = buildChainGraph(...)
      const cycleEdge = graph.edges.find(e => e.isCycle)
      expect(cycleEdge!.cycleOutput).toBeGreaterThan(0)
      expect(cycleEdge!.cycleInput).toBeGreaterThan(0)
    })
  })

  // --- R2: 配方比例分析 ---

  describe('R2: recipe ratio analysis', () => {
    it('1:1 ratio detects as potential closed loop', () => {})
    it('2:1 ratio detects as productive cycle', () => {})
    it('1:2 ratio detects as deficit cycle', () => {})
  })

  // --- R3: 副产物隔离 ---

  describe('R3: byproduct isolation', () => {
    it('multi-output recipe: only cycle output counted for net output', () => {
      // 采种机产出 leaf_seed ×2 + leaf ×1
      // 只有 leaf_seed 参与循环判定
      // leaf 作为副产物独立显示
    })

    it('byproduct appears in node output list', () => {
      // 验证 node.recipe.outputs 包含副产物
    })
  })

  // --- R4: 外部供应优先 ---

  describe('R4: external supply priority', () => {
    it('cycle broken at node with external source', () => {
      // 物品 A 既有循环产出，又有矿机供应
      // 循环在 A 处终止，矿机作为真实来源
    })
  })

  // --- R5: 自消费防护 ---

  describe('R5: self-consumption prevention', () => {
    it('recipe consuming its own output without external supply', () => {
      // 配方 A→A，无外部供应
      // 应标记为异常
    })
  })

  // --- R6: 循环深度限制 ---

  describe('R6: cycle depth limit', () => {
    it('stops expansion at max depth (10)', () => {
      // 构建深度 > 10 的链路
      // 验证不超过 10 层
    })
  })
})
```

#### 3.9.2 供应瓶颈测试

```typescript
describe('supply bottleneck (R7)', () => {
  it('full production when supply meets demand', () => {
    // 配方: 10X → 1Y, 2秒
    // 上游供应 X: 5/秒 (刚好满足)
    // 预期: Y 产出 = 0.5/秒 (满产)
  })

  it('reduced production when supply insufficient', () => {
    // 配方: 10X → 1Y, 2秒
    // 上游供应 X: 2.5/秒 (只有一半)
    // 预期: Y 产出 = 0.25/秒 (半产)
  })

  it('production capped at theory even with excess supply', () => {
    // 配方: 10X → 1Y, 2秒
    // 上游供应 X: 10/秒 (过剩)
    // 预期: Y 产出 = 0.5/秒 (仍满产，不会超产)
  })

  it('machine count reflects actual production', () => {
    // 实际产出 0.25/秒，理论产出 0.5/秒
    // 需要 1 台机器 (ceil(0.25/0.5) = 1)
  })

  it('cascading bottleneck: multi-level supply chain', () => {
    // A→B→C，每级都有供应瓶颈
    // 验证最终产出正确结算
  })
})
```

#### 3.9.3 机器数量测试

```typescript
describe('machine count (R8)', () => {
  it('single machine when demand equals theory rate', () => {
    // 理论产出 1/min，需求 1/min → 1 台
  })

  it('multiple machines when demand exceeds single machine', () => {
    // 理论产出 1/min，需求 3/min → 3 台
  })

  it('ceiling rounding for fractional machines', () => {
    // 理论产出 1/min，需求 2.5/min → 3 台 (ceil)
  })

  it('machine count displayed on node', () => {
    // 验证 node.machineCount 字段
  })

  it('total output = machineCount × theoryPm', () => {
    // 验证 node.actualPm = machineCount × theoryPm
  })
})
```

#### 3.9.4 传送带/管道数量测试

```typescript
describe('transport count (R9)', () => {
  const mockBeltTable = {
    grid_belt_01: { beltData: { msPerRound: 2000 } }
  }
  const mockPipeTable = {
    log_pipe_01: { pipeData: { msPerRound: 500, volume: 1 } }
  }

  it('belt count: 30/min throughput', () => {
    // 传输速率 60/min → 需要 2 条传送带 (ceil(60/30))
  })

  it('pipe count: 120/min throughput', () => {
    // 传输速率 200/min → 需要 2 条管道 (ceil(200/120))
  })

  it('fractional belt count rounds up', () => {
    // 传输速率 31/min → 需要 2 条传送带 (ceil(31/30))
  })

  it('edge.isPipe flag set correctly for liquid items', () => {
    // 液体物品的边 isPipe = true
    // 固体物品的边 isPipe = false
  })
})
```

#### 3.9.5 液体管道区分测试

```typescript
describe('liquid pipe distinction (R10)', () => {
  it('liquid item detected by ID prefix', () => {
    // liquid_acid, water, oil → isPipe = true
  })

  it('solid item has isPipe = false', () => {
    // iron_ore, coal → isPipe = false
  })

  it('pipe edge uses different visual style', () => {
    // 验证 isPipe 影响边样式（通过 edge 属性间接验证）
  })
})
```

#### 3.9.6 多目标测试

```typescript
describe('multi-target support', () => {
  it('single target works as before', () => {
    // 单目标回归测试
  })

  it('two targets share intermediate machines', () => {
    // 目标 A 和 B 都需要 iron_ingot
    // 验证 iron_ingot 节点的机器数量取 max（而非 sum）
  })

  it('independent targets produce separate subgraphs', () => {
    // 两个无关联的目标
    // 验证图中包含两个独立的子图
  })

  it('target rate affects machine count', () => {
    // 目标 rate=6 → 需要 N 台机器
    // 目标 rate=12 → 需要 2N 台机器
  })
})
```

#### 3.9.7 非整数产速测试

```typescript
describe('non-integer rates', () => {
  it('accepts fractional target rate', () => {
    // rate=2.5 → 正确计算
  })

  it('zero rate produces empty chain', () => {
    // rate=0 → 无节点
  })

  it('very small rate still produces valid chain', () => {
    // rate=0.1 → 机器数量 ceil(0.1/theoryPm)
  })
})
```

#### 3.9.8 calcThroughput 测试

```typescript
describe('calcThroughput', () => {
  it('calculates belt throughput from msPerRound', () => {
    // msPerRound=2000 → 30/min
    expect(calcThroughput(2000)).toBe(30)
  })

  it('calculates pipe throughput from msPerRound and volume', () => {
    // msPerRound=500, volume=1 → 120/min
    expect(calcThroughput(500, 1)).toBe(120)
  })

  it('returns 0 for zero msPerRound', () => {
    expect(calcThroughput(0)).toBe(0)
  })
})
```

### 3.10 涉及文件

| 文件 | 变更 |
|------|------|
| `src/lib/factory/types.ts` | `ChainTarget` 新增；`ChainEdge` 重构；`ChainNode` 重构 |
| `src/lib/factory/chain.ts` | 重构 `buildChainGraph`（多目标+产速）、`expand`（供应瓶颈）、新增 `calcCycleOutput`/`calcMachineCount`/`calcTransportCount` |
| `src/hooks/useData.ts` | `useCraftingChain` 签名变更（多目标+产速）；新增加载 `FactoryGridBeltTable`、`FactoryLiquidPipeTable` |
| `src/pages/factory/FactoryChains.tsx` | 移除左侧列表，新增多目标下拉选择器+产速输入框 |
| `src/components/Factory/ChainGraph.tsx` | 重构为机器节点为中心；MachineNode 显示配方/数量/传送带；边渲染区分循环类型 |
| `src/i18n/dicts/*.json` | 新增 i18n key |
| `tests/e2e/src/factory.spec.ts` | 更新 E2E 测试适配新 UI |
| `src/lib/factory/chain.test.ts` | 新增循环规则、供应瓶颈、机器数量、传送带数量的单元测试 |

### 3.11 物流设施调研结果

#### 固体传送带

| 项目 | 值 |
|------|-----|
| 传送带类型 | 仅 `grid_belt_01`（无升级版本） |
| `msPerRound` | 2000ms（2 秒/轮） |
| 每轮传输量 | 1 个物品 |
| 单条吞吐量 | **30 个/min** |
| 相关设施 | 分流器 `log_splitter`、合流器 `log_converger`、连接器 `log_connector`、调节器 `log_conditioner` |

#### 液体管道

| 项目 | 值 |
|------|-----|
| 管道类型 | 仅 `log_pipe_01`（无升级版本） |
| `msPerRound` | 500ms（0.5 秒/轮） |
| 每轮传输量 | 1 单位（`volume: 1`） |
| 单条吞吐量 | **120 单位/min** |
| 地下管道 | `udpipe_loader_1/2`、`udpipe_unloader_1/2`（用于穿越地形） |

#### 固体 vs 液体对比

| 属性 | 传送带 | 液体管道 |
|------|--------|----------|
| 传输间隔 | 2000ms | 500ms |
| 单条吞吐量 | 30 个/min | 120 单位/min |
| 传输物品类型 | 固体物品 | 液体（酸液、水、油等） |
| 图中边样式 | 实线 + 方向箭头 | 蓝色虚线 + 方向箭头 |

### 3.12 确认结论

| 问题 | 结论 |
|------|------|
| 传送带吞吐量 | ✅ 确认：每轮传输 1 个物品，30 个/min |
| 多目标图合并 | ✅ 在一张图内完成多目标计算，不考虑图合并 |
| 传送带方向 | ✅ 需要显示机器的传送带方向箭头 |
| 液体管道 | ✅ 需要支持液体管道的展示，与固体传送带区分 |

---

## 4. 修复总览

| # | 问题 | 根因 | 修复 commit |
|---|------|------|-------------|
| 2.1 | 左侧列表无分页 | 无分页机制 | `b832dc0` |
| 2.2 | 右侧配方无分页 | 无分页机制 | `6d8e5c7` |
| 2.3 | FullBottleTable 重复加载 | 无 in-flight 去重 | `f8fc0c5` + `a79f9f8` |
| 2.4 | ItemTable 重复加载 | 同上 | `a79f9f8` |
| 2.5 | 物品 ID 来源错误 | 依赖外部索引表 | `c860ff0` |
| 2.6 | 配方 ID 永远为空 | adapter 字段名错误 | `3847de7` |
| 2.7 | 数据结构不匹配 | adapter 格式假设错误 | `92e5c0c` |
| 2.8 | 配方展示逻辑错误 | 未按产品文档实现 | `2f785b6` |
| 2.9 | 物品列表排序错误 | 按字母而非稀有度 | `25aeb57` |
| 2.10 | 移动端选择体验差 | 列表始终展开 | `25aeb57` |
| 2.11 | 链路图连线不可见 | ReactFlow 默认 CSS 覆盖边样式 | `a6fdb27` + `2e821ac` |
| 2.12 | 链路页选品 UI 与配方页不一致 | 链路页用搜索弹窗，配方页用侧边栏 | `159ca08` |
| 2.13 | 机器节点缺少名字和图标 | buildChainGraph 未传入 machines 数据 | `769a3b7` |
| 2.14 | 机器图标资源路径错误 | 使用 itemicon/ 而非 buildingpanelicon/ | `0cf0ef6` |
| 2.15 | 添加目标产物未使用 ItemTile 展示 | chain v2 改用原生 `<select>`，无法渲染图标 | `5c71ff3`（被 2.16 取代） |
| 2.16 | 添加目标产物改为占位按钮 + 弹窗选择 | 常驻侧边栏占用链路图空间 | `5c71ff3` |
| 2.17 | 添加入口与目标列表分离且样式不一 | 占位按钮在独立左侧栏 | `5c71ff3` |
| 2.18 | 目标产物组件占满整行、名称产速同行 | 块级行布局 + 单行排列 | `5c71ff3` |
| 2.19 | 目标产物与添加入口各占一行 | 纵向 flex 容器 | `5c71ff3` |
| 2.20 | 机器节点配方渲染为原始 itemId | 配方以纯文本拼接渲染 | `bf57442` |
| 2.21 | 链路图 ItemTile 未显示名称 | 配方 ItemTile 误传 showName={false} | `bf57442` |
| 2.22 | 链路图零产出封闭子图；输入来源未细化 | defaultCrafts 字符串值被丢弃 + 键序回退选中拆解机 + 闭环不回溯；水泵表结构误配 | `3b10eb0` |
| 2.23 | 链路求解不按供给需求综合多种配方 | 单一路线规划 + 源达上限后超额不走配方 | `96680cc` |
| 2.24 | 缺少区域资源上限与区域切换 | 无区域概念，采集上限仅来自机台产能 | `96680cc` |
| 2.25 | 有效循环缺少预填充标识 | 未提示循环消费方冷启动需预填物品 | `96680cc` |
| 2.26 | 扩容反应池未支持多配方共炉与炉内级联 | 每配方独立机器节点，无缓存区概念 | `f5eaaa7` |

---

### 问题 12：编写制作链路连线 E2E 测试

**问题描述**：验收要求编写 E2E 测试，验证选择 `item_proc_battery_5` 后链路图的连线都正常连接。

**根因分析**：
1. 初版无链路图连线的 E2E 测试。
2. 链路图边不渲染的根因：ReactFlow 的 `getEdgePosition()` 内部调用 `isNodeInitialized()` 检查节点是否已初始化，要求 `node.measured.width || node.width || node.initialWidth` 为真。由于自定义节点通过 DOM 测量获取尺寸，首帧渲染时 `measured.width` 尚未赋值，导致 `isNodeInitialized()` 返回 false，`getEdgePosition()` 返回 null，EdgeWrapper 组件因 `sourceX === null` 返回 null。仅1条边（恰好节点先被测量）渲染成功，其余33条边全部隐藏。

**修复方案**：
1. 在 `layoutGraph` 函数中为每个节点显式设置 `width` 和 `height`（与 dagre 布局使用的尺寸一致），使 `isNodeInitialized()` 在首帧即返回 true
2. 移除之前为绕过此问题而添加的自定义 SVG 边渲染层（`.chain-custom-edges`），使用 ReactFlow 原生边
3. E2E 验证：检查 `.react-flow__edge` 元素数量 > 10

**涉及文件**：
- `src/components/Factory/ChainGraph.tsx` — 为节点添加 `width`/`height`，移除自定义 SVG overlay
- `tests/e2e/src/factory.spec.ts` — 更新连线验证用例为仅检查原生边

**验证结果**：✅ E2E 1/1 passed（34 条 ReactFlow 原生边）

---

### 问题 13：机器节点渲染名字和图标

**问题描述**：制作链路图中机器节点存在但无名字和图标内容。

**根因分析**：
1. `ChainNode` 类型缺少 `machineName` 和 `machineIcon` 字段
2. `buildChainGraph` 未接收 `machines` 数据
3. `layoutGraph` 中 `machineName` 和 `machineIcon` 硬编码为空字符串

**修复方案**：
1. `ChainNode` 新增 `machineName` 和 `machineIcon` 可选字段
2. `buildChainGraph` 新增可选 `machines` 参数，创建机器节点时从 `machines[recipe.machineId]` 填充
3. `useCraftingChain` 传递 `factoryData.machines` 到 `buildChainGraph`
4. `layoutGraph` 从节点数据读取而非硬编码空值
5. E2E 验证：检查 `.react-flow__node-machine` 存在、文本非空、包含 `<img>` 元素

**涉及文件**：
- `src/lib/factory/types.ts`、`src/lib/factory/chain.ts`、`src/hooks/useData.ts`、`src/components/Factory/ChainGraph.tsx`
- `tests/e2e/src/factory.spec.ts` — 新增 `'机器节点渲染名字和图标'` 用例

**验证结果**：✅ E2E 1/1 passed

---

### 问题 14：机器图标资源路径错误

**问题描述**：机器图标加载 404，URL 使用 `itemicon/` 路径。

**根因分析**：`iconOnPanel` 值（如 `icon_port_furnance_1`）对应资源在 `factory/buildingpanelicon/` 目录。通过 API 查询 `FactoryBuildingTable` 并搜索 asset bundle 确认正确路径为 `assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/{iconOnPanel}.png`。

**修复方案**：三处机器图标 URL 从 `itemicon/` 改为 `factory/buildingpanelicon/`。

**涉及文件**：
- `src/components/Factory/ChainGraph.tsx`、`src/pages/factory/FactoryRecipes.tsx`、`src/components/Craft/RecipeCard.tsx`

**验证结果**：✅ lint/build/test 全部通过

---

## 5. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors |
| `npm run test` | ✅ 312 tests passed |
| `npm run build` | ✅ 构建成功 |
| E2E `factory.spec.ts`（制作链路页） | ✅ 13/13 passed（2.15 修复后复跑） |

---

## 6. 经验总结

### 6.1 数据适配层

- **字段名假设需验证**：`adaptFactoryRecipe` 假设字段为 `formulaId`，实际为 `id`，导致全局性 bug。新模块上线前应先抽样验证原始数据结构。
- **数据格式需实际验证**：`flattenGroup` 假设 `[][]` 格式，实际为 `[{ group: [] }]`。应先 curl 抽样确认。

### 6.2 缓存策略

- **in-flight 去重**：`getCachedData` 缺少请求去重，并发调用同一 key 会触发多次请求。应在缓存层统一处理。
- **预加载**：高频使用的表（`ItemTable`、`FullBottleTable`）应在数据 hook 中预加载。

### 6.3 分页

- **左列表 + 右配方都需分页**：物品数量和配方数量都可能很大，两端都需要分页控制。

### 6.4 验收流程

- **先跑 E2E 再验收**：E2E 测试能快速发现渲染问题（如数据结构不匹配导致的空白页）。
- **截图辅助定位**：Playwright 的 `test-failed-1.png` 截图能直观展示页面状态，加速问题定位。

### 6.5 ReactFlow 节点初始化与边渲染

- **`isNodeInitialized` 要求显式尺寸**：ReactFlow 的 `getEdgePosition()` 内部检查 `isNodeInitialized()`，要求 `node.measured.width || node.width || node.initialWidth` 为真。使用自定义节点时，首帧渲染 DOM 尚未被 ResizeObserver 测量，`measured.width` 为 undefined，导致边全部返回 null。
- **修复方式**：在 dagre 布局后为节点显式设置 `width`/`height`，与 dagre 计算的尺寸一致。这样 ReactFlow 首帧即可正确计算边位置。
- **React 19 + zustand v4 无兼容性问题**：之前误判为 zustand 订阅问题，实际是节点尺寸未就绪。ReactFlow 原生边在节点有显式尺寸后正常渲染。
- **不要过早绕过**：遇到库内部渲染问题时，先加日志确认根因（store 数据 vs DOM 渲染），再决定是绕过还是修复配置。
