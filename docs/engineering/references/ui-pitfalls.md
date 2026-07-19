---
description: 前端 UI 常见陷阱与交互经验参考
type: Permanent
---

# UI 常见陷阱参考

本文档记录前端实现中容易出错或需要特殊处理的交互经验。

## 卡片作为链接与嵌套子链接

卡片整体需可点击跳转至详情页，同时内部可能包含跳转到其他实体的子链接。实现方式：

- 卡片外层用 `<Link>` 包裹
- 子链接容器添加 `onClick={(e) => e.stopPropagation()}`
- 为 a11y 补充 `onKeyDown` 与 `role="none"`

## 超链接 Tooltip 定位

固定定位 tooltip 必须在渲染后通过 `getBoundingClientRect` 测量，若超出视口则调整位置。应使用 `useEffect` 进行渲染后计算，不要依赖内联样式预先计算。

## ItemTooltip 与 HyperlinkTooltip 区别

- `ItemTooltipOverlay` 使用居中模态（`fixed inset-0`），不担心视口溢出。
- `HyperlinkTooltip` 使用定位 tooltip，需要手动视口夹紧（viewport clamping）。

## Breadcrumb 新增详情页

新增详情页时，更新 `src/components/Layout/Breadcrumb.tsx`：

- 在 `DetailLabel` 中为新的列表 key 添加 case
- 创建子组件获取实体名称并渲染
- 避免面包屑显示原始 ID（如 `tag_race_fox`）

## 异步模块级缓存不会触发重渲染

`ensureStyleTable` 已被移除：模块级异步缓存不会触发 React 重渲染。应使用同步 state + `useEffect` 管理会触发重渲染的数据。

## 图片加载失败兜底

所有动态图片（头像、图标、立绘）应提供占位 fallback，避免布局塌陷或空白。

## 响应式网格

列表页卡片网格统一使用：

- 桌面端：`grid-cols-4`
- 平板：`md:grid-cols-3` / `sm:grid-cols-2`
- 手机：`grid-cols-1`

## 相关文档

- [前端开发规范](../frontend-spec.md)
- [[rich-text-spec|富文本规范参考]]
