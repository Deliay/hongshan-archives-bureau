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
    rich-text-spec.md        富文本规范参考
    ui-pitfalls.md           UI 常见陷阱参考
    diff-system.md           Diff 系统参考
  plans/                 开发计划与任务拆解（留空）
  proposal/              技术方案文档（留空）
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

## 编码前必读

- 修改代码前，加载对应目录的 `AGENTS.md`。
- 每次编写代码前，加载 [[common-rules|通用开发规范]]。
- 前端相关修改，加载 [[frontend-spec|前端开发规范]]。
- 数据层、缓存、Diff 相关修改，加载 [[engineering-spec|工程架构规范]]。
- 调试数据问题或实现新模块时，查阅 [数据表映射参考](./references/data-mapping-tables.md) 与 [数据层常见陷阱](./references/data-pitfalls.md)。
- 处理富文本或 tooltip 时，查阅 [富文本规范参考](./references/rich-text-spec.md) 与 [UI 常见陷阱参考](./references/ui-pitfalls.md)。

## 相关技能

- `<SKILL: z-coding>` — 开发流程、分支管理、实现与测试规范。
- `<SKILL: z-test>` — 单元测试、API 测试与 E2E 测试。
- `<SKILL: z-document>` — 文档格式与 Mermaid 图形规范。
