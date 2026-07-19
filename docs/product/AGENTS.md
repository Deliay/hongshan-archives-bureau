---
description: docs/product 目录的产品文档协作说明
type: Permanent
---

# docs/product 协作说明

本目录存放《宏山档案馆》的产品文档。所有产品文档的编写、评审与发布流程遵循 `<SKILL: z-product>`。

## 文档生命周期

```
docs/product/
  draft/      草稿，新建文档一律先放入此处
  reviewed/   已通过 Review 的文档
  shipping/   正在开发实现的文档
  released/   已上线验收通过的文档
```

## 编写规范

- 每个文件顶部包含 YAML front matter（`description`、`type`）。
- 同一主题保持原子化，避免一个文件混合多个不相关主题。
- 流程图与架构图统一使用 Mermaid 语法，不引用外部图片。
- 产品文档聚焦用户视角与业务逻辑，不描述前端组件、后端接口或项目结构。
- 文件命名使用创建日期作为唯一标识符：`YYYYMMDD-{Title-With-Hyphens}.md`，例如 `20260719-site-concept.md`。ID 仅用于排序和去重，不表示优先级。

## 相关技能

- `<SKILL: z-product>` — 产品文档规范、生命周期管理与模板。
- `<SKILL: z-document>` — 通用文档格式与 Mermaid 图形规范。
