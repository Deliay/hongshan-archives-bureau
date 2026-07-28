---
description: docs/engineering 目录的工程与开发协作说明
type: Permanent
---

# docs/engineering 协作说明

本目录存放《宏山档案馆》的工程规范、前端规范、开发计划与技术方案。所有开发工作遵循 `<SKILL: z-coding>` 定义的流程。

## 目录结构

```
docs/engineering/
  AGENTS.md              本文件
  common-rules.md        通用开发规范与流程
  frontend-spec.md       前端开发规范
  engineering-spec.md    工程架构与数据规范
  references/            详细参考文档
    data-mapping-tables.md   数据表映射参考
    data-pitfalls.md         数据层常见陷阱
    factory-chain-solver.md  制作链路求解器参考
    rich-text-spec.md        富文本规范参考
    ui-pitfalls.md           UI 常见陷阱参考
    diff-system.md           Diff 系统参考
    i18n-spec.md             国际化规范
  plans/                 开发计划与任务拆解
  proposal/              技术方案文档
  test/                  验收问题报告
```

## 文档命名

- `plans/` 与 `proposal/` 中的文档使用创建日期作为唯一标识符：`YYYYMMDD-{Title-With-Hyphens}.md`，例如 `20260719-operator-skill-slider.md`。ID 仅用于排序和去重，不表示优先级。
- `references/` 与目录根部的规范文档（`common-rules.md`、`frontend-spec.md`、`engineering-spec.md`、`AGENTS.md`）不使用日期前缀，保持语义化命名。

## 开发流程

1. 指定对应的产品文档（`docs/product/released/`）。
2. 创建需求分支 `feat/<slug>`。
3. 在 `proposal/` 编写技术方案，按日期命名规范保存。
4. 如需接口契约，更新 `contract/`（如存在）。
5. 创建开发分支并编写实现，可并行调用 subagent。
6. 编排服务并运行 API / E2E 测试。

## 验收问题处理

收到验收问题反馈后，必须创建或更新 `test/` 目录下的验收报告：

1. 命名格式：`YYYYMMDD-<feature-slug>-acceptance-report.md`
2. 内容包含：关联 PRD/技术方案链接、每个问题的描述/根因/修复/commit、修复总览表、验证结果、经验总结
3. 修复过程中实时更新文档，完成后随代码提交

## 编码前必读

- 修改代码前，加载对应目录的 `AGENTS.md`。
- 每次编写代码前，加载 [[common-rules|通用开发规范]]。
- 前端相关修改，加载 [[frontend-spec|前端开发规范]]。
- 数据层、缓存、Diff 相关修改，加载 [[engineering-spec|工程架构规范]]。
- 调试数据问题或实现新模块时，查阅 [数据表映射参考](./references/data-mapping-tables.md) 与 [数据层常见陷阱](./references/data-pitfalls.md)。
- 修改制作链路求解器（`src/lib/factory/chain.ts`）前，必读 [制作链路求解器参考](./references/factory-chain-solver.md)。
- 处理富文本或 tooltip 时，查阅 [富文本规范参考](./references/rich-text-spec.md) 与 [UI 常见陷阱参考](./references/ui-pitfalls.md)。

## 经验教训

以下为工厂系统验收（一期 2.1–2.21 + 二期 2.22–2.29）中总结的失败经验，后续开发需注意。二期求解器经验详见 [制作链路求解器参考](./references/factory-chain-solver.md)「设计原则」。

### 数据适配层

- **字段名假设需验证**：`adaptFactoryRecipe` 假设字段为 `formulaId`，实际为 `id`，导致全局性 bug（配方 ID 永远为空，点击任意物品总显示同一配方）。新模块上线前应先抽样验证原始数据结构，不可凭假设编码。
- **数据格式需实际验证**：`flattenGroup` 假设 `ingredients` 格式为 `{ id, count }[][]`，实际为 `[{ group: [{ id, count }] }]`，导致页面报错无法渲染。应先 curl 抽样确认实际数据结构。
- **字段来源需验证**：`useFactoryData` 从 `FactoryItemAsMachineCrafterIncomeTable` / `OutcomeTable` 获取物品 ID，但这些表的 key 不是 item ID。应直接从配方数据本身提取，而非依赖外部索引表。

