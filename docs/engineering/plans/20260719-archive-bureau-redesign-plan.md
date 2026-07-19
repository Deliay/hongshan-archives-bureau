---
description: 宏山档案局品牌升级与视觉重构实现方案
type: Permanent
---

# 宏山档案局品牌升级与视觉重构实现方案

**对应产品文档**: [[20260719-archive-bureau-redesign|宏山档案局整体品牌升级与视觉重构方案]]
**对应技术方案**: [[20260719-archive-bureau-redesign|宏山档案局品牌升级与视觉重构技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-19
**作者**: 前端工程
**开发分支**: `feat/archive-bureau-redesign`

## 1. 概述

### 1.1 目标

本方案将技术方案中定义的设计系统、组件、页面改造计划转化为可执行的代码实现清单。实现过程中保持现有路由、数据流、缓存、Diff 系统不变，仅对视觉层进行重构。

### 1.2 范围

- **做**：全局样式 token、通用 UI 组件、布局组件、着陆页、首页、各模块列表/详情页、占位页、Diff 组件视觉、文案替换
- **不做**：新增路由、修改数据适配器、修改 API 封装、修改缓存与 Diff 逻辑、修改富文本解析

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/ui/Card.tsx` | 统一卡片容器 |
| `src/components/ui/Badge.tsx` | 徽章/标签组件 |
| `src/components/ui/Skeleton.tsx` | 骨架屏组件 |
| `src/components/ui/ArchiveSeal.tsx` | 档案局徽章 |
| `src/data/archiveMeta.ts` | 模块编号、密级等元数据 |
| `src/components/Layout/PlaceholderPage.tsx` | 统一占位页 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `index.html` | 引入思源宋体与 JetBrains Mono |
| `src/index.css` | 定义 `@theme` token 与全局动画 |
| `src/routes/Landing.tsx` | 着陆页重构 |
| `src/routes/ArchiveHome.tsx` | 档案局首页重构 |
| `src/components/Layout/Sidebar.tsx` | 侧边导航重构 |
| `src/components/Layout/Breadcrumb.tsx` | 面包屑样式更新 |
| `src/components/Layout/Footer.tsx` | 页脚文案与样式 |
| `src/components/Layout/ArchiveLayout.tsx` | 布局间距调整 |
| `src/components/Rarity.tsx` | 低星级颜色调整 |
| `src/components/Items/ItemPanel.tsx` | 道具卡片新样式 |
| `src/components/Items/ItemIcon.tsx` | 图标占位新样式 |
| `src/components/Items/ItemTooltip.tsx` | 弹窗新样式 |
| `src/components/Items/RewardPanel.tsx` | 奖励面板新样式 |
| `src/components/DiffViewer/*` | Diff 徽章与面板新样式 |
| `src/pages/*` | 各模块列表/详情页样式更新 |

### 2.3 删除文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/Layout/TopNav.tsx` | 未被引用的死代码 |

## 3. 详细实现

### 3.1 全局样式与设计 Token

#### 3.1.1 `index.html`

在 `<head>` 中追加字体链接：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@500;600;700&display=swap" rel="stylesheet">
```

#### 3.1.2 `src/index.css`

完整替换为：

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

body {
  background: var(--color-archive-ink);
  color: var(--color-archive-ivory);
  font-family: var(--font-body);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

### 3.2 通用 UI 组件

#### 3.2.1 `src/components/ui/Card.tsx`

```tsx
import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded border border-archive-border bg-archive-file p-6',
        hover && 'transition-all duration-200 hover:border-archive-gold/40',
        className
      )}
    >
      {children}
    </div>
  )
}
```

说明：`cn` 为工具函数，若不存在则在 `src/lib/utils.ts` 中新增：

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

若项目未引入 `clsx`/`tailwind-merge`，则使用简单字符串拼接替代。

#### 3.2.2 `src/components/ui/Badge.tsx`

```tsx
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'gold' | 'seal' | 'bronze' | 'ghost'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-archive-border text-archive-dust',
  gold: 'bg-archive-gold/10 text-archive-gold border border-archive-gold/30',
  seal: 'bg-archive-seal/10 text-archive-seal border border-archive-seal/30',
  bronze: 'bg-archive-bronze/10 text-archive-bronze border border-archive-bronze/30',
  ghost: 'bg-transparent text-archive-lead',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}
```

#### 3.2.3 `src/components/ui/Skeleton.tsx`

```tsx
import { cn } from '../../lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-archive-border', className)} />
}
```

#### 3.2.4 `src/components/ui/ArchiveSeal.tsx`

```tsx
interface ArchiveSealProps {
  className?: string
  size?: number
}

export function ArchiveSeal({ className, size = 48 }: ArchiveSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="宏山档案局徽章"
    >
      <circle cx="24" cy="24" r="22" stroke="#B89A6A" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="17" stroke="#9E3A3A" strokeWidth="1" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="#E8E6E3"
        fontSize="16"
        fontFamily="Noto Serif SC, serif"
        fontWeight="600"
      >
        宏
      </text>
    </svg>
  )
}
```

### 3.3 元数据

#### 3.3.1 `src/data/archiveMeta.ts`

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

export function formatArchiveCode(module: string, index?: number): string {
  const code = MODULE_CODES[module] ?? module.toUpperCase()
  return index !== undefined ? `${code}-${String(index).padStart(3, '0')}` : code
}

export type SecurityLevel = 'public' | 'internal' | 'core'

export const SECURITY_LABELS: Record<SecurityLevel, string> = {
  public: '公开',
  internal: '内部',
  core: '核心',
}
```

### 3.4 布局组件改造

#### 3.4.1 `Sidebar.tsx`

- 宽度由 `w-56` 改为 `w-60`
- 顶部新增 `ArchiveSeal` + 「宏山档案局」标题，使用 `font-display`
- 激活态背景使用 `bg-archive-gold/10`，文字使用 `text-archive-gold`
- 语言切换按钮样式同步新 token
- 移动端抽屉行为保持不变

#### 3.4.2 `Breadcrumb.tsx`

- 分隔符由 `/` 改为 `›` 或档案编号风格的短竖线
- 当前项使用 `Badge variant="ghost"`
- 文字颜色使用 `archive-dust` 与 `archive-ivory`

#### 3.4.3 `Footer.tsx`

- 文案改为「宏山档案局 · 塔卫二官方档案管理与调阅系统」
- 颜色使用 `archive-dust` 与 `archive-lead`

#### 3.4.4 `ArchiveLayout.tsx`

- 主内容区边距由 `md:ml-56` 改为 `md:ml-60`
- 背景色使用 `bg-archive-ink`
- 内容区最大宽度保持 `max-w-7xl`

### 3.5 着陆页 `Landing.tsx`

```tsx
import { ArchiveSeal } from '../components/ui/ArchiveSeal'

export default function LandingPage() {
  // ... existing state logic ...

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-archive-ink transition-opacity duration-600 ease-out ${entered ? 'opacity-0' : 'opacity-100'}`}>
      <ArchiveSeal size={80} className="mb-6" />

      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-[0.2em] text-archive-gold mb-3">
        宏山档案局
      </h1>
      <p className="text-sm md:text-base text-archive-dust tracking-widest mb-12">
        塔卫二官方档案管理与调阅系统
      </p>

      <button
        onClick={handleEnter}
        className="px-10 py-3 border border-archive-gold/50 text-archive-gold tracking-widest text-sm
                   hover:bg-archive-gold hover:text-archive-ink transition-all duration-300"
      >
        进入档案局
      </button>

      <p className="absolute bottom-8 text-xs text-archive-lead tracking-wider">
        — 管理员记录 —
      </p>
    </div>
  )
}
```

### 3.6 首页 `ArchiveHome.tsx`

- 使用 `Card` 组件替代原 div
- 每个卡片顶部显示模块编号（如 `HSA-OPR`）
- 标题使用 `font-display`
- 子入口使用 `Badge variant="ghost"`

```tsx
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MODULE_CODES } from '../data/archiveMeta'

// MODULES 数组中增加 module key
const MODULES = [
  { key: 'operators', label: '干员档案', path: '/archive/operators', desc: '可操作角色一览', subLinks: [...] },
  // ...
]

export default function ArchiveHome() {
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl font-bold text-archive-ivory mb-2">档案局总览</h2>
        <p className="text-sm text-archive-dust">选择一卷档案开始调阅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m, i) => (
          <Card key={m.path} className="group">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="ghost">{MODULE_CODES[m.key]}</Badge>
            </div>
            <Link to={m.path}>
              <h3 className="font-display text-lg font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
                {m.label}
              </h3>
              <p className="text-sm text-archive-lead mt-1">{m.desc}</p>
            </Link>
            {m.subLinks && (
              <div className="mt-4 pt-3 border-t border-archive-border space-y-2">
                {m.subLinks.map((sl) => (
                  <Link key={sl.path} to={sl.path} className="block text-sm text-archive-dust hover:text-archive-gold transition-colors">
                    {sl.label}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 3.7 占位页

#### 3.7.1 `src/components/Layout/PlaceholderPage.tsx`

```tsx
import { Card } from '../ui/Card'
import { ArchiveSeal } from '../ui/ArchiveSeal'

interface PlaceholderPageProps {
  title: string
  code: string
}

export function PlaceholderPage({ title, code }: PlaceholderPageProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Card className="text-center py-16">
        <ArchiveSeal size={64} className="mx-auto mb-6 opacity-60" />
        <h1 className="font-display text-2xl font-bold text-archive-ivory mb-2">{title}</h1>
        <p className="text-sm text-archive-dust mb-4">该卷宗正在整理中</p>
        <Badge variant="ghost">{code}</Badge>
      </Card>
    </div>
  )
}
```

装备、工厂、地理模块统一使用该组件。

### 3.8 通用组件样式迁移

#### 3.8.1 `Rarity.tsx`

将星级颜色映射调整为：

```ts
const RARITY_COLORS = [
  'archive-lead',  // 1
  'archive-lead',  // 2
  'archive-dust',  // 3
  '#26bbfd',       // 4
  '#9452fa',       // 5
  '#ffbb03',       // 6
]
```

#### 3.8.2 `ItemPanel.tsx`

- 背景使用 `bg-archive-file`
- 边框使用 `border-archive-border`
- hover 边框使用 `hover:border-archive-gold/40`
- 稀有度条颜色保持不变

#### 3.8.3 `DiffViewer` 系列

- 新增徽章：`Added` 使用 `bronze`，`Removed` 使用 `seal`，`Changed` 使用 `gold`
- 折叠头部 hover 背景使用 `hover:bg-archive-file`
- 箭头旋转保持现有实现

### 3.9 各模块页面改造

所有页面遵循统一迁移规则：

1. 将 `bg-[#0F0F12]` 替换为 `bg-archive-ink`
2. 将 `bg-[#1A1B23]` 替换为 `bg-archive-file`
3. 将 `border-[#2A2A32]` 替换为 `border-archive-border`
4. 将 `text-[#E8E6E3]` 替换为 `text-archive-ivory`
5. 将 `text-[#8B8982]` 替换为 `text-archive-dust`
6. 将 `text-[#5A5A62]` 替换为 `text-archive-lead`
7. 将 `text-[#C9A96E]` 替换为 `text-archive-gold`
8. 将 `hover:border-[#C9A96E]/40` 替换为 `hover:border-archive-gold/40`
9. 页面标题使用 `font-display`
10. 列表项/详情头增加 `Badge` 展示模块编号或密级

### 3.10 文案替换

全局搜索以下文案并替换：

| 旧文案 | 新文案 |
|--------|--------|
| 宏山档案馆 | 宏山档案局 |
| 塔卫二资料集 | 塔卫二官方档案管理与调阅系统 |
| 阅览资料 | 进入档案局 |
| 欢迎阅览 | 档案局总览 |
| 选择一卷档案开始查阅 | 选择一卷档案开始调阅 |
| 待实现 | 该卷宗正在整理中 |

注意：仅替换品牌相关文案，避免误伤游戏内数据文本。

## 4. 实现顺序

### 阶段一：基础（第 1 轮提交）

1. 修改 `index.html` 引入字体
2. 重写 `src/index.css` 定义 `@theme`
3. 新增 `src/lib/utils.ts`（若需要 `cn`）
4. 新增 `src/components/ui/Card.tsx`、`Badge.tsx`、`Skeleton.tsx`、`ArchiveSeal.tsx`
5. 新增 `src/data/archiveMeta.ts`
6. 删除 `src/components/Layout/TopNav.tsx`

### 阶段二：布局（第 2 轮提交）

1. 改造 `Sidebar.tsx`、`Breadcrumb.tsx`、`Footer.tsx`、`ArchiveLayout.tsx`
2. 新增 `PlaceholderPage.tsx`
3. 改造占位模块页面

### 阶段三：核心页面（第 3–4 轮提交）

1. 改造 `Landing.tsx`
2. 改造 `ArchiveHome.tsx`
3. 改造 `OperatorList` / `OperatorDetail`
4. 改造 `WeaponList` / `WeaponDetail`
5. 改造 `RaceList` / `FactionList`
6. 改造 `EnemyList` / `EnemyDetail`
7. 改造 `ItemList` / `ItemTooltip`
8. 改造 `ProfessionList`
9. 改造 `UpdateHome` / `UpdateDetail`

### 阶段四：通用组件与细节（第 5 轮提交）

1. 改造 `Rarity.tsx`、`ItemPanel.tsx`、`ItemIcon.tsx`、`RewardPanel.tsx`
2. 改造 `DiffViewer` 系列组件
3. 全局文案替换
4. 统一 Loading 为 `Skeleton`

### 阶段五：验证（第 6 轮提交）

1. 运行 `npm run lint`
2. 运行 `npm run test`
3. 运行 `npm run build`
4. 运行 Playwright E2E 测试
5. 修复问题并补充测试

## 5. 测试计划

### 5.1 新增组件测试

在 `src/components/ui/` 对应目录下新增测试：

- `Card.test.tsx`：验证渲染、hover 类、自定义 className
- `Badge.test.tsx`：验证各 variant 渲染
- `Skeleton.test.tsx`：验证骨架屏存在
- `ArchiveSeal.test.tsx`：验证 SVG 与 aria-label

### 5.2 更新现有测试

- 更新涉及文案的测试：如「宏山档案馆」→「宏山档案局」
- 更新颜色相关的快照测试（如有）

### 5.3 E2E 测试

新增/更新 `tests/e2e/` 下用例：

- `landing.spec.ts`：标题、徽章、进入按钮
- `home.spec.ts`：卷宗索引卡片、编号、子入口
- `navigation.spec.ts`：侧边栏、面包屑、语言切换
- `operator.spec.ts`：列表筛选、详情页卷宗头
- `mobile.spec.ts`：侧边抽屉、布局适配

## 6. 验收标准

- [ ] 全站无旧色值硬编码（`#0F0F12`、`#1A1B23`、`#2A2A32`、`#C9A96E` 等已替换为 token）
- [ ] 全站无「宏山档案馆」品牌文案残留
- [ ] `npm run lint` 通过
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过
- [ ] Playwright E2E 测试通过
- [ ] 桌面端所有页面视觉正常，无布局崩坏
- [ ] 移动端所有页面视觉正常，侧边抽屉可用
- [ ] 图片加载失败时显示默认占位
- [ ] 老用户原有操作路径不受影响

## 7. 风险与回滚

| 风险 | 缓解措施 |
|------|----------|
| Tailwind v4 `@theme` 编译问题 | 先在单独文件验证，确保 token 类名可正常生成 |
| 字体加载导致 FOUT | 使用 `font-display: swap`，并提供系统字体回退 |
| 大量样式替换遗漏 | 全局搜索旧色值与旧类名，建立检查清单 |
| 文案替换误伤 | 限定替换范围为组件内静态文案，排除 i18n 数据 |
| 移动端布局异常 | 每改造一个页面都在移动端验证 |

回滚：本次为纯前端视觉层改动，可直接回滚到上一个稳定 commit。

## 8. 相关文档

- [[20260719-archive-bureau-redesign|宏山档案局整体品牌升级与视觉重构方案]]
- [[20260719-archive-bureau-redesign|宏山档案局品牌升级与视觉重构技术方案]]
- [[common-rules|通用开发规范]]
- [[frontend-spec|前端开发规范]]
- [[engineering-spec|工程架构规范]]
