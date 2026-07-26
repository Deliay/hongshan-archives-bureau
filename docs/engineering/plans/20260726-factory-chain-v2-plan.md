---
description: 制作链路图 v2 实现方案：类型重构、算法重构、UI 重构、测试的分阶段实施清单
type: Fleeting
---

# 制作链路图 v2 - 实现方案

**对应产品文档**: [[20260726-factory-chain-v2|制作链路图 v2]]
**对应技术方案**: [[20260726-factory-chain-v2-tech|制作链路图 v2 技术提案]]
**实现方案版本**: v1.1
**创建日期**: 2026-07-26
**作者**: 前端工程
**开发分支**: `feat/factory-chain-v2-impl`

## 修订记录

- v1.1 (2026-07-26): 按 PR #38 code review 修订，与技术提案 v1.1 对齐：
  - 核心算法伪代码修正维度错误（demandPm 总量 / theoryPm 单台 / supplyCap 采集源产能）；
  - 多目标共享中间品合并由 max 改为 sum（需求累加）；
  - 液体判断改为加载 `LiquidTable` 成员查询；
  - `ChainEdge` 改为单物品边；循环净产出改为 `calcCycleNetRatio`（无需速率入参）；
  - `calcTransportCount` 拆分为 `maxThroughput`（显式取最高档位）+ `calcTransportCount`；
  - 修正阶段一验证语句（项目无 `typecheck` 脚本，tsc 在 `npm run build` 中）；
  - 开发分支改为 `feat/factory-chain-v2-impl`；
  - 补充 URL 参数非法值处理与 i18n key 清单。

## 1. 概述

### 1.1 目标

将技术方案转化为可执行的实现清单，分阶段落地：类型重构 → 核心算法重构 → UI 重构 → 测试验证。

### 1.2 范围

- **做**:
  - `src/lib/factory/types.ts` 类型重构（ChainTarget / ChainEdge / ChainNode）。
  - `src/lib/factory/chain.ts` 算法重构（expand、循环检测、供给封顶、物流计算）。
  - `src/pages/factory/FactoryChains.tsx` UI 重构（多目标选择器 + 产速输入）。
  - `src/components/Factory/ChainGraph.tsx` 渲染重构（机器节点 + 物流边 + 循环样式）。
  - `src/hooks/useData.ts` hook 签名变更 + 物流表/液体表加载。
  - 单元测试与 E2E 测试。
- **不做**:
  - 配方切换交互。
  - 蓝图保存/导出。

## 2. 代码变更总览

### 2.1 修改文件

| 文件路径 | 变更内容 |
|----------|----------|
| `src/lib/factory/types.ts` | `ChainTarget` 新增；`ChainEdge` 重构（单物品 `itemId`/`beltCount`/`isPipe`/`cycleType`/`cycleRatio`）；`ChainNode` 重构（kind 增 `'target'`、`demandPm`/`actualPm`/`theoryPm`/`supplyLimited`/`isClosedLoop`） |
| `src/lib/factory/chain.ts` | 重构 `buildChainGraph`（多目标+产速+供给封顶）、`expand`（返回 actualPm）；新增 `calcCycleNetRatio`/`calcMachineCount`/`calcTransportCount`/`calcThroughput`/`maxThroughput` |
| `src/lib/factory/chain.test.ts` | 新增循环规则、供给封顶、机器数量、传送带数量、多目标等测试用例 |
| `src/hooks/useData.ts` | `useCraftingChain` 签名变更（`ChainTarget[]`）；新增加载 `FactoryGridBeltTable`/`FactoryLiquidPipeTable`/`LiquidTable` |
| `src/pages/factory/FactoryChains.tsx` | 移除左侧列表+分页；新增顶部多目标选择器+产速输入框+URL 同步（含非法值回退） |
| `src/components/Factory/ChainGraph.tsx` | 重构 layoutGraph（机器/源/目标三类节点）；MachineNode 显示配方/台数/实际产出/副产物；边渲染区分固液与循环类型 |
| `scripts/i18n-custom.json` → `src/i18n/dicts/*.json` | 新增 i18n key（14 语言，走 `node scripts/generate-i18n-dicts.ts` 生成流程） |
| `tests/e2e/src/factory.spec.ts` | 更新 E2E 测试适配新 UI |

