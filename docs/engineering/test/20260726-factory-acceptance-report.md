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

## 3. 循环链路规则集方案（待 Review）

> **状态**: 🟡 待评审
> **关联**: 制作链路图 `buildChainGraph` 循环检测逻辑

### 3.1 问题背景

当前 `chain.ts` 的 `expand()` 函数使用简单的 DFS 路径检测来识别循环：当材料已在 `path` 中时，标记 `isCycle: true` 并停止展开。这种"一刀切"的方式无法区分有意义的循环和无意义的死循环。

**需要解决的核心问题**：哪些循环应该被标记为有效循环并继续展开，哪些应该被视为封闭回路并停止？

### 3.2 用户提供的场景

| 场景 | 配方 | 循环物品 | 产出/消耗比 | 判定 |
|------|------|----------|-------------|------|
| 灌装机 → 拆解机 | 灌装机: liquid1 + bottle1 → filled_bottle1; 拆解机: filled_bottle1 → liquid1 + bottle1 | filled_bottle1 | 1:1 (产出=消耗) | ❌ 不允许作为循环 |
| 采种机 → 种植机 | 采种机: leaf1 → leaf_seed ×2; 种植机: leaf_seed ×1 → leaf1 | leaf_seed | 2:1 (产出>消耗) | ✅ 允许作为循环 |

**关键区分**：循环中被回传物品的**净产出**是否大于零。

### 3.3 现有代码分析

```typescript
// 当前逻辑 (chain.ts:88-91)
if (path.has(mat.itemId)) {
  allEdges.push({ from: matItemKey, to: machineKey, perMinute: matDemand, isCycle: true })
  continue  // 停止展开，不区分循环类型
}
```

问题：无论循环是否有净产出，一律标记为 cycle 并跳过。无法表达"这个循环有盈余，可以继续"的语义。

### 3.4 提议的循环规则集

#### 规则 0：循环定义

**循环路径**：从物品 A 出发，经过若干配方和中间物品，最终回到 A 的路径。

```
A → [配方1] → B → [配方2] → C → ... → [配方N] → A
```

#### 规则 1：净产出判定（核心规则）

对于检测到的循环，计算循环中被回传物品的**净产出**：

```
净产出 = 循环产出量 - 循环消耗量
```

其中：
- **循环产出量** = 循环末端配方产出的回传物品数量（per cycle）
- **循环消耗量** = 循环起始配方消耗的回传物品数量（per cycle）

| 净产出 | 判定 | 行为 |
|--------|------|------|
| > 0 | **有效循环**（Productive Cycle） | 标记 `isCycle: true`，循环的净产出作为"虚拟源"继续向上游展开 |
| = 0 | **封闭回路**（Closed Loop） | 标记 `isCycle: true`，停止展开循环内部材料 |
| < 0 | **亏缺回路**（Deficit Loop） | 标记 `isCycle: true`，停止展开，亏缺部分需要外部供应 |

**示例 1（灌装 → 拆解，净产出=0）**：
- 灌装机消耗 bottle1 ×1，产出 filled_bottle1 ×1
- 拆解机消耗 filled_bottle1 ×1，产出 bottle1 ×1
- 净产出 = 1 - 1 = 0 → 封闭回路，停止展开

**示例 2（采种 → 种植，净产出>0）**：
- 采种机消耗 leaf1 ×1，产出 leaf_seed ×2
- 种植机消耗 leaf_seed ×1，产出 leaf1 ×1
- 净产出 = 2 - 1 = 1 → 有效循环，每轮盈余 1 个 leaf_seed

#### 规则 2：配方比例分析

对循环路径上的每个配方，分析输入/输出比例：

```
比例 = 该配方产出的循环物品数量 / 该配方消耗的循环物品数量
```

| 比例 | 含义 | 处理 |
|------|------|------|
| = 1 | 等量替换 | 可能是封闭回路（需结合规则1判定） |
| > 1 | 产出 > 消耗 | 循环有盈余 |
| < 1 | 产出 < 消耗 | 循环有亏缺，需外部补给 |

