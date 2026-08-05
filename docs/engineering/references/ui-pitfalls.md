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

## 全视口「终端类」页面：消除页面级滚动条

聊天终端这类需要占满视口的页面，用普通流式布局（`h-[calc(100vh-4rem)]`）难以精确抵消防火（main padding + 面包屑 + footer），页面仍会出现窗口级滚动条（Baker 实测 `scrollHeight` 833 > 视口 720）。可靠做法（Baker 验收 §14.1）：

- 根容器改全视口固定壳：`fixed inset-0 md:left-60 z-10 bg-archive-ink overflow-hidden grid`（桌面用 `md:left-60` 避开固定侧边栏，覆盖 footer/面包屑区）。
- 左右分栏 `overflow-hidden`，各自内部 `overflow-y-auto` 滚动。
- E2E 断言 `documentElement.scrollHeight <= clientHeight`（加载完成后）。

## 移动端导航控件必须随主操作区一同置顶

任何承担「切换」职责的控件（下拉、页签、导航）应并入 sticky 头部的同一容器，滚动时保持可达；独立散落在内容区会随内容滚出视口，破坏连续阅读体验（验收 2.1）。

响应式下同一控件移动/桌面形态可并存：桌面端由侧栏导航承担切换，移动端由头部下拉承担，通过 `md:hidden` / `hidden md:block` 按断点切换形态，避免两套交互并存。

## 百分比宽度约束不可放在 shrink-to-fit 容器内部

`max-width: 70%` 这类百分比解析依赖父容器宽度；若父容器宽度又由子内容决定（shrink-to-fit 的 flex 列），则形成循环依赖，浏览器会收缩到最小可行值（实测父列 40px、气泡 28px，`px-3` 内边距后表情仅剩 4×4px、9 字符文本被拆成两行）。约束应放在有确定宽度的 flex 项（列）上，子元素用 `w-fit`（`width: fit-content`）自适应（验收 2.3）。

## 滚动重置的依赖键须覆盖所有「内容切换」维度

滚动容器不随内容切换卸载重挂载时（数据命中缓存加载极快、skeleton 未出现），仅依赖单一维度（如 `topicId`）会漏掉该维度不变的切换——两个聊天的 `topicId` 均为 `''`，切换联系人时 effect 不触发，旧 DOM 滚动位置被保留。应以 `chatId:topicId` 组合键驱动重置（`lastKey` ref 去重），保证切换 chat 或 topic 都回到顶部（验收 2.4、2.12）。

## 两栏详情页用 URL 参数驱动选中项

左列表 + 右详情的两栏布局，用查询参数（如 `doc=`、`cat=`）承载当前选中项：刷新、深链、筛选切换后选中态不丢失；详情组件以 `itemId` prop 纯渲染，便于独立路由复用（验收 2.5）。

## 引用卡片占满行宽

聊天中的引用消息（PRTS / 任务卡片）不应渲染为普通气泡：卡片消息不渲染头像与发送者名，父列 `flex-1` + `items-stretch` + `max-w-[96%]`，卡片自身 `w-full`，占满一行大部分空间（验收 2.10）。

## E2E 断言需限定控件作用域

页面存在多个同类型控件（如两个 `select`、同文案按钮）时，定位必须限定到目标控件内部（`selectOption` 枚举、`locator('select')` 均需 `.first()` 或嵌套作用域），否则严格模式或选项误取导致存量失败（验收 2.2）。

## 侧栏面板向上展开浮层需补定位上下文

在侧栏底部面板内做「向上展开」的浮层（`absolute bottom-full`）时，注意 Sidebar 外层容器通常无定位，浮层会相对更上级的定位祖先错位。组件根节点需显式补 `relative` 作为定位上下文（验收 20260804 2.1，MusicControlPanel 队列浮层）。

## E2E 环境清理避免 pkill 匹配自身

本机跑 E2E 前清理残留 dev server 时，`pkill -f vite` 会匹配当前 shell 自身命令行（含 vite 字样）导致自杀（exit -15）。改用按端口清理：`kill $(lsof -t -i:5173)`；日志路径也不要带工具名（验收 20260804 经验）。

## 相关文档

- [前端开发规范](../frontend-spec.md)
- [[rich-text-spec|富文本规范参考]]
