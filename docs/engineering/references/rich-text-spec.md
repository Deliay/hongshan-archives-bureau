---
description: 富文本解析与渲染规范参考
type: Permanent
---

# 富文本规范参考

本文档记录 `src/lib/richText.tsx` 的解析规则、标签行为与常见陷阱。

## 解析器

采用栈式解析器，匹配 Blazor `RichTextRender` 逻辑。主正则：

```
(<(@|#)?(.*?)>)|(<\/.*?>)|(\n)
```

## 支持标签

| 标签 | 说明 |
|------|------|
| `color` | 颜色标签，如 `<color=#C9A96E>text</color>` |
| `mark` | 高亮标签，必须带颜色属性：`<mark=#C9A96E>text</mark>` |
| `b` | 加粗 |
| `br` | 换行 |
| `align` | 对齐 |
| `image` | 图片。`<image="path">` 为孤立标签；`<image>path</image>` 使用内联文本作为 src |

## 超链接与样式前缀

- `#` 前缀：可点击按钮，带 tooltip（`HyperlinkTag` + `HyperlinkTooltip`）。tooltip 内容来自 `HyperlinkTextTable`，可能本身包含富文本，需递归渲染。
- `@` 前缀：带样式 span，颜色通过 `STYLE_COLORS` 映射。

## 样式颜色

`RichTextStyleTable` 异步加载在 Vite HMR 下不可靠，因此将常见 `ba.*` 样式颜色硬编码到 `STYLE_COLORS` 中，例如：

- `natur` → `#b4d945`
- `fire` → `#ff623d`
- `poise` → `#ffbb03`
- `heal` → `#26bbfd`

`RichTextStyleTable` 中 `preDef[0]` 为开标签，`postDef[0]` 为闭标签，Blazor 源仅使用索引 0。

## HyperlinkTooltip 定位

`HyperlinkTooltip` 通过 `anchorRef` prop 直接使用 `HyperlinkTag` 的 ref 定位与检测点击外部，不要使用 `document.getElementById(anchorId)`，避免同一 tag 多次出现时定位错误。

Tooltip 内容本身可能包含富文本，需通过 `<RichText>` 递归渲染。固定定位 tooltip 需在 `useEffect` 中通过 `getBoundingClientRect` 测量并调整位置，防止超出视口。

## I18NText

`I18NText` 组件将 `{ id, text }` 解析为 locale 文本后，再通过 `<RichText>` 渲染。

## mark 标签必须带颜色

`<mark>` 必须写为 `<mark=#hexcolor>`，否则 `attrs.mark === undefined`，无法显示高亮。

## 差异高亮不破坏标签

`RichTextDiff` 使用字符级最长公共前后缀隔离变化部分，仅对中间差异部分加 `<span>` 样式（删除线+红色背景 / 绿色背景）。不能将 token 拆开后包进 `<color>` 或 `<mark>`，否则会破坏超链接和颜色标签结构。

## 相关文档

- [前端开发规范](../frontend-spec.md)
- [[ui-pitfalls|UI 常见陷阱]]