## 3. 详细实现

### 3.1 阶段一：类型重构

**目标**: 定义新的类型结构，为算法重构做准备。

**文件**: `src/lib/factory/types.ts`

1. 新增 `ChainTarget` 接口（`itemId` + `rate`，rate 允许非负非整数）
2. 重构 `ChainEdge`：单物品 `itemId: string`；新增 `beltCount`/`isPipe`/`cycleType`/`cycleRatio`；移除 `label`
3. 重构 `ChainNode`：`kind` 改为 `'machine' | 'source' | 'target'`；新增 `machineName`/`machineIcon`/`machineCount`/`recipe`（含 inputs/outputs 的 rate）/`demandPm`/`actualPm`/`theoryPm`/`supplyLimited`/`isClosedLoop`；移除 `label`/`isTarget`/`perMinute`
4. `ChainGraph` 无结构变更

**验证**: 本阶段只改类型，`npm run build`（含 tsc）**预期报错**（chain.ts / ChainGraph.tsx 尚未适配新类型），属正常现象；错误将在阶段二/六逐一消除，阶段六完成后必须编译通过。

### 3.2 阶段二：核心算法重构

**目标**: 重构 `buildChainGraph` 和 `expand`，实现 R0-R10 全部规则。

**文件**: `src/lib/factory/chain.ts`

#### 3.2.1 三个速率概念（实现时务必区分）

| 概念 | 含义 | 维度 |
|------|------|------|
| `theoryPm` | **单台**机器理论产出 = `perMinute(outcomeCount, totalProgress)` | 每台/min |
| `demandPm` | 下游需求合计（多目标、多父节点**累加**） | 总量/min |
| `supplyCap` | 采集源产能之和；无外部供给为 +∞ | 总量/min |

禁止跨维度运算（如 `min(theoryPm, demandPm)`）。

#### 3.2.2 新增辅助函数

```typescript
// 速率换算
const perMinute = (count: number, totalProgress: number) => ...
const sourcePerMinute = (produceRate: number, msPerRound: number) => ...

// 循环净产出比（R1）：无量纲，无需速率入参
export function calcCycleNetRatio(
  stages: { inputQty: number; outputQty: number }[],
): number

// 机器数量（R8）
export function calcMachineCount(actualPm: number, theoryPm: number): number

// 吞吐量（R9/R10）
export function calcThroughput(msPerRound: number, volume: number = 1): number

// 从物流表显式选择最大吞吐量（当前各表仅 1 条目；未来多级取最高档位，不依赖键序）
export function maxThroughput(
  transportTable: Record<string, any>,
  dataKey: 'beltData' | 'pipeData',
): number

// 物流设施数量（R9/R10）
export function calcTransportCount(rate: number, throughput: number): number
```

#### 3.2.3 重构 `buildChainGraph`

```typescript
function buildChainGraph(
  targets: ChainTarget[],
  recipes: FactoryRecipe[],
  index: FactoryItemIndex,
  sources: FactorySource[],
  defaultCrafts: Record<string, string>,
  recipeOverride?: Record<string, string>,
  machines?: Record<string, { name: string; iconId: string }>,
  liquids?: Set<string>,              // 新增：LiquidTable key 集合
  beltTable?: Record<string, any>,    // 新增：FactoryGridBeltTable
  pipeTable?: Record<string, any>,    // 新增：FactoryLiquidPipeTable
): ChainGraph
```

