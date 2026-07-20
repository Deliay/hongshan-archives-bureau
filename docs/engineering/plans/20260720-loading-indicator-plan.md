---
description: 加载提示框与骨架屏代码实现方案
type: Fleeting
---

# 加载提示框与骨架屏 - 实现方案

**对应产品文档**: [[20260720-loading-indicator|加载提示框产品方案]]
**对应技术方案**: [[20260720-loading-indicator|加载提示框与骨架屏 - 技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-20
**作者**: 前端工程
**开发分支**: `feat/loading-indicator`

## 1. 概述

### 1.1 目标

将已评审通过的产品方案与技术方案转化为可执行的代码实现清单。实现过程中复用现有 API 与缓存机制，不新增后端服务，不修改现有业务逻辑与数据模型。

### 1.2 范围

- **做**：
  - 新增全局加载状态管理 `LoadingProvider` 与右上角浮层 `LoadingToast`。
  - 在 `src/lib/api.ts` 中接入请求生命周期追踪。
  - 扩展骨架屏体系，新增 `DetailSkeleton`、`ListSkeleton`、`SearchSkeleton`。
  - 为所有依赖 API 的页面补充/替换骨架屏。
  - 补充 i18n 加载/错误/重试相关 key。

- **不做**：
  - 不新增后端接口。
  - 不修改现有数据模型、适配器签名、缓存策略。
  - 不修改现有业务逻辑（仅在页面最外层补充加载态 UI）。
  - 不实现图片等非 API 资源的加载提示。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/Loading/types.ts` | 加载状态类型定义 |
| `src/components/Loading/LoadingProvider.tsx` | 全局加载 Context Provider |
| `src/components/Loading/useLoading.ts` | 消费 Context 的 hook |
| `src/components/Loading/LoadingToast.tsx` | 右上角加载/错误浮层 |
| `src/components/Loading/tracker.ts` | 供 API 层直接调用的 tracker 单例 |
| `src/components/ui/DetailSkeleton.tsx` | 详情页骨架屏 |
| `src/components/ui/ListSkeleton.tsx` | 列表页骨架屏 |
| `src/components/ui/SearchSkeleton.tsx` | 搜索页骨架屏 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/api.ts` | 所有 `fetch*` 函数接入 `trackFetch` |
| `src/components/ui/PageSkeleton.tsx` | 扩展 `variant` prop |
| `src/App.tsx` | 引入 `LoadingProvider` 与 `LoadingToast` |
| `src/pages/operators/OperatorDetail.tsx` | 替换为 `DetailSkeleton` |
| `src/pages/operators/OperatorList.tsx` | 替换为 `ListSkeleton` |
| `src/pages/weapons/WeaponDetail.tsx` | 替换为 `DetailSkeleton` |
| `src/pages/weapons/WeaponList.tsx` | 替换为 `ListSkeleton` |
| `src/pages/enemies/EnemyDetail.tsx` | 补充 `DetailSkeleton` |
| `src/pages/enemies/EnemyList.tsx` | 替换为 `ListSkeleton` |
| `src/pages/items/ItemList.tsx` | 替换为 `ListSkeleton` |
| `src/pages/equipment/EquipmentOverview.tsx` | 补充骨架屏 |
| `src/pages/professions/ProfessionOverview.tsx` | 补充骨架屏 |
| `src/pages/geography/GeographyList.tsx` | 补充骨架屏 |
| `src/pages/factory/FactoryOverview.tsx` | 补充骨架屏 |
| `src/pages/story/StoryOverview.tsx` | 补充骨架屏 |
| `src/pages/search/ArchiveSearch.tsx` | 补充 `SearchSkeleton` |
| `src/pages/updates/UpdateSummary.tsx` | 检查并补充骨架屏 |
| `src/pages/updates/UpdateTableDiff.tsx` | 检查并补充骨架屏 |
| `src/pages/races/RaceDetail.tsx` | 补充 `DetailSkeleton` |
| `src/pages/factions/FactionDetail.tsx` | 补充 `DetailSkeleton` |
| `src/i18n/dicts/*.json` | 补充 `common.loading*` 系列 key |

## 3. 详细实现

### 3.1 类型定义 `src/components/Loading/types.ts`

```ts
export interface LoadingItem {
  key: string
  description: string
  startedAt: number
}

export interface LoadingError {
  key: string
  description: string
  message: string
  timestamp: number
  retry?: () => void
}

export interface LoadingContextValue {
  items: LoadingItem[]
  errors: LoadingError[]
  start: (key: string, description: string) => void
  complete: (key: string) => void
  fail: (key: string, message: string) => void
  retry: (key: string) => void
}
```

### 3.2 tracker 单例 `src/components/Loading/tracker.ts`

```ts
import type { LoadingContextValue } from './types'

let dispatch: LoadingContextValue | null = null

export function registerLoadingContext(ctx: LoadingContextValue) {
  dispatch = ctx
}

export function startLoading(key: string, description: string) {
  dispatch?.start(key, description)
}

export function completeLoading(key: string) {
  dispatch?.complete(key)
}

export function failLoading(key: string, message: string) {
  dispatch?.fail(key, message)
}
```

说明：API 层为纯函数模块，无法调用 React hook，因此通过单例模式注册 Context 方法。

### 3.3 LoadingProvider `src/components/Loading/LoadingProvider.tsx`

```tsx
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { registerLoadingContext } from './tracker'
import type { LoadingContextValue, LoadingError, LoadingItem } from './types'

interface State {
  items: LoadingItem[]
  errors: LoadingError[]
  retryHandlers: Map<string, () => void>
}

type Action =
  | { type: 'start'; key: string; description: string }
  | { type: 'complete'; key: string }
  | { type: 'fail'; key: string; message: string }
  | { type: 'registerRetry'; key: string; handler: () => void }
  | { type: 'retry'; key: string }

const LoadingContext = createContext<LoadingContextValue | null>(null)

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        items: [...state.items, { key: action.key, description: action.description, startedAt: Date.now() }],
        errors: state.errors.filter(e => e.key !== action.key),
      }
    case 'complete':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }
    case 'fail':
      return {
        ...state,
        items: state.items.filter(i => i.key !== action.key),
        errors: [
          ...state.errors.filter(e => e.key !== action.key),
          {
            key: action.key,
            description: state.items.find(i => i.key === action.key)?.description ?? action.key,
            message: action.message,
            timestamp: Date.now(),
            retry: state.retryHandlers.get(action.key),
          },
        ],
      }
    case 'registerRetry':
      state.retryHandlers.set(action.key, action.handler)
      return state
    case 'retry': {
      const handler = state.retryHandlers.get(action.key)
      handler?.()
      return { ...state, errors: state.errors.filter(e => e.key !== action.key) }
    }
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    errors: [],
    retryHandlers: new Map(),
  })

  const start = useCallback((key: string, description: string) => {
    dispatch({ type: 'start', key, description })
  }, [])

  const complete = useCallback((key: string) => {
    dispatch({ type: 'complete', key })
  }, [])

  const fail = useCallback((key: string, message: string) => {
    dispatch({ type: 'fail', key, message })
  }, [])

  const registerRetry = useCallback((key: string, handler: () => void) => {
    dispatch({ type: 'registerRetry', key, handler })
  }, [])

  const retry = useCallback((key: string) => {
    dispatch({ type: 'retry', key })
  }, [])

  const value = useMemo<LoadingContextValue>(
    () => ({ items: state.items, errors: state.errors, start, complete, fail, retry }),
    [state.items, state.errors, start, complete, fail, retry],
  )

  useMemo(() => {
    registerLoadingContext({ ...value, registerRetry } as unknown as LoadingContextValue)
  }, [value, registerRetry])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}
```

说明：`registerRetry` 不暴露给外部消费者，仅用于 tracker 内部；为了类型简洁，可单独导出 `registerRetry` 函数。

### 3.4 LoadingToast `src/components/Loading/LoadingToast.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useLoading } from './LoadingProvider'
import { useI18n } from '../../i18n'

const MIN_VISIBLE_MS = 400
const SLOW_THRESHOLD_MS = 3000

export function LoadingToast() {
  const { t } = useI18n()
  const { items, errors, retry } = useLoading()
  const [lastEmptyAt, setLastEmptyAt] = useState<number | null>(null)

  useEffect(() => {
    if (items.length === 0 && errors.length === 0 && lastEmptyAt === null) {
      setLastEmptyAt(Date.now())
    } else if ((items.length > 0 || errors.length > 0) && lastEmptyAt !== null) {
      setLastEmptyAt(null)
    }
  }, [items.length, errors.length, lastEmptyAt])

  const visible = useMemo(() => {
    if (items.length > 0 || errors.length > 0) return true
    if (lastEmptyAt == null) return false
    return Date.now() - lastEmptyAt < MIN_VISIBLE_MS
  }, [items.length, errors.length, lastEmptyAt])

  const isSlow = useMemo(() => {
    if (items.length === 0) return false
    const oldest = Math.min(...items.map(i => i.startedAt))
    return Date.now() - oldest > SLOW_THRESHOLD_MS
  }, [items])

  if (!visible) return null

  const latestDescription = items[items.length - 1]?.description ?? errors[errors.length - 1]?.description ?? ''

  return (
    <div className="fixed top-4 right-4 z-50 min-w-[15rem] max-w-[20rem]
                    rounded border border-archive-border bg-archive-ink/95 backdrop-blur-sm
                    shadow-lg shadow-black/20 p-3 animate-fade-in">
      {errors.length > 0 ? (
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 rounded-full bg-archive-seal shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-archive-seal">{t('common.loadingFailed')}</div>
            <div className="text-xs text-archive-dust mt-1 truncate">{latestDescription}</div>
            <div className="text-xs text-archive-lead mt-1 line-clamp-2">{errors[errors.length - 1]?.message}</div>
            <button
              onClick={() => retry(errors[errors.length - 1].key)}
              className="mt-2 px-2.5 py-1 text-xs rounded border border-archive-border
                         text-archive-ivory hover:border-archive-gold/60 transition-colors"
            >
              {t('common.loadingRetry')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-archive-gold border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-archive-ivory">
              {items.length > 1
                ? t('common.loadingRequestCount', { count: items.length })
                : t('common.loadingArchive')}
            </div>
            {latestDescription && (
              <div className="text-xs text-archive-dust mt-1 truncate">{latestDescription}</div>
            )}
            {isSlow && (
              <div className="text-xs text-archive-gold mt-1">{t('common.loadingSlow')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

说明：使用 Tailwind 的 `animate-spin` 实现旋转；颜色 token 假设已存在 `archive-seal`（印章红），如不存在则使用 `#9E3A3A`。

### 3.5 API 层改造 `src/lib/api.ts`

```ts
import { startLoading, completeLoading, failLoading } from '../components/Loading/tracker'

function generateLoadingKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function trackFetch<T>(description: string, fn: (key: string) => Promise<T>): Promise<T> {
  const key = generateLoadingKey()
  startLoading(key, description)
  try {
    const result = await fn(key)
    completeLoading(key)
    return result
  } catch (error) {
    failLoading(key, error instanceof Error ? error.message : String(error))
    throw error
  }
}

export async function fetchTableKeys(table: string): Promise<string[]> {
  return trackFetch(`正在调阅 ${table} 索引`, () => fetchJson(`${API_BASE}/table/${table}`))
}

export async function fetchTableAll(table: string): Promise<Record<string, any>> {
  return trackFetch(`正在调阅 ${table}`, () => fetchJson(`${API_BASE}/table/${table}/all`))
}

export async function fetchTableEntry(table: string, key: string): Promise<any> {
  return trackFetch(`正在调阅 ${table}/${key}`, () => fetchJson(`${API_BASE}/table/${table}/${key}`))
}

export async function fetchVersion(): Promise<string> {
  return trackFetch('正在检查版本', async () => {
    const res = await fetch(`${API_BASE}/version`)
    if (!res.ok) throw new Error('Failed to fetch version')
    return res.text()
  })
}

export async function fetchI18nLocales(): Promise<string[]> {
  return trackFetch('正在加载语言列表', () => fetchJson(`${API_BASE}/i18n`))
}

export async function fetchTableDictAll(table: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return trackFetch(`正在加载 ${table} 多语言 (${locale})`, () =>
    fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/all`)
  )
}

export async function fetchTableDictEntry(table: string, key: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return trackFetch(`正在加载 ${table}/${key} 多语言 (${locale})`, () =>
    fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/${key}`)
  )
}

export async function fetchI18nSearch(regex: string): Promise<{ Table: string; Path: string; Id: string }[]> {
  return trackFetch('正在搜索档案', () => fetchJson(`${API_BASE}/i18n/search/all/${encodeURIComponent(regex)}`))
}

export async function fetchI18nText(locale: string, id: string): Promise<string> {
  return trackFetch(`正在解析文本 (${locale})`, async () => {
    const res = await fetch(`${API_BASE}/i18n/${locale}/${id}`)
    if (!res.ok) return ''
    return res.text()
  })
}
```

### 3.6 重试机制

为了让重试能真正重新发起请求，需要把请求包装为可重试函数。调整 `trackFetch` 设计：

```ts
const retryHandlers = new Map<string, () => Promise<unknown>>()

async function trackFetch<T>(description: string, fn: () => Promise<T>): Promise<T> {
  const key = generateLoadingKey()

  const execute = async (): Promise<T> => {
    startLoading(key, description)
    try {
      const result = await fn()
      completeLoading(key)
      return result
    } catch (error) {
      failLoading(key, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  retryHandlers.set(key, execute)
  // 将 retry 注册到 Provider（在 App 初始化后）
  registerRetry(key, () => { execute().catch(() => {}) })

  return execute()
}
```

`registerRetry` 需要在 `LoadingProvider` 挂载后注册；若 Context 尚未挂载，则重试处理器先暂存在 Map 中，Provider 注册时批量同步。

更简单的实现：将重试逻辑收敛在 API 层，不依赖 Context 注册：

```ts
const retryHandlers = new Map<string, () => void>()

export function retryLoading(key: string) {
  retryHandlers.get(key)?.()
}

async function trackFetch<T>(description: string, fn: () => Promise<T>): Promise<T> {
  const key = generateLoadingKey()

  const execute = async () => {
    startLoading(key, description)
    try {
      const result = await fn()
      completeLoading(key)
      return result
    } catch (error) {
      failLoading(key, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  retryHandlers.set(key, () => { execute().catch(() => {}) })
  return execute()
}
```

`LoadingToast` 中点击重试时直接调用 `retryLoading(lastError.key)`。

### 3.7 骨架屏组件

#### 3.7.1 DetailSkeleton `src/components/ui/DetailSkeleton.tsx`

```tsx
import { Skeleton } from './Skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up" data-testid="skeleton">
      <div className="flex items-start gap-4">
        <Skeleton className="w-20 h-20 rounded shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
```

#### 3.7.2 ListSkeleton `src/components/ui/ListSkeleton.tsx`

```tsx
import { Skeleton } from './Skeleton'

interface ListSkeletonProps {
  filters?: number
  cards?: number
}

export function ListSkeleton({ filters = 3, cards = 8 }: ListSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in-up" data-testid="skeleton">
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: filters }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  )
}
```

#### 3.7.3 SearchSkeleton `src/components/ui/SearchSkeleton.tsx`

```tsx
import { Skeleton } from './Skeleton'

export function SearchSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up" data-testid="skeleton">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-12 h-12 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 3.7.4 PageSkeleton 扩展 `src/components/ui/PageSkeleton.tsx`

```tsx
import { Skeleton } from './Skeleton'

interface PageSkeletonProps {
  lines?: number
  title?: boolean
}

export function PageSkeleton({ lines = 6, title = true }: PageSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in-up" data-testid="skeleton">
      {title && <Skeleton className="h-8 w-48" />}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
```

### 3.8 App.tsx 集成

```tsx
import { LoadingProvider } from './components/Loading/LoadingProvider'
import { LoadingToast } from './components/Loading/LoadingToast'

function AppRoutes() {
  const { locale } = useLocale()
  return (
    <I18nProvider locale={locale}>
      <BrowserRouter>
        <LoadingToast />
        <Routes>
          {/* ...existing routes */}
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default function App() {
  return (
    <LoadingProvider>
      <LocaleProvider>
        <AppRoutes />
      </LocaleProvider>
    </LoadingProvider>
  )
}
```

说明：`LoadingProvider` 需要包裹 `LocaleProvider`，因为 API 层可能在 `LocaleProvider` 之外被调用；为简化，直接置于最外层。`LoadingToast` 放在 `BrowserRouter` 内部或外部均可，因为它不依赖路由。

### 3.9 页面骨架屏接入示例

#### 3.9.1 OperatorDetail

```tsx
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'

if (loading) return <DetailSkeleton />
```

#### 3.9.2 OperatorList

```tsx
import { ListSkeleton } from '../../components/ui/ListSkeleton'

if (loading) return <ListSkeleton filters={8} cards={8} />
```

#### 3.9.3 ArchiveSearch

```tsx
import { SearchSkeleton } from '../../components/ui/SearchSkeleton'

if (loading) return <SearchSkeleton />
```

#### 3.9.4 EnemyDetail

当前页面通过 `useEnemies()` 获取数据，但未处理 loading。修改后：

```tsx
const { data: enemies, loading, error } = useEnemies()

if (loading) return <DetailSkeleton />
if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
```

后续 `enemy` 查找失败时仍展示 `notFound` 提示。

### 3.10 i18n Key 补充

在 `src/i18n/dicts/*.json` 的 `common` 下新增：

```json
{
  "common": {
    "loading": "加载中",
    "loadingArchive": "正在调阅档案",
    "loadingRequestCount": "正在调阅 {{count}} 份档案",
    "loadingSlow": "档案数据较大，请稍候…",
    "loadingFailed": "调阅失败",
    "loadingRetry": "重试"
  }
}
```

CN 为源语言，其他语言补充英文/原文 fallback：

```json
{
  "EN": {
    "common": {
      "loadingArchive": "Loading archive...",
      "loadingRequestCount": "Loading {{count}} archives...",
      "loadingSlow": "Archive data is large, please wait...",
      "loadingFailed": "Failed to load",
      "loadingRetry": "Retry"
    }
  }
}
```

## 4. 实现顺序

### 阶段一：加载状态基础设施（第 1 轮提交）

1. 新增 `src/components/Loading/types.ts`。
2. 新增 `src/components/Loading/tracker.ts`。
3. 新增 `src/components/Loading/LoadingProvider.tsx`。
4. 新增 `src/components/Loading/LoadingToast.tsx`。
5. 修改 `src/App.tsx` 引入 Provider 与 Toast。

### 阶段二：API 请求追踪（第 2 轮提交）

1. 修改 `src/lib/api.ts`，所有 `fetch*` 函数接入 `trackFetch`。
2. 实现重试机制与 `retryLoading`。

### 阶段三：骨架屏组件（第 3 轮提交）

1. 扩展 `src/components/ui/PageSkeleton.tsx`。
2. 新增 `DetailSkeleton`、`ListSkeleton`、`SearchSkeleton`。

### 阶段四：页面接入骨架屏（第 4 轮提交）

1. 替换/补充所有依赖 API 的页面加载态。
2. 检查 `UpdateSummary`、`UpdateTableDiff` 是否已有骨架屏，按需补充。

### 阶段五：多语言与测试（第 5 轮提交）

1. 补充 `src/i18n/dicts/*.json` key。
2. 新增 `LoadingProvider` 单元测试。
3. 新增骨架屏组件渲染测试。
4. 运行 `npm run lint` / `npm run test` / `npm run build`。

## 5. 测试计划

### 5.1 单元测试

- `LoadingProvider` 的 `start/complete/fail/retry` 状态流转。
- `tracker` 单例在 Provider 注册前后的行为。
- 重试函数能重新发起请求。

### 5.2 组件测试

- `LoadingToast` 在加载态、慢加载态、错误态下的渲染。
- `DetailSkeleton`、`ListSkeleton`、`SearchSkeleton` 渲染后包含 `data-testid="skeleton"`。

### 5.3 E2E 测试

- 进入任意列表页，确认右上角出现加载提示且页面展示骨架屏。
- 模拟网络失败，确认提示框切换为错误态，点击重试后恢复。
- 切换语言后确认多请求并发时提示显示请求数。
- 缓存命中页面直接展示内容，无加载提示。

## 6. 验收标准

- [ ] 任意 API 请求触发后右上角 200ms 内出现加载提示。
- [ ] 多请求并发时提示显示请求数与当前描述。
- [ ] 请求持续超过 3 秒显示安抚文案。
- [ ] 请求失败时提示框切换为错误态并提供重试。
- [ ] 所有依赖 API 的页面加载时展示骨架屏。
- [ ] `npm run lint` 通过。
- [ ] `npm run test` 通过。
- [ ] `npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 全局 Context 重渲染影响性能 | 浮层/页面卡顿 | 使用 `useReducer` 与 `useMemo`，细粒度订阅 |
| 骨架屏与真实页面结构不一致 | 视觉跳变 | 按真实页面结构绘制骨架屏 |
| API 层 tracker 单例在测试环境下异常 | 单测失败 | 提供 mock Provider 与 reset 函数 |
| 重试时旧错误未清除 | 浮层状态错乱 | 重试开始时调用 `startLoading` 并清除对应 error |

回滚策略：纯前端体验增强，可直接回滚到上一稳定 commit。

## 8. 相关文档

- [[20260720-loading-indicator|加载提示框产品方案]]
- [[20260720-loading-indicator|加载提示框与骨架屏 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
- [国际化规范](../references/i18n-spec.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
