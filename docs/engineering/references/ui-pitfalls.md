---
description: 前端 UI 常见陷阱与交互经验参考
type: Permanent
---

# UI 常见陷阱参考

本文档记录前端实现中容易出错或需要特殊处理的交互经验。

## 卡片作为链接与嵌套子链接

卡片整体需可点击跳转至详情页，同时内部可能包含跳转到其他实体的子链接。HTML 标准禁止 `<a>` 嵌套 `<a>`，React 在开发模式下会抛出 `validateDOMNesting` 警告，严重时导致 hydration 错误。

正确做法：

- 卡片外层使用 `<div>`（或 `<article>`、`<section>` 等语义化块级元素），不渲染为 `<a>`
- 卡片的标题/主区域使用一个 `<Link>`（`<a>`）
- 内部子链接使用独立的 `<Link>`（`<a>`），与主链接为兄弟关系而非父子关系
- 不要依赖 `stopPropagation` 来“解决”嵌套 `<a>`，那只是掩盖事件冒泡，无法解决非法 DOM 结构

错误示例：

```tsx
<Link to="/races/race-01">           {/* 外层 <a> */}
  <h3>种族名称</h3>
  <Link to="/operators/op-01">成员</Link>  {/* 内层 <a>，非法！ */}
</Link>
```

正确示例：

```tsx
<div>
  <Link to="/races/race-01">
    <h3>种族名称</h3>
  </Link>
  <Link to="/operators/op-01">成员</Link>
</div>
```

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

列表页与首页卡片网格应根据信息密度选择列数：

- **首页卷宗索引**：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **列表页卡片**：`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`
- **手机端**：统一 `grid-cols-1`

避免在所有页面强制 4 列，防止首页卡片内容稀疏或详情页关联卡片过密。

## ReactFlow（@xyflow/react）

### 自定义节点必须显式设置 width/height，否则边全部不渲染

ReactFlow 的 `getEdgePosition()` 内部调用 `isNodeInitialized()`，要求 `node.measured.width || node.width || node.initialWidth` 为真。自定义节点依赖 DOM 测量（ResizeObserver），首帧渲染时 `measured.width` 尚未赋值，所有边因 `sourceX === null` 返回 null——表现为节点正常、边全部消失（验收 2.11/问题 12，34 条边只渲染 1 条）。

修复：dagre 布局时为每个节点显式设置 `width`/`height`（与 dagre 计算尺寸一致），并收敛到统一的 `nodeSize()` 函数供布局与渲染共用，禁止两处各自硬编码。

### ReactFlow 默认 CSS 会覆盖边样式

仅在边的 `style` 属性上改颜色/宽度可能被 ReactFlow 默认 CSS 覆盖，深色主题下边几乎不可见（验收 2.11 首次修复失败）。需要追加全局 CSS 覆盖 `.react-flow__edge path` 与 `.react-flow__arrow polygon`。改样式后必须用 E2E 断言 `.react-flow__edge` 实际渲染数量，不能只看视觉效果。

### 排障方法

遇到库内部渲染问题时，先加日志确认根因发生在哪一层（store 数据 vs 布局 vs DOM 渲染），再决定绕过还是修复配置；不要过早绕过（验收 2.11 曾误判为 React 19 + zustand v4 兼容性问题，实际是节点尺寸未就绪）。

## 相关文档

- [前端开发规范](../frontend-spec.md)
- [[rich-text-spec|富文本规范参考]]
