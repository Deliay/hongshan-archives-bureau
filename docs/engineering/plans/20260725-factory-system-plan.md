---
description: 工厂系统（工厂配方 + 制作链路）实现方案：数据适配层、通用配方组件、子路由框架、链路图构建与渲染的分阶段实施清单
type: Fleeting
---

# 工厂系统（工厂配方与制作链路） - 实现方案

**对应产品文档**: [[20260725-factory-system|工厂系统（工厂配方与制作链路）]]
**对应技术方案**: [[20260725-factory-system|工厂系统（工厂配方与制作链路） - 技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-25
**作者**: 前端工程
**开发分支**: `feat/factory-archive`

## 1. 概述

### 1.1 目标

将已评审的产品文档与技术方案转化为可执行的实现清单，分阶段落地：工厂数据适配层 → 通用配方组件 → 子路由框架与工厂配方页 → 链路构建算法与制作链路页 → 测试与验证。

### 1.2 范围

- **做**：
  - 工厂子路由框架（`FactoryLayout` + `recipes` / `chains` 两个子页面）。
  - `src/lib/factory/` 数据适配层（types / recipes / chain）与 `useData.ts` 新增 hooks。
  - 通用配方组件 `RecipeCard`（物品统一 `ItemTile`）。
  - 链路图构建纯函数与 `@xyflow/react` + `@dagrejs/dagre` 渲染。
  - `factory.*` i18n 命名空间（14 语言）。
- **不做**：
  - 手工/枢纽/飞船/种植舱配方，机器图鉴页，蓝图体系。
  - 装备配方（`RecipePanel`）迁移。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/factory/types.ts` | 工厂类型：`FactoryRecipe` / `FactoryMachine` / `FactorySource` / `FactoryItemIndex` / `ChainGraph` 等 |
| `src/lib/factory/recipes.ts` | adapter 纯函数：`adaptFactoryRecipe` / `adaptFactoryMachine` / 反向索引与采集源头适配 |
| `src/lib/factory/chain.ts` | 链路构建纯函数：`buildChainGraph`、`perMinute`、环检测 |
| `src/lib/factory/chain.test.ts` | chain.ts 单元测试 |
| `src/lib/factory/recipes.test.ts` | recipes.ts 单元测试 |
| `src/components/Craft/RecipeCard.tsx` | 通用配方卡片 |
| `src/components/Factory/ChainGraph.tsx` | 链路图渲染（dagre 布局 + xyflow） |
| `src/pages/factory/FactoryLayout.tsx` | 顶部页签导航 + `<Outlet />` |
| `src/pages/factory/FactoryRecipes.tsx` | 工厂配方子页面（左右结构） |
| `src/pages/factory/FactoryChains.tsx` | 制作链路子页面 |
| `tests/e2e/factory.spec.ts` | 工厂系统 E2E 测试 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `package.json` / `package-lock.json` | 新增依赖 `@xyflow/react`、`@dagrejs/dagre` |
| `src/App.tsx` | 工厂路由改为嵌套子路由（`React.lazy` 懒加载两个子页面） |
| `src/components/Layout/Breadcrumb.tsx` | `useListLabel()` 追加 `recipes` / `chains` 映射 |
| `src/hooks/useData.ts` | 追加 `useFactoryRecipes` / `useFactoryItemIds` / `useItemRecipes` / `useCraftingChain` |
| `src/pages/factory/FactoryOverview.tsx` | 删除（由 `FactoryLayout` 取代） |
| `scripts/i18n-custom.json` | 新增 `factory.*` keys（14 语言） |

## 3. 详细实现

### 3.1 i18n（`scripts/i18n-custom.json`）

新增 `factory.*` 命名空间，全部 key 提供 14 语言翻译后运行 `node scripts/generate-i18n-dicts.ts`：

| key | CN 文案（参考） |
|-----|----------------|
| `factory.recipes` | 工厂配方 |
| `factory.chains` | 制作链路 |
| `factory.asProduct` | 作为产物 |
| `factory.asMaterial` | 作为材料 |
| `factory.searchItem` | 搜索物品 |
| `factory.selectItemHint` | 从左侧选择物品查看配方 |
| `factory.noRecipes` | 暂无相关配方 |
| `factory.machine` | 所需机器 |
| `factory.craftTime` | 制作时长 |
| `factory.perMinute` | 每分钟 |
| `factory.addTarget` | 添加目标产物 |
| `factory.selectedTargets` | 已选产物 |
| `factory.clearAll` | 清空 |
| `factory.cycleMark` | 循环依赖 |
| `factory.sourceNode` | 采集 |
| `factory.switchRecipe` | 切换配方 |
| `factory.emptyChainHint` | 搜索并添加目标产物以生成制作链路 |
| `factory.target` | 目标 |

### 3.2 数据适配层（`src/lib/factory/`）

**`types.ts`** — 按技术方案 §3.2 落地：

```ts
export interface RecipeItemQty { itemId: string; count: number }
export interface FactoryRecipe {
  id: string; machineId: string
  ingredients: RecipeItemQty[]; outcomes: RecipeItemQty[]
  totalProgress: number; sortId: number
}
export interface FactoryMachine { id: string; name: string; iconId: string }
export interface FactorySource { machineId: string; itemId: string; produceRate: number; msPerRound: number }
export interface FactoryItemIndex {
  asIngredient: Record<string, string[]>
  asOutcome: Record<string, string[]>
}
export interface ChainNode { key: string; kind: 'item' | 'machine' | 'source'; itemId?: string; machineId?: string; perMinute: number; isTarget?: boolean }
export interface ChainEdge { from: string; to: string; perMinute: number; isCycle?: boolean }
export interface ChainGraph { nodes: ChainNode[]; edges: ChainEdge[] }
```

**`recipes.ts`** — adapter 纯函数：

- `adaptFactoryRecipe(raw)`：`ingredients[].group` / `outcomes[].group` 拍平为 `RecipeItemQty[]`（取首 group，保留注释说明多 group 语义待验证）；`totalProgress ?? 0`。
- `adaptFactoryMachine(raw, i18nMap)`：`name` 走 `resolveI18n`（**64 位 ID 必须 `String(id)`**，见数据陷阱）；`iconId = iconOnPanel`。
- `buildFactoryItemIndex(incomeRaw, outcomeRaw)`：两张反向索引表 → `FactoryItemIndex`。
- `adaptFactorySources(minerRaw, gasMinerRaw, pumpRaw)`：合并三类采集表为 `FactorySource[]`。

**`chain.ts`** — 链路构建纯函数（无 React 依赖）：

```ts
export const perMinute = (count: number, totalProgress: number) =>
  totalProgress > 0 ? (count * 60000) / totalProgress : 0

export function buildChainGraph(
  targets: string[],
  recipes: FactoryRecipe[],
  index: FactoryItemIndex,
  sources: FactorySource[],
  defaultCrafts: Record<string, string>,   // WikiDefaultCraftTable
  recipeOverride?: Record<string, string>, // 用户手动切换的配方 itemId → recipeId
): ChainGraph
```

- DFS 携带**路径集合**（非全局 visited）：材料已在当前路径 → 生成 `isCycle: true` 虚线回边并剪枝。
- 配方选择优先级：`recipeOverride[itemId]` → `defaultCrafts[itemId]` → `asOutcome[itemId][0]`。
- 速率传递：目标产物速率 = 默认配方单机每分钟产出；逐级按比例反推材料需求；保留 1 位小数。
- 无上游配方且在 `sources` 中 → `source` 节点（每分钟采集量 = `produceRate × 60000 / msPerRound`）；否则叶子原料节点。
- 多目标：按 `itemId + machineId` 合并节点、速率累加，目标节点标记 `isTarget`。

### 3.3 Hooks（`src/hooks/useData.ts` 追加）

```ts
export function useFactoryRecipes(): UseDataResult<{ recipes: FactoryRecipe[]; machines: Record<string, FactoryMachine>; index: FactoryItemIndex }>
export function useFactoryItemIds(): UseDataResult<string[]>        // index.asIngredient ∪ index.asOutcome 的 key
export function useItemRecipes(itemId: string | null): UseDataResult<{ asProduct: FactoryRecipe[]; asMaterial: FactoryRecipe[] }>
export function useCraftingChain(targets: string[]): UseDataResult<ChainGraph>
```

- 统一走 `getCachedData(table, () => fetchTableAll(table))` + `getTableI18nDict(table, locale)`；非关键表 `.catch(() => ({}))` 容错（同 `useEquipDetail`）。
- 物品名称/稀有度解析复用 `ItemTable` + i18n dict（模块级 Map 记忆化，参考 `getWeaponTypeNameMap`）。

### 3.4 通用配方组件（`src/components/Craft/RecipeCard.tsx`）

```tsx
interface RecipeCardProps {
  recipe: FactoryRecipe
  machine?: FactoryMachine
  highlightItemId?: string
}
```

- 布局：`[产物 ItemTile 组] ← [材料 ItemTile 组]`，卡片范式 `p-3 rounded border border-archive-border bg-archive-file`。
- 物品一律 `<ItemTile itemId amount size="lg" />`（保留默认 tooltip）；`highlightItemId` 命中的方块加金色描边。
- 信息行：机器图标 + 名称、耗时（`totalProgress / 1000` 秒）、每分钟产出/消耗（`perMinute`）。
- 机器图标 URL：`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`（与物品图标同目录规则，实现时先验证 `icon_port_*` 资源存在，不存在则回退占位底色）。

### 3.5 路由与框架

```tsx
// src/App.tsx
<Route path="factory" element={<FactoryLayout />}>
  <Route index element={<Navigate to="recipes" replace />} />
  <Route path="recipes" element={<FactoryRecipes />} />
  <Route path="chains" element={<FactoryChains />} />
</Route>
```

- `FactoryLayout`：顶部页签 `NavLink`（`factory.recipes` / `factory.chains`），当前页签金色高亮；内容区 `<Outlet />`；页头保留 `<Badge>{MODULE_CODES.factory}</Badge>`。
- 两个子页面用 `React.lazy` + `Suspense`（`PageSkeleton` 兜底）隔离 `@xyflow/react` 包体。
- `Breadcrumb.tsx` 的 `useListLabel()` 追加 `recipes` / `chains`；侧边栏无需改动（`startsWith` 判定天然覆盖）。
- 选中态同步 URL：配方页 `?item=<itemId>`，链路页 `?targets=<id1,id2>`（`useSearchParams`，先例 `ArchiveSearch`）。

### 3.6 工厂配方页（`src/pages/factory/FactoryRecipes.tsx`）

- 左侧：`useFactoryItemIds()` → `ItemTable` 批量解析（名称/稀有度）→ 本地 `useState` 搜索过滤（`includes`，同 `ItemList`）→ `ItemTile` 网格（`itemId/name/rarity` 直传）→ 选中项高亮。
- 右侧：`useItemRecipes(itemId)` → 「作为产物」「作为材料」两组 `RecipeCard` 列表；空分组渲染 `factory.noRecipes` 空态；未选中渲染 `factory.selectItemHint`。
- 加载态 `ListSkeleton` / `DetailSkeleton`；错误态 `common.loadFailed`。
- 窄屏 `<md` 左右结构转上下堆叠。

### 3.7 制作链路页（`src/pages/factory/FactoryChains.tsx` + `src/components/Factory/ChainGraph.tsx`）

- 选择器：基于 `useFactoryItemIds()` 中有上游配方的物品做客户端搜索（仿 `ItemList` 过滤模式），添加/移除/清空已选产物清单（`ItemTile` + 删除按钮）。
- `ChainGraph`：
  - dagre 布局 `rankdir: 'LR'`（原料左、目标产物汇聚右），`nodesep: 40, ranksep: 80`。
  - 自定义节点：item = `ItemTile` + 每分钟数量角标；machine = 机器图标 + 名称；source = 机器图标 + `factory.sourceNode` 标识；`isTarget` 节点金色描边。
  - 环回边渲染为虚线 + `factory.cycleMark` 标记。
  - `fitView` + 平移缩放；窄屏默认可触摸操作。
- 配方切换：item 节点存在多个上游配方时展示「切换配方」入口，切换后更新 `recipeOverride` state 并重新调用 `buildChainGraph`（`useMemo` 派生）。

## 4. 实现顺序

### 阶段一：数据层与 i18n（可并行 subagent A/B）

1. A：`src/lib/factory/types.ts` + `recipes.ts` + `chain.ts` + 两者单元测试。
2. B：`scripts/i18n-custom.json` 新增 `factory.*` keys → `node scripts/generate-i18n-dicts.ts`。

### 阶段二：组件与框架（依赖阶段一）

3. `RecipeCard.tsx`。
4. 路由改造（`App.tsx`、`Breadcrumb.tsx`、删除 `FactoryOverview.tsx`）+ `FactoryLayout.tsx`。
5. `useData.ts` 追加工厂 hooks。

### 阶段三：两个子页面（可并行 subagent C/D）

6. C：`FactoryRecipes.tsx`。
7. D：安装 `@xyflow/react` + `@dagrejs/dagre` → `ChainGraph.tsx` → `FactoryChains.tsx`。

### 阶段四：测试与验证

8. `tests/e2e/factory.spec.ts`。
9. `npm run lint && npm run test && npm run build` 全绿。
10. `npm run dev` 手动验证：默认子页面、选中态刷新还原、含环产物（瓶装水/种子）链路不卡死、窄屏布局。

## 5. 测试计划

### 5.1 单元测试（vitest）

- `chain.ts`：`perMinute` 换算（12000 → 5 次/分）；A→B→A 构造环验证剪枝与 `isCycle` 边；配方选择优先级（override > default > first）；多目标节点合并与速率累加；采集源头节点生成。
- `recipes.ts`：group 拍平；字段 `??` 回退；64 位 i18n ID 的 `String()` 解析。

### 5.2 E2E 测试（Playwright）

- `/archive/factory` 重定向到 `/archive/factory/recipes`；页签切换地址同步；侧边栏高亮。
- 配方页：搜索过滤 → 点击物品 → 右侧两组配方；`?item=` 刷新后选中态还原。
- 链路页：添加产物 → 渲染链路图；含环产物页面不卡死；`?targets=` 刷新还原。

### 5.3 手动验证

- 切换语言后 `factory.*` 文案正确。
- 链路图在常规规模（数十节点）下平移缩放流畅。

## 6. 验收标准

- [ ] `/archive/factory` 默认落在工厂配方，两个子页面独立地址可直达、刷新还原选中态。
- [ ] 左侧物品列表完整覆盖参与机器制造的物品；右侧双向分组展示 `RecipeCard`。
- [ ] `RecipeCard` 展示产物/材料/机器/时长/每分钟产能，物品均为 `ItemTile`。
- [ ] 链路图以所选产物为最终点，标注机器与每分钟数量，循环依赖有标记且不卡死。
- [ ] `factory.*` i18n 14 语言齐全。
- [ ] `npm run lint && npm run test && npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 每分钟换算未经游戏内实测 | 速率数值偏差 | 收敛至 `perMinute` 单函数，实测后一处修正 |
| `ingredients[].group` 多 group 语义未验证 | 备选材料场景遗漏 | 当前数据无实例；adapter 注释标记，出现实例后扩展 |
| 机器图标 `icon_port_*` 资源路径未确认 | 机器图标破图 | 实现时先验证；失败回退占位底色 |
| 新依赖包体（约 +130KB gzip） | 首屏体积 | 子路由 `React.lazy`，仅工厂页加载 |
| 超长链路节点过多 | 图渲染性能 | xyflow 视窗渲染 + `fitView`；必要时限制默认展开深度 |

回滚策略：全部为新增文件 + 少量路由/breadcrumb 追加，回滚 commit 即可恢复占位页。

## 8. 相关文档

- [[20260725-factory-system|工厂系统 PRD]]
- [[20260725-factory-system|工厂系统 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
