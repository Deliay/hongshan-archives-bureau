---
description: 前端国际化（I18n）规范：字典生成、key 命名、组件用法与回退策略
type: Permanent
---

# 国际化（I18n）规范

本文档定义《宏山档案局》前端 UI 文案的国际化实现方式，涵盖字典生成、key 命名、组件接入与测试。

## 架构概览

```
src/i18n/
  index.tsx          # I18nProvider / useI18n / translate（自动生成 import）
  dicts/{locale}.json # 各语言扁平化字典（自动生成）
scripts/
  generate-i18n-dicts.ts  # 从 /i18n API 拉取官方译文并合并站点自定义 key
```

应用外层由 `LocaleProvider`（`src/lib/locale.tsx`）管理当前语言并持久化到 `localStorage`，`I18nProvider` 订阅 locale 后通过 `useI18n()` 向组件提供 `t(key, vars)`。

## 字典生成

**不要手动编辑 `src/i18n/dicts/*.json`**。所有字典通过以下命令重新生成：

```bash
node scripts/generate-i18n-dicts.ts
```

脚本流程：

1. 调用 `GET /i18n` 获取服务器当前支持的 locale 列表（当前 14 个：CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT）。
2. 对 `OFFICIAL_IDS` 中的每个 key，调用 `/i18n/{locale}/{id}` 获取各语言官方译文。
3. 合并 `CUSTOM` 中的站点自定义 key；若某 locale 无人工译文，按 `EN → CN` 自动填充。
4. 输出 `src/i18n/dicts/{locale}.json` 并重新生成 `src/i18n/index.tsx` 的 import 列表。

网络请求偶发 TLS 握手失败，直接重试一次即可。

## Key 命名约定

所有 key 使用 **扁平点分命名空间**，全部小写，单词间无空格。

| 命名空间 | 用途 | 示例 |
|----------|------|------|
| `site.*` | 站点级品牌文案 | `site.name`、`site.footer` |
| `nav.*` | 导航文案 | `nav.operators`、`nav.factory` |
| `common.*` | 通用按钮/状态/排序 | `common.search`、`common.loading`、`common.backToList` |
| `operator.*` | 干员相关 | `operator.skill`、`operator.profileRecords` |
| `weapon.*` | 武器相关 | `weapon.title`、`weapon.maxLevel` |
| `enemy.*` | 威胁相关 | `enemy.resilience`、`enemy.distribution` |
| `item.*` | 物品相关 | `item.effect`、`item.obtainWay` |
| `profession.*` | 职业名（数据映射层） | `profession.1`–`profession.8` |
| `update.*` | 版本更新 | `update.added`、`update.changed` |
| `reward.*` | 奖励面板 | `reward.fixed`、`reward.random` |
| `diff.*` | 变更记录（Diff Viewer） | `diff.old`、`diff.changedFields`、`diff.operatorOverview` |

新增 key 时优先复用已有命名空间；跨领域文案应新建命名空间并在方案中说明。

## 回退链

`translate(locale, key, vars)` 按以下顺序查找：

1. 目标语言字典
2. 英语（EN）字典
3. 简中（CN）字典
4. 返回 key 本身

因此未提供人工译文的 locale 会先显示英文，英文也没有时显示简中，确保不空白、不报错。

## 组件接入

```tsx
import { useI18n } from '../../i18n'

export default function SomePage() {
  const { t } = useI18n()
  return <h1>{t('operator.title')}</h1>
}
```

含变量插值：

```tsx
<p>{t('common.backToList', { list: t('weapon.title') })}</p>
```

测试环境必须同时包裹 `LocaleProvider` 和 `I18nProvider`：

```tsx
render(
  <LocaleProvider>
    <I18nProvider locale="CN">
      <Sidebar />
    </I18nProvider>
  </LocaleProvider>
)
```

## 数据层 i18n 分离

游戏内数据文案（干员名、技能描述、物品说明等）**不走 `useI18n()`**，而是按表按 locale 独立获取 i18n 字典，再通过 `resolveI18n(field, i18nMap)` 解析。禁止混用不同表的字典。

UI 文案（按钮、标题、空态、筛选器标签等）才走 `useI18n()`。

## 添加或修改翻译

1. 若是游戏已有官方文案，在 `scripts/generate-i18n-dicts.ts` 的 `OFFICIAL_IDS` 中新增 `key → id` 映射。
2. 若是站点自定义文案，在 `CUSTOM` 中新增/修改 key，至少提供 CN/TC/EN/JP/KR/RU，其余 8 个 locale 可先用 EN 占位。
3. 运行 `node scripts/generate-i18n-dicts.ts` 重新生成字典。
4. 运行 `npm run lint && npm run test && npm run build` 验证。

## 常见陷阱

- `src/i18n/index.tsx` 的 import 列表由脚本自动生成，手动修改会被覆盖。
- 字典中包含 `{{var}}` 占位符，变量名必须与代码中传入的对象键一致。
- 组件测试未包裹 `I18nProvider` 时，`t` 会返回 key 本身，导致断言失败。
- 新增 locale 后，若 `CUSTOM` 未覆盖，会自动回退到 EN/CN，无需手动为每个 key 补全，但建议补齐常用 UI key。

## 相关文档

- [[20260719-globalization-i18n|宏山档案局界面国际化完善方案]]
- [[20260719-globalization-i18n-plan|宏山档案局界面国际化实现方案]]
- [工程架构规范](../engineering-spec.md)
