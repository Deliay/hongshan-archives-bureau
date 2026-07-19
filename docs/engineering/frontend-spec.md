---
description: 前端开发规范：技术栈、组件、样式、路由与富文本
type: Permanent
---

# 前端开发规范

本文档定义《宏山档案馆》前端开发的技术选型、代码组织、样式与交互规范。详细富文本规则与 UI 陷阱参见 `references/` 目录。

## 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 | 函数组件 + Hooks |
| 语言 | TypeScript ~6.0 | 严格类型 |
| 构建 | Vite 8 | 开发服务器与生产构建 |
| 路由 | react-router-dom v7 | 客户端路由 |
| 样式 | Tailwind CSS v4 | 原子化工具类，无配置文件 |
| 测试 | Vitest + React Testing Library | 单元与组件测试 |
| E2E | Playwright | 端到端测试 |
| Lint | oxlint | 静态检查 |

## 项目结构

```
src/
  App.tsx              路由入口
  main.tsx             应用挂载
  index.css            全局样式与 Tailwind 引入
  routes/              顶层路由页面（Landing、ArchiveHome）
  pages/               按领域组织的页面组件
  components/          通用与领域组件
  hooks/               数据获取 Hooks
  lib/                 API、适配器、缓存、类型、工具
  data/                静态常量
```

## 路由约定

- 入口页：`/`
- 档案馆首页：`/archive`
- 列表页：`/archive/<module>`
- 卷宗页：`/archive/<module>/:id`
- 更新日志：`/archive/updates/:versionName` 与 `/archive/updates/:versionName/:tableFile`

路由配置集中在 `src/App.tsx`。

## 组件规范

- 页面组件按领域分目录：`pages/operators/`、`pages/weapons/` 等。
- 通用组件放入 `components/` 并按子目录分组：`components/Layout/`、`components/Items/`。
- 组件文件使用 PascalCase 命名，例如 `OperatorList.tsx`。
- 优先使用函数组件与 Hooks。
- 数据获取逻辑抽离到 `hooks/` 中的自定义 Hook，不在组件中直接调用 fetch。

## 样式规范

- 全部使用 Tailwind CSS 工具类，不编写自定义 CSS 文件（`index.css` 除外）。
- 颜色使用项目设计系统：

| 用途 | 色值 |
|------|------|
| 页面背景 | `#0F0F12` |
| 卡片背景 | `#1A1B23` |
| 边框 | `#2A2A32` |
| 主文字 | `#E8E6E3` |
| 次要文字 | `#8B8982` |
| 弱提示 | `#5A5A62` |
| 强调色 | `#C9A96E` |

- 卡片统一使用圆角、细边框、hover 时边框变为强调色透明 40%。
- 响应式断点使用 Tailwind 默认断点：`sm`、`md`、`lg`。
- 卡片网格在桌面端 4 列、平板 2–3 列、手机 1 列。

## 状态管理

- 不使用外部全局状态库。
- 组件级状态使用 `useState` / `useReducer`。
- 跨组件共享状态通过 React Context（如多语言 `LocaleProvider`）。
- 服务端状态通过 `hooks/useData.ts` 统一管理，内置缓存与去重。

## 交互规范

- 卡片整体可点击跳转，内部子链接使用 `stopPropagation` 避免冲突。
- 滑动条统一使用 `accent-[#C9A96E]`。
- 下拉框与输入框统一深色背景 + 细边框，focus 时边框变强调色。
- 图片加载失败提供占位 fallback。

## 富文本

富文本渲染使用 `src/lib/richText.tsx`。详见 [富文本规范参考](./references/rich-text-spec.md)。要点：

- 栈式解析器，支持 `color`、`mark`、`b`、`br`、`align`、`image` 标签。
- `#` 前缀为超链接，`@` 前缀为样式 span。
- `mark` 标签必须带颜色属性，如 `<mark=#C9A96E>text</mark>`。
- `HyperlinkTooltip` 通过 ref 定位，不要依赖 `getElementById`。
- `I18NText` 将 `{ id, text }` 解析后再走 `<RichText>` 渲染。

## 性能

- 列表页使用 `useMemo` 缓存筛选、排序、分组结果。
- 图片按需加载，不预加载大量资源。
- 避免在渲染阶段触发副作用，数据获取统一在 Hook 的 `useEffect` 中处理。

## UI 常见陷阱

详见 [UI 常见陷阱参考](./references/ui-pitfalls.md)。关键项包括：

- 卡片作为链接与嵌套子链接的处理。
- Tooltip 的视口夹紧与 ref 定位。
- 新增详情页时更新 `Breadcrumb.tsx`。
- 异步模块级缓存不会触发 React 重渲染，应使用同步 state + `useEffect`。

## 相关文档

- [[AGENTS|工程协作说明]]
- [[common-rules|通用开发规范]]
- [[engineering-spec|工程架构规范]]
- [富文本规范参考](./references/rich-text-spec.md)
- [UI 常见陷阱参考](./references/ui-pitfalls.md)