实现要点：
1. 构建 `recipeById` Map、`asOutcome` 反查
2. 构建 `supplyCapByItem`：遍历 `sources`，`supplyCap[itemId] += sourcePerMinute(produceRate, msPerRound)`；无源物品 +∞
3. 对每个 `rate > 0` 的 target：生成 `target:{itemId}` 节点，`expand(itemId, target.rate, new Set(), targetKey)`
4. **合并**（先聚合后结算）：同 key 节点 `demandPm` 累加 → 统一重算 `actualPm = min(demandPm, supplyCap)`、`machineCount = ceil(actualPm / theoryPm)`；同 `(from,to,itemId)` 边 `perMinute` 累加 → 统一重算 `beltCount`
5. 处理循环边的视觉属性（cycleType / cycleRatio）

#### 3.2.4 重构 `expand`

```typescript
function expand(
  itemId: string,
  demandPm: number,           // 下游需求速率（总量维度）
  path: Set<string>,          // DFS 路径（环检测）
  parentKey: string,
  nodes: Map<string, ChainNode>,
  edges: Map<string, ChainEdge>,
): number                     // 返回 actualPm 供父节点结算
```

实现要点：
1. **R4 外部供给优先**：`supplyCapByItem[itemId]` 有限 → 生成/合并源节点，`actualPm = min(demandPm, supplyCap)`，标记 `supplyLimited`，返回（不再展开配方）
2. 查找配方（优先级：override > default > first）；无配方 → 叶子，返回 0
3. **循环检测**：`path.has(itemId)` → 沿 path 收集各级 `{inputQty, outputQty}`，`calcCycleNetRatio` 判定（R1/R2/R3）；>1 有效循环继续展开，≤1 封闭回路停止并标记（R5 自消费按长度 1 循环统一处理）；path 长度 >10 截断（R6）
4. `theoryPm = perMinute(outcomeCount, totalProgress)`（单台维度）
5. `actualPm = min(demandPm, supplyCap[itemId] ?? +∞)`（R7，总量维度）
6. `machineCount = calcMachineCount(actualPm, theoryPm)`（R8）
7. 生成/合并机器节点
8. 遍历材料：`matDemand = actualPm × (mat.count / outcomeCount)`，递归 expand，生成单物品物流边：`isPipe = liquids.has(mat.itemId)`（R10），`beltCount = calcTransportCount(perMinute, maxThroughput(...))`（R9）

### 3.3 阶段三：单元测试

**目标**: 覆盖 R0-R10 全部规则。

**文件**: `src/lib/factory/chain.test.ts`

按功能模块分组，使用构造的测试数据（无需真实 API）：

| 测试组 | 用例数（估） | 关键验证 |
|--------|-------------|----------|
| 循环规则 R0-R6 | 6-8 | 采种/种植 netRatio=2 有效；瓶装/倒空 netRatio=1 封闭；副产物隔离；外部供应打断；自消费（长度 1）并入 R1；深度限制 10 层 |
| 供给封顶 R7 | 3-4 | 源充足满产；需求超源产能封顶 + supplyLimited 标记；瓶颈逐级传导；无源物品不封顶 |
| 机器数量 R8 | 3-4 | 单台；需求 100/min ÷ 单台 30/min = 4 台；小数取整；actualPm=0 → 0 台 |
| 传送带/管道数量 R9 | 3-4 | 固体；液体；小数取整；多条目取最大吞吐量 |
| 液体区分 R10 | 2-3 | LiquidTable 成员 → 管道；非成员 → 传送带；空集合降级全固体 |
| 多目标 | 3-4 | 共享中间品需求**累加**（30+20=50，台数按 50 算）；独立子图；目标产速影响 |
| 非整数产速 | 2-3 | 小数；零值不展开 |
| 吞吐量计算 | 2-3 | 传送带；管道；零值；缺 volume 默认 1 |

**验证**: `npm run test` 全绿。

### 3.4 阶段四：Hook 重构

