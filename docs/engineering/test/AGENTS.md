---
description: docs/engineering/test 目录的验收问题文档规范
type: Permanent
---

# 验收问题文档规范

本目录存放《宏山档案馆》各模块的验收问题记录与修复报告。收到验收问题反馈后，必须遵循本规范创建或更新文档。

## 目录结构

```
docs/engineering/test/
  AGENTS.md                     本文件
  YYYYMMDD-<feature-slug>-acceptance-report.md   当前在途的验收报告
  archived/                     已完结的验收报告
    20260726-factory-acceptance-report.md
    20260731-story-chronicle-acceptance-report.md
    20260802-story-recap-mobile-nav-acceptance-report.md
```

## 文档命名

- 新建报告命名格式：`YYYYMMDD-<feature-slug>-acceptance-report.md`，例如 `20260726-factory-acceptance-report.md`。
- 归档文件保持原内容不变，仅移动位置到 `archived/`。

## 报告内容模板

每份验收报告必须包含：

1. **YAML front matter**：`description`（简述本轮验收主题）与 `type: Permanent`。
2. **状态横幅**：`> **状态**: ...` 概述本轮受理的验收反馈数量与整体进度。
3. **关联文档**：关联 PRD / 技术方案 / 实现方案 的链接（`[[...]]` 或相对路径），以及关联分支、验收日期。
4. **需求概述**（可选）：本轮验收对应的需求背景。
5. **验收问题清单**：每个问题一节，包含：
   - 问题描述（含复现 URL/路径）
   - 根因分析
   - 修复方案（按步骤列出，标注涉及文件）
   - 验证结果（✅ 形式，含 E2E / 单测 / lint / build 结果）
   - 修复 commit（在总览表中回填）
6. **修复总览表格**：`| # | 问题 | 根因 | 状态 | 修复 commit |`，实时回填每个问题的 commit hash。
7. **最终验证表格**：lint / build / 单测 / E2E 的结果汇总。
8. **经验总结**：本轮沉淀的可复用经验，简短列表。

## 处理流程

1. **创建/更新报告**：收到验收问题反馈后，在 `test/` 根目录按日期创建报告；同一模块同一轮验收追加到现有报告（按 2.x 序号递增）。
2. **实时更新**：修复每个问题后，同步更新文档中对应条目（commit hash、验证结果）。
3. **提交文档**：验收完成后随代码一起提交。
4. **知识沉淀**：每个问题修复后，将**可复用的经验**同步整理到对应的正式参考文档中：
   - 前端交互 / 布局经验 → [UI 常见陷阱参考](../references/ui-pitfalls.md)
   - 富文本解析经验 → [富文本规范参考](../references/rich-text-spec.md)
   - 数据表 / 字段结构经验 → [数据层常见陷阱](../references/data-pitfalls.md)、[数据表映射参考](../references/data-mapping-tables.md)
   - 工程架构 / 缓存经验 → [工程架构规范](../engineering-spec.md)
   - 求解器经验 → [制作链路求解器参考](../references/factory-chain-solver.md)
5. **归档**：验收全部闭环、长期经验已沉淀至正式文档后，将报告移入 `archived/`（保持原内容不变），`test/` 根目录只保留在途报告。
6. **引用维护**：归档后，正式文档中引用验收报告的链接需更新为 `archived/` 下的新路径。

## 相关文档

- [[AGENTS|工程协作说明]]
- [数据层常见陷阱](../references/data-pitfalls.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [富文本规范参考](../references/rich-text-spec.md)
