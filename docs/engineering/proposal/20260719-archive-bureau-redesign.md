---
description: 宏山档案局品牌升级与视觉重构技术方案
type: Fleeting
---

# 宏山档案局品牌升级与视觉重构技术方案

**对应产品文档**: [[20260719-archive-bureau-redesign|宏山档案局整体品牌升级与视觉重构方案]]
**技术方案版本**: v1.0
**创建日期**: 2026-07-19
**作者**: 前端工程

## 背景与目标

### 1.1 背景

当前站点为「宏山档案馆」，视觉风格偏游戏终端深色陈列，颜色与字号大量以 Tailwind 任意值硬编码，缺少统一设计 token。随着产品定位升级为「宏山档案局」，需要在不改动功能与数据的前提下，对整站视觉进行重构，建立一套可被长期维护的设计系统。

### 1.2 目标

- 建立以 Tailwind CSS v4 `@theme` 为核心的设计 token 系统，统一颜色、字体、间距、阴影
- 完成全站「馆」→「局」文案替换，并补充多语言场景
- 重构着陆页、档案局首页、侧边导航、面包屑、页脚、列表页、详情页、更新日志的视觉表现
- 引入档案局符号系统：徽章、卷宗编号、密级徽章、装订线装饰
- 保持现有路由、数据流、缓存、Diff 系统、富文本渲染不变
- 保证桌面端与移动端响应式体验一致

## 范围

### 2.1 做

- 使用 Tailwind v4 `@theme` 定义全局设计 token
- 在 `index.html` 引入思源宋体（Noto Serif SC）作为标题字体
- 重构 `src/index.css` 全局样式与 token
- 改造 `src/routes/Landing.tsx` 着陆页
- 改造 `src/routes/ArchiveHome.tsx` 档案局首页
- 改造 `src/components/Layout/Sidebar.tsx`、`Breadcrumb.tsx`、`Footer.tsx`
- 为各列表页与详情页统一应用新卡片、标签、徽章样式
- 为 `Rarity`、`ItemPanel`、`ItemIcon`、`ItemTooltip` 等通用组件更新视觉
- 为 Diff 系列组件更新变更类型徽章配色
- 为占位模块（EquipmentOverview / FactoryOverview / GeographyList）应用统一占位页
- 将 `TopNav.tsx` 死代码删除或重新整合

### 2.2 不做

- 不新增页面或路由
- 不修改数据模型、适配器逻辑、API 封装
- 不修改缓存策略、Diff 系统、富文本解析规则
- 不引入新的全局状态管理库
- 不修改构建工具链或测试框架

## 现状分析

### 3.1 当前问题

- **无设计 token**: 颜色、字号、阴影全部为 Tailwind 任意值硬编码，如 `text-[#C9A96E]`、`bg-[#1A1B23]`，维护成本高
- **品牌符号弱**: 站点名称仅以文字形式出现在 Sidebar 与 Landing，缺少徽章、印章等视觉锚点
- **页面气质不统一**: 部分列表页卡片密集，详情页信息堆叠，缺少档案卷宗的仪式感
- **死代码**: `TopNav.tsx` 已实现但未被引用，与 Sidebar 形成重复导航实现
- **占位页简陋**: 装备、工厂、地理模块仅展示标题与「待实现」文字，影响整体完成度
- **Loading 不统一**: 有的页面用文字，有的用骨架条，有的直接 `return null`

### 3.2 可复用基础

- 路由与布局结构清晰，`ArchiveLayout` 作为主包装
- 数据获取已抽象到 `hooks/useData.ts`，页面改造无需改动数据层
- 卡片模式已高度一致，只需抽取统一 `Card` 组件并替换样式
- 多语言通过 `LocaleProvider` 与 `useI18nLocales` 统一管理

## 技术方案

### 4.1 设计 Token 系统

在 `src/index.css` 中使用 Tailwind CSS v4 的 `@theme` 指令定义 token，替代硬编码任意值。

```css
@import "tailwindcss";

@theme {
  --color-archive-ink: #0A0A0D;
  --color-archive-file: #13141A;
  --color-archive-border: #2A2B35;
  --color-archive-ivory: #E8E6E3;
  --color-archive-dust: #8B8982;
  --color-archive-lead: #5A5A62;
  --color-archive-gold: #B89A6A;
  --color-archive-gold-hover: #C9A96E;
  --color-archive-seal: #9E3A3A;
  --color-archive-seal-hover: #C45C5C;
  --color-archive-bronze: #5A7A6A;

  --font-display: "Noto Serif SC", "Source Han Serif SC", "STSong", serif;
  --font-body: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Consolas", monospace;
}
```

后续组件使用 `bg-archive-ink`、`text-archive-gold`、`border-archive-border` 等语义化类名。

### 4.2 字体加载策略

- 在 `index.html` 中新增思源宋体与 JetBrains Mono 的 Google Fonts 或本地字体链接
- 标题字体使用 `font-display`，正文保持 `font-body`
- 等宽字体仅用于卷宗编号、版本号、模板 ID 等数据标识
- 设置合理的 `font-display: swap`，避免字体加载阻塞渲染