**目标**: 适配新类型签名，加载物流与液体数据。

**文件**: `src/hooks/useData.ts`

1. `useCraftingChain` 签名改为 `ChainTarget[]`
2. 新增加载 `FactoryGridBeltTable`、`FactoryLiquidPipeTable`、`LiquidTable`（`fetchTableAll`），均 `.catch(() => ({}))` 容错
3. `LiquidTable` 的 key 集合转 `Set<string>`；加载失败时为空集合（降级全固体）
4. 传递 `machines`、`liquids`、`beltTable`、`pipeTable` 到 `buildChainGraph`

### 3.5 阶段五：页面 UI 重构

**目标**: FactoryChains 页面改为多目标选择器 + 产速输入。

**文件**: `src/pages/factory/FactoryChains.tsx`

实现要点：
1. 移除左侧物品列表 + `LIST_PAGE_SIZE` + `listPage` + `mobileOpen` 等状态
2. 新增 `ChainTarget[]` state（从 URL `?targets={itemId}:{rate},...` 解析）
3. URL 解析容错：rate 缺省/NaN/负数/非数值 → 回退为该物品默认配方理论产出；rate=0 保留目标行但不展开；重复 itemId 后者覆盖前者
4. 新增顶部目标选择器 UI：
   - 每行：下拉选择器（搜索 + rarity 排序） + 产速输入框（number） + 删除按钮（×）
   - 底部："+ 添加目标产物" 按钮
5. 产速变化时自动更新 URL 并触发 `useMemo` 重算
6. i18n：新增 key（见阶段七）

### 3.6 阶段六：图渲染重构

**目标**: ChainGraph 组件适配新数据结构。

**文件**: `src/components/Factory/ChainGraph.tsx`

实现要点：

#### layoutGraph 变更
- 节点类型：`machine`（机器）/ `source`（采集）/ `target`（目标终点）
- 机器节点尺寸增大以容纳配方摘要与台数；注意自定义节点必须显式 width/height（一期经验：否则 isNodeInitialized 为 false，首帧边不渲染）
- 目标节点：物品图标 + 名称 + 需求/实际产速

#### MachineNode 自定义节点
```tsx
// 节点内容：
// [图标] 机器名 ×N
// 输入物品 → 输出物品 ×数量
// 实际产出: XX/min（供给受限时：需求 X / 实际 Y，高亮标记）
// 副产物: ...（如有，独立列出）
```

#### 边渲染
- `edge.isPipe`：液体蓝色虚线 `#3b82f6` + `strokeDasharray: '8 4'`；固体金色实线 `#C9A96E`
- `edge.cycleType === 'closed'`：橙色虚线 `#f59e0b` + `↻ 封闭`；`'productive'`：金色实线 + 净产出比
- 标签：传送带/管道数量 + 吞吐量（`传送带×N (XX/min)`）
- 禁止在 index.css 加全局 `!important` 边样式（一期教训：会压掉循环边内联样式），样式全部内联

### 3.7 阶段七：i18n

在 `scripts/i18n-custom.json` 新增 key（全部 14 语言，运行 `node scripts/generate-i18n-dicts.ts` 生成，禁止直接改 dicts）：

| key | CN 文案 |
|-----|---------|
| `factory.addTarget` | 添加目标产物 |
| `factory.targetRate` | 产速 |
| `factory.unitPerMin` | 个/min |
| `factory.beltCount` | 传送带 |
| `factory.pipeCount` | 管道 |
| `factory.closedLoop` | ↻ 封闭 |
| `factory.productiveLoop` | 有效循环 |
| `factory.cycleNetRatio` | 净产出 |
| `factory.machineCount` | 台 |
| `factory.totalOutput` | 实际产出 |
| `factory.demandRate` | 需求 |
| `factory.supplyLimited` | 供给受限 |
| `factory.inputRate` | 输入 |
| `factory.outputRate` | 输出 |

