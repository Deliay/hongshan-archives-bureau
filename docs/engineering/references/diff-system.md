---
description: 版本差异系统实现细节参考
type: Permanent
---

# Diff 系统参考

本文档记录版本差异系统的构建时脚本、运行时类型与组件实现细节。

## 架构

Diff 系统分两层：

1. **构建时**：`scripts/diff-tables.ts` 读取两个版本目录，计算字段级差异，输出结构化 JSON。
2. **运行时**：React 组件通过 hooks 读取 Diff JSON 并渲染。

## 构建时脚本

### 输入输出

- **输入**：`endfield-data/{version-old}` 与 `endfield-data/{version-new}`，各含 `tables/` 与 `i18n/`。
- **输出**：`endfield-data/__diffs__/{v1}__{v2}/<TableName>.json` 与 `I18nTextTable_{Locale}.json`。

### 核心逻辑

- `isI18nField()`：检测 `{ id, text }` 形状（≤2 个 key，仅 `id`/`text`）。
- `deepDiff()`：递归对比对象/数组，生成 `value` 或 `i18n` 类型变更。
- `expandI18nFields()`：将 `{ id, text }` 替换为按语言键化的对象，如 `{ CN: "...", EN: "..." }`。

数组字段变更使用索引路径，例如 `distributionIds[2]`。

## 运行时类型

```typescript
interface FieldChange =
  | { type: 'value'; oldValue: any; newValue: any }
  | { type: 'i18n'; changedLocales: Record<string, { oldText: string; newText: string }> }

interface ChangedEntry {
  oldValue: Record<string, any>
  newValue: Record<string, any>
  changed: Record<string, FieldChange>
}
```

`TableDiff.entries` 包含 `added`、`removed`、`changed` 三个映射。

## 运行时 Hooks

- `useTableDiff(versionName, tableFileName)`：获取 Diff JSON，使用二级缓存。
- `useOperatorAggregatedDiff` / `useWeaponAggregatedDiff` / `useEnemyAggregatedDiff` / `useItemAggregatedDiff`：将多表变更按业务实体汇总。

## 组件

### 注册表

`src/components/DiffViewer/registry.tsx` 维护表名到专用差异组件的映射。`registerTableDiffComponent(tableName, component)` 在各专用组件模块级调用。未注册表回退到通用 `DiffViewer`。

已注册组件：

- `CharacterDiff`
- `CharGrowthDiff`
- `SkillPatchDiff`
- `PotentialTalentDiff`
- `SpaceshipSkillDiff`
- `SpaceshipCharSkillDiff`
- `WeaponDiff`
- `OperatorDiff`

### 通用 DiffViewer

三标签页：added / removed / changed。

- added/removed：展示 `formatJSON()` 处理后的 JSON。
- changed：遍历 `entry.changed`，`value` 类型并排对比旧新值，`i18n` 类型按语言展示 old→new。

### CharacterDiff

- 使用 `globalLocale`（`useLocale()`）获取 lookup 表，不是 `diff.locale`。
- `diff.locale` 仅用于 `I18nTextTable` 字典。
- `profileVoice[N].*` 变更按索引 N 分组，先展示语音标题与描述，再列出字段差异。

### OperatorChangePanel

- 按 charId 聚合 6 张干员相关表。
- 表 badge 顺序遵循 `useOperatorAggregatedDiff.ts` 处理顺序。
- `unlockType` 0/2/4 分别对应「初始解锁」「精英阶段 N」「信赖值 N」。
- 非干员表按变更数降序，6 张干员表固定排在底部。

### RichTextDiff

- 字符级最长公共前后缀隔离变化。
- 公共前后缀正常走 `<RichText>`，中间差异分别加删除线红色背景与绿色背景。
- 可传入 `formatter` 进行 `formatBlackboard` 替换。

## 多语言域

Diff 组件中需严格区分：

- `diff.locale`：生成 Diff 时使用的语言，仅用于 `I18nTextTable`。
- `globalLocale`（`useLocale()`）：用户当前 UI 语言，用于所有 lookup 表 API 获取。

禁止交叉使用。

## 名称解析

当干员在其他表有变更但 `CharacterTable` 无变更时，需通过 API 回退获取名称。名称字段可能是：

- 原始 `{ id, text }`：使用 `resolveI18n(name, charI18nDict)`。
- 语言键化对象（经 `expandI18nFields`）：使用 `localeText(obj, locale)`，读取 `obj[locale] || obj.CN`。

## Profile Voice/Record 分组

变更路径为 `profileVoice[N].fieldName` 或 `profileRecord[N].fieldName`。需按 N 分组，先展示 `newValue` 中的标题与描述，再列出字段差异。`unlockType`/`unlockValue` 位于 `profileVoice[N]` 或 `profileRecord[N]` 层级，不在单个字段层级。

## 相关文档

- [工程架构规范](../engineering-spec.md)
- [[data-pitfalls|数据层常见陷阱]]
