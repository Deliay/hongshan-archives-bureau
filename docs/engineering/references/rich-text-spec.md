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

## image 标签资源子目录

`<image="xxx">` 的 src 由 `getUISprite(path)`（`src/lib/richText.tsx`）生成 `sprites/{path}.png`。**部分资源带子目录，必须按前缀路由，禁止直接拼接**（2026-08-02 Baker 验收修复，详见 [[../test/archived/20260731-story-chronicle-acceptance-report|验收报告]] §14.5）：

| 前缀 | 最终路径 |
|------|---------|
| `sns_emoji_*` | `sprites/sns/emoji/{path}.png` |
| `sns_sticker_*` | `sprites/sns/sticker/{path}.png` |
| 其他 | `sprites/{path}.png`（原逻辑） |

> 若遗漏子目录，资源 404（如 `<image="sns_emoji_005">` 拼成 `sprites/sns_emoji_005.png`）；新增资源前缀时先 curl 验证实际目录再编码。

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

## imageSize prop：行内 emoji 与插图尺寸不同

`RichText` 接受可选 `imageSize` prop（默认 `1rem`），用于控制 `<img>` 尺寸：

- **行内 emoji / sticker**（消息气泡、聊天选项）：传 `imageSize="2rem"`，与选项表情 `w-8 h-8` 对齐。
- **文档插图**（文库正文等）：传 `imageSize="min(100%, 28rem)"`，按正文宽度自适应；若沿用默认 `1rem`，成对 `<image>path</image>` 会渲染成行内小图标而非插图。

## 成对标签的转换点须覆盖「出栈」路径

`<image>path</image>` 这类成对标签正常闭合后会从解析栈弹出（`tag-close` 分支），若只在**栈内节点**上做转换会漏掉，节点保留为 `tag` 渲染成 `<span>` 文本而非 `<img>`。必须在 `tag-close` 出栈时校验被弹节点：无属性 image 标签 + 纯文本子节点 → 就地转换为 `image` 节点（验收 2.7）。

## 特判分支必须早于通用兜底判断

`isOrphanTag` 中 image 特殊形式（`<image>` 空属性）的特判如果放在 `ORPHAN_TAGS.has('image')` 之后，永远不可达（通用判断先命中），成对标签会落入孤儿分支。特判必须前置（验收 2.7）。

## 富文本组件复用同一套解析

选项、气泡、工具提示等所有富文本都应接入同一 `RichText` 组件，避免「同一标签一处渲染一处字面」的分裂（验收 2.11：`BakerOptionGroup` 曾直接渲染纯文本，`<image="sns_emoji_002">` 显示为字面标签）。

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
