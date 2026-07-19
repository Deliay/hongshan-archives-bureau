---
description: 档案搜索模块实现方案
type: Fleeting
---

# 档案搜索完善 - 实现方案

**对应产品文档**: [[20260719-archive-search|档案搜索完善]]
**对应技术方案**: [[20260719-archive-search|档案搜索完善 - 技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-19
**作者**: 前端工程
**开发分支**: `feat/archive-search`

## 1. 概述

### 1.1 目标

将已评审通过的产品方案与技术方案转化为可执行的代码实现清单。实现过程中复用现有数据接口与缓存，不新增后端服务，不改动现有详情页内部逻辑。

### 1.2 范围

- **做**：
  - 新增 `SearchResult` / `SearchEntity` 类型与搜索工具函数。
  - 新增 `useArchiveSearch` Hook，支持本地分页（每页 30 条）。
  - 新增四种实体参考 Card（武器、干员、物品、敌人）。
  - 新增 `ArchiveSearchResults` 可复用结果列表与翻页控件。
  - 新增 `/archive/search` 页面、路由、导航入口、面包屑。
  - 替换 `RaceDetail` / `FactionDetail` 的「相关记载」实现，同样支持翻页。
  - 补充必要的 UI 多语言 key。

- **不做**：
  - 不新增后端接口。
  - 不修改现有数据模型、适配器签名、缓存策略。
  - 不改动现有详情页内部逻辑。
  - 不实现 `EnemyDisplayInfoTable`（变体表资料一般由模板表承载）。
  - 不实现实时自动搜索、高级搜索。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/search.ts` | Path 解析、表注册表、搜索主函数 |
| `src/components/Search/EntityCards.tsx` | 四种实体参考 Card |
| `src/components/Search/ArchiveSearchResults.tsx` | 可复用结果列表 + 翻页 |
| `src/pages/search/ArchiveSearch.tsx` | 档案搜索页面 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 新增 `SearchResult`、`SearchEntity`、`UseArchiveSearchResult` |
| `src/hooks/useData.ts` | 新增 `useArchiveSearch` |
| `src/App.tsx` | 新增 `/archive/search` 路由 |
| `src/data/archiveMeta.ts` | 新增 `search` 模块编号 |
| `src/routes/ArchiveHome.tsx` | 首页新增「档案搜索」入口 |
| `src/components/Layout/Sidebar.tsx` | 侧边导航新增「档案搜索」 |
| `src/components/Layout/Breadcrumb.tsx` | 面包屑新增 `search` 标签 |
| `src/pages/races/RaceDetail.tsx` | 复用 `ArchiveSearchResults` |
| `src/pages/factions/FactionDetail.tsx` | 复用 `ArchiveSearchResults` |
| `src/i18n/dicts/*.json` | 新增搜索相关 i18n key |

## 3. 详细实现

### 3.1 类型定义 `src/lib/types.ts`

```ts
export interface SearchResult {
  table: string
  path: string
  id: string
  text: string
  entityKey: string | null
}

export interface SearchEntity {
  type: 'weapon' | 'operator' | 'item' | 'enemy'
  id: string
  name: string
  route: string
  icon?: string
  portrait?: string
  rarity?: number
  subInfo?: string
  tags?: string[]
}

export interface UseArchiveSearchResult {
  results: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  refetch: () => void
}
```

### 3.2 搜索工具 `src/lib/search.ts`

#### 3.2.1 正则转义与 Path 解析

```ts
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractEntityKey(table: string, path: string): string | null {
  const parts = path.split('.')
  if (parts.length < 2) return null
  return parts[1]
}
```

#### 3.2.2 表注册表

```ts
export const SEARCH_ENTITY_TABLES: Record<string, {
  keyField: string
  route: string
  buildMap: (locale: string) => Promise<Record<string, SearchEntity>>
}> = {
  WeaponBasicTable: {
    keyField: 'weaponId',
    route: '/archive/weapons',
    buildMap: buildWeaponEntityMap,
  },
  CharacterTable: {
    keyField: 'charId',
    route: '/archive/operators',
    buildMap: buildOperatorEntityMap,
  },
  ItemTable: {
    keyField: 'itemId',
    route: '/archive/items',
    buildMap: buildItemEntityMap,
  },
  EnemyTemplateDisplayInfoTable: {
    keyField: 'templateId',
    route: '/archive/enemies',
    buildMap: buildEnemyEntityMap,
  },
}
```

#### 3.2.3 主搜索函数

```ts
export interface SearchArchiveOptions {
  excludeTables?: string[]
  pageSize?: number
}

export interface SearchArchiveRawResult {
  allResults: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
}

export async function searchArchive(
  query: string,
  locale: string,
  options: SearchArchiveOptions = {}
): Promise<SearchArchiveRawResult> {
  const { excludeTables = [] } = options
  const trimmed = query.trim()
  if (!trimmed) return { allResults: [], entities: {} }

  const raw = await fetchI18nSearch(escapeRegex(trimmed))
  const filtered = raw.filter(r => !excludeTables.includes(r.Table))

  const texts = await Promise.all(
    filtered.map(r => fetchI18nText(locale, String(r.Id)))
  )

  const allResults: SearchResult[] = filtered.map((r, i) => ({
    table: r.Table,
    path: r.Path,
    id: String(r.Id),
    text: texts[i],
    entityKey: extractEntityKey(r.Table, r.Path),
  }))

  const entities = await buildEntitiesForResults(allResults, locale)
  return { allResults, entities }
}
```

`buildEntitiesForResults` 仅对结果中涉及的识别表拉取全表数据并适配，避免无条件请求所有表。

### 3.3 Hook `src/hooks/useData.ts`

新增 `useArchiveSearch`：

```ts
export function useArchiveSearch(
  query: string,
  options: SearchArchiveOptions = {}
): UseArchiveSearchResult {
  const { locale } = useLocale()
  const pageSize = options.pageSize ?? 30
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<SearchArchiveRawResult>({ allResults: [], entities: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await searchArchive(query, locale, options)
      setResult(data)
      setPage(0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [query, locale, JSON.stringify(options)])

  useEffect(() => { if (query.trim()) load() }, [load])

  const start = page * pageSize
  const results = result.allResults.slice(start, start + pageSize)

  return {
    results,
    entities: result.entities,
    total: result.allResults.length,
    page,
    pageSize,
    loading,
    error,
    setPage,
    refetch: load,
  }
}
```

### 3.4 实体参考 Card `src/components/Search/EntityCards.tsx`

#### 3.4.1 物品 Card（弹出 ItemPanel）

```tsx
function ItemReferenceCard({ entity }: { entity: SearchEntity }) {
  return (
    <ItemPanel
      itemId={entity.id}
      name={entity.name}
      rarity={entity.rarity ?? 1}
      showTips
      showName
      className="w-auto"
    />
  )
}
```

说明：复用现有 `ItemPanel`，它内部会拉取 `ItemTable` 数据并展示 Tooltip。

#### 3.4.2 武器 / 干员 / 敌人 Card

使用 `<Link>` 包装卡片主体，展示图标/头像、名称、稀有度、关键属性，跳转对应详情页。敌人 Card 跳转 `/archive/enemies/{templateId}`。

### 3.5 结果列表 `src/components/Search/ArchiveSearchResults.tsx`

```tsx
interface ArchiveSearchResultsProps {
  query: string
  results: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  emptyMessage?: string
  onPageChange: (page: number) => void
}
```

渲染逻辑：

1. `loading` 为 true：展示骨架屏。
2. `error` 非空：展示错误信息。
3. `total === 0`：展示空态。
4. 否则：遍历 `results`，每条结果展示来源表标签 + 高亮文本 + 实体 Card（若命中识别表）。
5. 底部展示翻页控件：上一页 / 下一页 + 当前页码。

高亮函数：

```ts
function highlightText(text: string, term: string): string {
  if (!term) return text
  const escaped = escapeRegex(term)
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark=#B89A6A>$1</mark>')
}
```

### 3.6 搜索页面 `src/pages/search/ArchiveSearch.tsx`

```tsx
export default function ArchiveSearch() {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const { results, entities, total, page, pageSize, loading, error, setPage } = useArchiveSearch(query)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setQuery(input)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('search.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.search}</Badge>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="..."
      />

      <ArchiveSearchResults
        query={query}
        results={results}
        entities={entities}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={error}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### 3.7 路由与导航

#### 3.7.1 `src/App.tsx`

```tsx
import ArchiveSearch from './pages/search/ArchiveSearch'

<Route path="search" element={<ArchiveSearch />} />
```

#### 3.7.2 `src/data/archiveMeta.ts`

```ts
export const MODULE_CODES: Record<string, string> = {
  // ...existing
  search: 'HSA-SRC',
}
```

#### 3.7.3 `src/routes/ArchiveHome.tsx` 与 `src/components/Layout/Sidebar.tsx`

在「大事记」分组的 `modules` / `items` 数组中追加：

```ts
{ label: t('nav.search'), path: '/archive/search', desc: t('nav.searchDesc') }
```

#### 3.7.4 `src/components/Layout/Breadcrumb.tsx`

```ts
function useListLabel() {
  return {
    // ...existing
    search: t('nav.search'),
  }
}
```

### 3.8 种族 / 阵营详情页复用

#### 3.8.1 `src/pages/races/RaceDetail.tsx`

```tsx
const { data, loading, error } = useRaceDetail(raceId ?? '')
const {
  results,
  entities,
  total,
  page,
  pageSize,
  loading: searchLoading,
  error: searchError,
  setPage,
} = useArchiveSearch(data?.name ?? '', { excludeTables: ['TagDataTable'] })

// ...

<ArchiveSearchResults
  query={data.name}
  results={results}
  entities={entities}
  total={total}
  page={page}
  pageSize={pageSize}
  loading={searchLoading}
  error={searchError}
  emptyMessage={t('search.noResults')}
  onPageChange={setPage}
/>
```

#### 3.8.2 `src/pages/factions/FactionDetail.tsx`

```tsx
useArchiveSearch(data?.name ?? '', {
  excludeTables: ['TagDataTable', 'BlocDataTable', 'CharacterTagTable'],
})
```

### 3.9 多语言 `src/i18n/dicts/*.json`

新增 key：

```json
{
  "nav": {
    "search": "档案搜索",
    "searchDesc": "跨表关键词检索"
  },
  "search": {
    "title": "档案搜索",
    "placeholder": "搜索档案关键词…",
    "searchButton": "搜索",
    "noResults": "未找到相关记载",
    "resultCount": "找到 {{count}} 条相关记载",
    "source": "来源",
    "relatedRecords": "相关记载",
    "prev": "上一页",
    "next": "下一页"
  }
}
```

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）

1. `src/lib/types.ts` 新增类型。
2. `src/lib/search.ts` 实现转义、Path 解析、表注册表、搜索主函数。
3. `src/hooks/useData.ts` 新增 `useArchiveSearch`。

### 阶段二：UI 组件层（第 2 轮提交）

1. `src/components/Search/EntityCards.tsx` 实现四种 Card。
2. `src/components/Search/ArchiveSearchResults.tsx` 实现结果列表 + 翻页 + 高亮。

### 阶段三：页面与路由（第 3 轮提交）

1. `src/pages/search/ArchiveSearch.tsx` 实现搜索页。
2. `src/App.tsx` 新增路由。
3. `src/data/archiveMeta.ts`、`src/routes/ArchiveHome.tsx`、`src/components/Layout/Sidebar.tsx`、`src/components/Layout/Breadcrumb.tsx` 更新导航。

### 阶段四：复用与多语言（第 4 轮提交）

1. `src/pages/races/RaceDetail.tsx` 与 `src/pages/factions/FactionDetail.tsx` 替换为复用组件。
2. `src/i18n/dicts/*.json` 补充 key。

### 阶段五：测试与验证（第 5 轮提交）

1. 单元测试：`src/lib/search.ts` 工具函数。
2. 组件测试：`ArchiveSearchResults`、`EntityCards`。
3. E2E 测试：搜索流程、翻页、Card 跳转/Tooltip。
4. 运行 `npm run lint` / `npm run test` / `npm run build`。

## 5. 测试计划

### 5.1 单元测试

- `extractEntityKey`：对 `WeaponBasicTable`、`CharacterTable`、`ItemTable`、`EnemyTemplateDisplayInfoTable` 的 Path 正确提取 key。
- `escapeRegex`：转义 `.*+?^${}()|[\]` 等特殊字符。
- `highlightText`：关键词被 `<mark=#B89A6A>` 包裹。

### 5.2 组件测试

- `ArchiveSearchResults`：
  - loading 态展示骨架屏。
  - 空态展示 `emptyMessage`。
  - 有结果时展示来源表、高亮文本、实体 Card。
  - 翻页控件调用 `onPageChange`。
- `EntityCards`：
  - 武器 / 干员 / 敌人 Card 点击跳转正确路由。
  - 物品 Card 点击展示 `ItemPanel` Tooltip。

### 5.3 E2E 测试

- 从首页 / 侧边导航进入 `/archive/search`。
- 输入关键词并按回车，结果列表出现。
- 翻页控件可用。
- 武器 / 干员 / 敌人 Card 跳转对应详情页。
- 物品 Card 点击弹出 Tooltip。
- 种族 / 阵营详情页「相关记载」展示正常且支持翻页。

## 6. 验收标准

- [ ] `/archive/search` 页面可访问，回车触发搜索。
- [ ] 每页 30 条结果，支持翻页，无额外结果上限。
- [ ] 武器、干员、物品、敌人命中结果展示对应 Card。
- [ ] 物品 Card 点击弹出 `ItemPanel` Tooltip。
- [ ] 种族 / 阵营详情页「相关记载」使用复用组件并支持翻页。
- [ ] `npm run lint` 通过。
- [ ] `npm run test` 通过。
- [ ] `npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| i18n 搜索返回结果过多导致前端内存/渲染压力 | 页面卡顿 | 本地分页（每页 30 条）、仅渲染当前页、复用缓存 |
| Path 格式变化导致实体 ID 解析失败 | Card 缺失 | 解析失败时降级为纯文本，不阻塞列表 |
| `ItemPanel` 内部重复拉取 ItemTable | 冗余请求 | `getCachedData` 保证同表只请求一次 |

回滚策略：纯前端新增功能，可直接回滚到上一稳定 commit。

## 8. 相关文档

- [[20260719-archive-search|档案搜索完善]]
- [[20260719-archive-search|档案搜索完善 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