### 缓存策略

- **in-flight 去重**：`getCachedData` 缺少请求去重，并发调用同一 key 会触发多次请求（如 `FullBottleTable` 被多个 `ItemIcon` 实例同时请求）。应在缓存层统一处理 in-flight 去重。
- **预加载**：高频使用的表（`ItemTable`、`FullBottleTable`）应在数据 hook 中预加载，避免组件渲染时才触发请求。

### 分页

- **左列表 + 右配方都需分页**：物品数量（数百个）和配方数量都可能很大，两端都需要分页控制，不可假设数据量小而跳过分页。

### 验收流程

- **先跑 E2E 再验收**：E2E 测试能快速发现渲染问题（如数据结构不匹配导致的空白页），比人工验收效率高。
- **截图辅助定位**：Playwright 的 `test-failed-1.png` 截图能直观展示页面状态，加速问题定位。

### ReactFlow 节点初始化与边渲染

- **`isNodeInitialized` 要求显式尺寸**：ReactFlow 的 `getEdgePosition()` 内部检查 `isNodeInitialized()`，要求 `node.measured.width || node.width || node.initialWidth` 为真。使用自定义节点时，首帧渲染 DOM 尚未被 ResizeObserver 测量，`measured.width` 为 undefined，导致边全部返回 null。
- **修复方式**：在 dagre 布局后为节点显式设置 `width`/`height`，与 dagre 计算的尺寸一致。ReactFlow 首帧即可正确计算边位置。
- **React 19 + zustand v4 无兼容性问题**：之前误判为 zustand 订阅问题，实际是节点尺寸未就绪。ReactFlow 原生边在节点有显式尺寸后正常渲染。
- **不要过早绕过**：遇到库内部渲染问题时，先加日志确认根因（store 数据 vs DOM 渲染），再决定是绕过还是修复配置。

### 资源路径

- **机器图标路径与物品图标不同**：机器图标 `iconOnPanel` 值（如 `icon_port_furnance_1`）对应资源在 `factory/buildingpanelicon/` 目录，而非物品图标的 `itemicon/` 目录。通过 API 查询 `FactoryBuildingTable` 并搜索 asset bundle 确认正确路径。

### 配方展示逻辑

- **按机器分组而非按方向分组**：「作为产物」「作为材料」是外部工具的逻辑，产品需求是按机器分组，每个配方一行，材料在左、箭头指向产物。实现前需仔细阅读产品文档，不可照搬其他工具的设计。

### 链路求解器（二期）

- **数值字段单位语义必须用全表数据考证**：`totalProgress` 被按字段名臆测为毫秒，实为 6000 进度 = 1 秒，机器台数整体放大 6 倍且单测无法发现（fixture 与实现同源同错）。考证方法：对全部数据版本统计验证不变式。
- **「解析失败静默回退」的路径必须告警或测试断言**：WikiDefaultCraftTable 按对象解析实际为纯字符串，静默得到空表后回退到表键序首候选（恰为拆解机反向配方），必然成环。
- **全局共享的规划状态会被求解顺序污染**：未验证的路线不写入全局状态；「已规划即合法」的信任通道只能做浅检查。
- **规划期无法穷举构建期行为**：路线重排序/回退解析/源超额转配方只在构建期可见，必须有构建后检测-剔除-重规划兑底（每轮永久排除 ≥1 条配方保证收敛）。
- **副产物是供给不是废料**：不纳入需求抵扣会为可回用材料虚增整条上游链；副产物复用用不动点迭代求解。
- **集成回归用真实数据转储**：合成 fixture 测不出真实数据的键序、表结构与数值语义。

## 相关技能

- `<SKILL: z-coding>` — 开发流程、分支管理、实现与测试规范。
- `<SKILL: z-test>` — 单元测试、API 测试与 E2E 测试。
- `<SKILL: z-document>` — 文档格式与 Mermaid 图形规范。