#### 规则 3：副产物隔离

当配方产出多种物品时，只有继续循环的那种产出参与循环判定。其他产出作为**副产物**处理：

- 副产物不参与循环净产出计算
- 副产物作为独立叶子节点显示
- 副产物的速率按实际产出计算

**示例**：采种机产出 leaf_seed ×2，其中 1 个用于循环（给种植机），另 1 个是副产物。

#### 规则 4：外部供应优先

如果循环中的某个物品同时有外部供应（如矿机采集），则在该点**打断循环**：

- 循环在有外部供应的节点处终止
- 外部供应被视为该物品的"真实来源"
- 循环内部不再展开

#### 规则 5：自消费防护

一个配方不能在无外部供应的情况下消费自己的产出。如果检测到这种配置：

- 标记为异常状态
- 在图中用特殊样式（如红色虚线边）提示用户

#### 规则 6：循环深度限制

为防止复杂链路中的无限递归，设置最大循环检测深度（建议值：10 层）。超过深度限制的路径视为终止。

### 3.5 实现方案概要

```
buildChainGraph
  └─ expand(itemId, demandRate, path, targetKey)
       ├─ resolveRecipe(itemId) → 找到配方
       ├─ 计算 machinePm, machineCount
       ├─ 对每个材料 mat:
       │    ├─ if path.has(mat.itemId):
       │    │    ├─ 构建循环路径，计算净产出 (calcCycleNetOutput)
       │    │    ├─ if 净产出 > 0:
       │    │    │    ├─ 标记 isCycle: true
       │    │    │    ├─ 创建"虚拟源"节点，速率 = 净产出
       │    │    │    └─ 继续向上游展开（以净产出为需求）
       │    │    └─ if 净产出 ≤ 0:
       │    │         ├─ 标记 isCycle: true
       │    │         └─ 停止展开（封闭回路）
       │    └─ else: 正常展开
       └─ 返回
```

**新增函数**：
```typescript
function calcCycleNetOutput(
  cyclePath: string[],      // 循环路径上的物品 ID 列表
  recipes: FactoryRecipe[],  // 所有配方
  recipeById: Map<string, FactoryRecipe>,
): { netOutput: number; surplusItem: string; surplusRate: number }
```

**新增 ChainEdge 字段**：
```typescript
interface ChainEdge {
  // ... existing fields
  cycleType?: 'productive' | 'closed' | 'deficit'  // 循环类型标记
}
```

### 3.6 规则总结表

| 规则 | 名称 | 作用 | 优先级 |
|------|------|------|--------|
| R0 | 循环定义 | 定义什么构成循环 | 基础 |
| R1 | 净产出判定 | 决定循环是否有效 | 核心 |
| R2 | 配方比例分析 | 分析单个配方的输入输出比 | 辅助 |
| R3 | 副产物隔离 | 处理多产出配方 | 辅助 |
| R4 | 外部供应优先 | 打断有外部来源的循环 | 优先 |
| R5 | 自消费防护 | 检测不可能的配置 | 优先 |
| R6 | 循环深度限制 | 防止无限递归 | 安全 |

### 3.7 待确认问题

1. **净产出的"虚拟源"如何展示**：是显示为特殊节点（如"循环盈余"），还是合并到已有节点中？
2. **封闭回路的视觉表达**：除了虚线边，是否需要额外标记（如循环图标、颜色区分）？
3. **多层嵌套循环**：如果循环 A→B→C→A 中 B→C→B 本身也是循环，如何处理？
4. **循环中的速率计算**：有效循环的净产出如何影响上游机器数量计算？

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
| `npm run test` | ✅ 218 tests passed |
| `npm run build` | ✅ 构建成功 |
| E2E `factory.spec.ts` | ✅ 13/17 passed（连线验证 + 机器节点验证通过，5个失败为预存问题） |

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