### 4.3 通用组件改造

#### 4.3.1 Card 组件

新建 `src/components/ui/Card.tsx` 作为统一卡片容器，替代各页面重复的卡片类名。

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div className={`
      p-6 rounded border border-archive-border bg-archive-file
      ${hover ? 'hover:border-archive-gold/40 transition-all duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}
```

#### 4.3.2 Badge 组件

新建 `src/components/ui/Badge.tsx`，统一标签与徽章样式。

```tsx
type BadgeVariant = 'default' | 'gold' | 'seal' | 'bronze' | 'ghost'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}
```

#### 4.3.3 Skeleton 组件

新建 `src/components/ui/Skeleton.tsx`，统一加载占位。

```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-archive-border rounded ${className}`} />
  )
}
```

#### 4.3.4 Rarity 组件

调整 `src/components/Rarity.tsx` 的星级颜色，解决低星级在深色背景下对比度不足的问题。1–2 星使用 `archive-dust`，3 星蓝，4 星紫，5 星金，6 星橙。

#### 4.3.5 Layout 组件

- `Sidebar.tsx`: 加宽至 `w-60`，顶部新增档案局徽章区，菜单项增加卷宗编号前缀图标
- `Breadcrumb.tsx`: 增加「当前位置」徽章样式，使用 `/` 分隔符改为档案编号风格分隔
- `Footer.tsx`: 使用新的文字色与边框色，文案同步为「宏山档案局」

### 4.4 页面改造清单

| 页面 | 文件路径 | 改造点 |
|------|----------|--------|
| 着陆页 | `src/routes/Landing.tsx` | 新增档案局徽章、主标题改用衬线字体、按钮改为印章红或沉金、底部铭牌 |
| 首页 | `src/routes/ArchiveHome.tsx` | 改为卷宗索引卡片，包含编号、名称、描述、子入口，顶部增加欢迎语与最新版本 |
| 侧边导航 | `src/components/Layout/Sidebar.tsx` | 顶部徽章、菜单项图标、激活态使用沉金背景 |
| 面包屑 | `src/components/Layout/Breadcrumb.tsx` | 新的分隔符与样式 |
| 页脚 | `src/components/Layout/Footer.tsx` | 文案与颜色 |
| 干员列表 | `src/pages/operators/OperatorList.tsx` | 新卡片、编号徽章、筛选器样式 |
| 干员详情 | `src/pages/operators/OperatorDetail.tsx` | 卷宗头版式、衬线标题、属性分区 |
| 武器列表/详情 | `src/pages/weapons/*` | 新卡片、稀有度条、技能面板样式 |
| 种族/阵营 | `src/pages/races/*`、`src/pages/factions/*` | 卷宗卡片、成员子卡片 |
| 敌人 | `src/pages/enemies/*` | 列表筛选、属性面板、抗性展示 |
| 道具 | `src/pages/items/*` | `ItemPanel` 与 `ItemTooltip` 新样式 |
| 职业属性 | `src/pages/professions/*` | 职业卡片、元素球 |
| 更新日志 | `src/pages/updates/*` | 版本卷宗头、统计面板、差异徽章 |
| 占位模块 | `src/pages/equipment/*`、`src/pages/factory/*`、`src/pages/geography/*` | 统一「卷宗整理中」状态页 |

### 4.5 档案局符号系统实现

#### 4.5.1 卷宗编号

在 `src/data/constants.ts` 或新建 `src/data/archiveMeta.ts` 中定义模块编号映射：

```ts
export const MODULE_CODES: Record<string, string> = {
  operators: 'HSA-OPR',
  weapons: 'HSA-WPN',
  professions: 'HSA-PRF',
  races: 'HSA-RCE',
  factions: 'HSA-FCT',
  enemies: 'HSA-ENE',
  items: 'HSA-ITM',
  geography: 'HSA-GEO',
  equipment: 'HSA-EQP',
  factory: 'HSA-FAC',
  story: 'HSA-STY',
  updates: 'HSA-UPD',
}
```

编号用于首页卡片、列表页标题、面包屑、详情页卷宗头。

#### 4.5.2 档案局徽章

在 `src/components/Layout/Sidebar.tsx` 与 `src/routes/Landing.tsx` 中引入 SVG 徽章组件 `ArchiveSeal`。徽章为印章/盾形，中心为「宏」字抽象符号，配色为档案金 + 印章红。

#### 4.5.3 密级徽章

新增 `SecurityBadge` 组件，支持 `public` / `internal` / `core` 三种级别。当前所有数据均为 `public`，仅用于氛围营造。

### 4.6 动效策略实现

- 使用 Tailwind 原生 transition 类，不引入额外动画库
- 定义全局进入动画工具类（可置于 `index.css`）：

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

- 着陆页淡出保持 600ms，缓动调整为 `ease-out`
- 卡片 hover 仅改变边框与背景，不使用 transform scale
- 折叠面板使用 `grid-template-rows` 动画或简单 height transition
- 通过 `prefers-reduced-motion` 禁用非必要动画

### 4.7 响应式调整

- 桌面端：侧边导航固定 `w-60`，主内容区 `md:ml-60`
- 平板：首页卷宗索引 2 列，列表页 3 列
- 移动端：首页单列，侧边导航保持抽屉，筛选器可折叠
- 详情页：卷宗头垂直堆叠，属性区在移动端单列

### 4.8 死代码处理

- 删除 `src/components/Layout/TopNav.tsx`（当前无引用）
- 如后续需要顶部导航，在 Sidebar 基础上扩展，避免维护两份实现

## 数据与接口

本次重构为纯前端视觉改造，不涉及数据模型、API 接口、缓存策略、Diff 系统的变更。所有数据获取继续通过 `hooks/useData.ts` → `lib/api.ts` → 远端数据服务的现有链路。

唯一需要调整的是部分文案可能来自 i18n 字典（如模块名称），但模块名称当前为代码中硬编码中文，本次同步更新为中文文案即可。多语言界面的静态文案（如「宏山档案局」）需要在 `LocaleProvider` 或相关常量中维护，本次先以中文为基准，其他语言后续补充。

## 实现计划

### 第一阶段：基础设计系统

1. 在 `src/index.css` 中定义 `@theme` token
2. 在 `index.html` 引入思源宋体与等宽字体
3. 新建 `src/components/ui/` 目录与 `Card`、`Badge`、`Skeleton` 组件
4. 更新 `Rarity` 组件颜色

### 第二阶段：布局与导航

1. 设计并实现 `ArchiveSeal` 徽章组件
2. 改造 `Sidebar.tsx`、`Breadcrumb.tsx`、`Footer.tsx`
3. 删除 `TopNav.tsx`
4. 更新 `ArchiveLayout.tsx` 的间距与边距

### 第三阶段：核心页面

1. 改造 `Landing.tsx` 与 `ArchiveHome.tsx`
2. 定义 `MODULE_CODES` 与卷宗编号映射
3. 按清单逐页改造列表页与详情页
4. 更新 `ItemPanel`、`ItemTooltip`、`ItemIcon` 等通用组件

### 第四阶段：细节打磨

1. 统一 Loading 状态为 `Skeleton`
2. 为占位模块应用统一状态页
3. 调整 Diff 系列组件的变更徽章配色
4. 检查移动端响应式

### 第五阶段：验证

1. 运行 `npm run lint`
2. 运行 `npm run test`
3. 运行 `npm run build`
4. 运行 E2E 测试
5. 人工走查所有页面

## 测试策略

### 7.1 单元/组件测试

- 为 `Card`、`Badge`、`Skeleton`、`ArchiveSeal` 等新组件编写基础渲染测试
- 验证 `MODULE_CODES` 映射完整性
- 验证 `Rarity` 组件各星级渲染正确

### 7.2 E2E 测试

更新或新增以下 Playwright 用例：

- 着陆页：标题显示「宏山档案局」，点击进入首页
- 首页：所有卷宗入口可见，点击干员卷宗进入列表
- 侧边导航：档案局徽章可见，语言切换可用
- 列表页：筛选器、搜索、卡片网格正常
- 详情页：卷宗头、属性、关联内容正常
- 移动端：侧边抽屉可打开/关闭，布局无崩坏

### 7.3 视觉回归

- 由于改动范围大，建议在关键页面（Landing、ArchiveHome、OperatorList、OperatorDetail）进行人工截图对比
- 重点检查深色背景、金色强调、红色印章在新旧页面中的呈现差异

## 验收标准

- [ ] `npm run build` 通过，无 TypeScript 错误
- [ ] `npm run lint` 通过，无 lint 错误
- [ ] `npm run test` 通过
- [ ] 全站无「宏山档案馆」或单独「馆」字残留
- [ ] 桌面端与移动端各页面布局正常，无元素重叠或截断
- [ ] 所有可点击元素 hover/focus 状态可见
- [ ] 图片加载失败时显示档案局默认占位
- [ ] 旧用户可沿用原有操作路径访问任意页面

## 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Tailwind v4 `@theme` 用法不熟 | 编译失败 | 参考官方文档，先在 `index.css` 做小范围验证 |
| 思源宋体加载慢 | 首屏文字闪烁 | 使用 `font-display: swap`，并提供系统衬线字体回退 |
| 大量文件样式替换遗漏 | 部分页面仍用旧色 | 全局搜索旧色值 `#C9A96E`、`#1A1B23` 等，确保全部替换 |
| 移动端抽屉与新徽章冲突 | 布局异常 | 在 Sidebar 改造后立即进行移动端测试 |
| 文案替换误伤 | 非站点名称的「馆」被替换 | 全局替换时结合上下文 review，仅替换品牌相关文案 |

回滚策略：本次改动为纯前端视觉层，若出现严重问题，可直接回滚到上一个 commit，不影响数据与接口。

## 相关文档

- [[20260719-archive-bureau-redesign|宏山档案局整体品牌升级与视觉重构方案]]
- [[common-rules|通用开发规范]]
- [[frontend-spec|前端开发规范]]
- [[engineering-spec|工程架构规范]]
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [富文本规范参考](../references/rich-text-spec.md)