同时清理一期遗留但新 UI 不再使用的 key（如有），生成后确认 `npm run lint` 无未使用 key 警告。

### 3.8 阶段八：E2E 测试

**文件**: `tests/e2e/src/factory.spec.ts`

更新用例：
1. 多目标添加/删除后链路图更新
2. 产速修改后机器数量变化
3. URL 参数同步与刷新还原（含非法 rate 回退）
4. 封闭回路视觉标记验证

## 4. 实现顺序

```mermaid
gantt
    title 制作链路图 v2 实现计划
    dateFormat YYYY-MM-DD
    section 数据层
    类型重构 (types.ts)           :a1, 2026-07-27, 1d
    核心算法重构 (chain.ts)        :a2, after a1, 2d
    单元测试 (chain.test.ts)       :a3, after a2, 1d
    section UI层
    Hook 重构 (useData.ts)         :b1, after a1, 1d
    页面 UI 重构 (FactoryChains)    :b2, after b1, 1d
    图渲染重构 (ChainGraph)         :b3, after a2, 1d
    i18n                           :b4, after b1, 0.5d
    section 验证
    E2E 测试                       :c1, after b2, 1d
    lint + test + build            :c2, after c1, 0.5d
```

### 依赖关系

- 阶段一（类型）→ 阶段二（算法）→ 阶段三（单测）
- 阶段一（类型）→ 阶段四（Hook）
- 阶段二（算法）+ 阶段四（Hook）→ 阶段五（页面 UI）
- 阶段二（算法）→ 阶段六（图渲染）
- 阶段四（Hook）→ 阶段七（i18n）
- 阶段五 + 阶段六 → 阶段八（E2E）

## 5. 测试计划

### 5.1 单元测试

- `chain.ts`：全部 R0-R10 规则 + 多目标 + 非整数产速 + 吞吐量计算
- 预计新增 30-40 个测试用例

### 5.2 E2E 测试

- 多目标交互流程
- URL 同步（含非法值回退）
- 循环视觉标记

### 5.3 手动验证

- 链路图在常规规模下缩放/平移流畅
- 移动端触摸操作正常
- 切换语言后 i18n 文案正确

## 6. 验收标准

- [ ] 类型定义完整，编译通过
- [ ] `buildChainGraph` 支持多目标 + 产速输入
- [ ] 机器台数 = ceil(实际产出 / 单台理论产出)（需求 100/min、单台 30/min → 4 台）
- [ ] 共享中间品需求累加结算
- [ ] 供给封顶正确（满产/受限标记/逐级传导）
- [ ] 传送带/管道数量从 API 动态计算，液体从 LiquidTable 判断
- [ ] 封闭回路/有效循环视觉区分
- [ ] 机器节点显示完整信息
- [ ] 单元测试覆盖 R0-R10
- [ ] `npm run lint && npm run test && npm run build` 通过

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 多目标合并后节点重算顺序 | 台数/边速率不准 | 先聚合 demandPm/perMinute 再统一重算；单测覆盖 |
| 源供给封顶与循环组合场景 | 结算复杂 | R4 优先于循环检测，源点直接打断；单测覆盖 |
| 超大链路图性能 | 渲染卡顿 | xyflow 视窗渲染 + fitView |
| 新类型导致编译错误扩散 | 开发阻塞 | 阶段一完成后按阶段统一修复编译错误 |
| 物流表未来出现多级条目 | 选错吞吐量 | `maxThroughput` 显式取最高档位 |

回滚策略：全部为文件内重构，可通过 git revert 回退到一期状态。

## 8. 相关文档

- [[20260726-factory-chain-v2|制作链路图 v2 PRD]]
- [[20260726-factory-chain-v2-tech|制作链路图 v2 技术提案]]
- [[20260725-factory-system|工厂系统技术提案（一期）]]
- [[20260725-factory-system-plan|工厂系统实现方案（一期）]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
