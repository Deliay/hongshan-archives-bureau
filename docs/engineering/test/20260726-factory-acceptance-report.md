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

## 3. 修复总览

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

---

## 4. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors |
| `npm run test` | ✅ 213 tests passed |
| `npm run build` | ✅ 构建成功 |
| E2E `factory.spec.ts` | ✅ 15/15 passed |

---

## 5. 经验总结

### 5.1 数据适配层

- **字段名假设需验证**：`adaptFactoryRecipe` 假设字段为 `formulaId`，实际为 `id`，导致全局性 bug。新模块上线前应先抽样验证原始数据结构。
- **数据格式需实际验证**：`flattenGroup` 假设 `[][]` 格式，实际为 `[{ group: [] }]`。应先 curl 抽样确认。

### 5.2 缓存策略

- **in-flight 去重**：`getCachedData` 缺少请求去重，并发调用同一 key 会触发多次请求。应在缓存层统一处理。
- **预加载**：高频使用的表（`ItemTable`、`FullBottleTable`）应在数据 hook 中预加载。

### 5.3 分页

- **左列表 + 右配方都需分页**：物品数量和配方数量都可能很大，两端都需要分页控制。

### 5.4 验收流程

- **先跑 E2E 再验收**：E2E 测试能快速发现渲染问题（如数据结构不匹配导致的空白页）。
- **截图辅助定位**：Playwright 的 `test-failed-1.png` 截图能直观展示页面状态，加速问题定位。
