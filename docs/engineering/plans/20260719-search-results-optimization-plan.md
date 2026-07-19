---
description: 搜索结果优化实现方案
type: Fleeting
---

# 搜索结果优化 - 实现方案

**对应产品文档**: [[20260719-search-results-optimization|搜索结果优化]]  
**对应技术方案**: [[20260719-search-results-optimization|搜索结果优化 - 技术提案]]  
**实现方案版本**: v1.0  
**创建日期**: 2026-07-19  
**作者**: 前端工程  
**开发分支**: `feat/search-results-optimization`

## 1. 概述

### 1.1 目标

将已评审通过的产品方案与技术方案转化为可执行的代码实现清单。本次为现有档案搜索的增量优化，复用现有数据接口与缓存，不新增后端服务。

### 1.2 范围

- **做**：
  - 扩展 `ItemPanel` 支持 `href` 链接跳转。
  - 扩展 `RichText` 的 `<mark>` 高亮覆盖文字颜色。
  - 扩展 `src/lib/search.ts`：别名表映射、技能/天赋反向索引。
  - 从现有技能展示逻辑提取 `SkillReferenceCard` 公共组件。
  - 改造 `EntityCards.tsx`：武器复用 `ItemPanel`、技能结果展示 `SkillReferenceCard`。
  - 改造 `ArchiveSearchResults.tsx`：翻页后滚动到顶部。
  - 改造 `ArchiveSearch.tsx`：接入 URL `keyword` query。
  - 改造 `RaceDetail.tsx` / `FactionDetail.tsx`：「相关记载」行尾增加搜索穿透链接。
  - 补充 UI 多语言 key。
  - 补充/更新单元测试、组件测试、E2E 测试。

- **不做**：
  - 不新增后端接口。
  - 不修改现有数据模型、适配器签名、缓存策略。
  - 不改动现有详情页内部核心逻辑（仅做必要的公共组件提取封装）。
  - 不实现实时自动搜索、高级搜索。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/skills/SkillReferenceCard.tsx` | 公共技能展示组件，含等级滑动条 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/Items/ItemPanel.tsx` | 新增 `href` 属性，支持渲染为链接 |
| `src/lib/richText.tsx` | `<mark>` 强制深色文字 |
| `src/lib/types.ts` | `SearchEntity` 增加 `skillId`，`SearchResult` 增加 `ownerEntity` |
| `src/lib/search.ts` | 别名表、反向索引、间接关联实体解析 |
| `src/components/Search/EntityCards.tsx` | 武器复用 `ItemPanel`、新增技能组件渲染 |
| `src/components/Weapons/WeaponSkillPanel.tsx` | 复用 `SkillReferenceCard` |
| `src/components/Search/ArchiveSearchResults.tsx` | 翻页滚动到顶部、技能结果渲染 |
| `src/pages/search/ArchiveSearch.tsx` | URL `keyword` query 联动 |
| `src/pages/races/RaceDetail.tsx` | 「相关记载」行尾搜索穿透链接 |
| `src/pages/factions/FactionDetail.tsx` | 「相关记载」行尾搜索穿透链接 |
| `src/i18n/dicts/*.json` | 新增 `search.searchMore` 等 key |
| `src/lib/__tests__/search.test.ts` | 新增别名表/反向索引测试 |
| `src/lib/__tests__/richText.test.tsx` | 新增 mark 颜色覆盖测试 |
| `src/components/Search/ArchiveSearchResults.test.tsx` | 新增翻页滚动/技能组件测试 |
| `tests/e2e/src/archive-search.spec.ts` | 新增 URL query、翻页回顶测试 |

## 3. 详细实现

### 3.1 `src/components/Items/ItemPanel.tsx` 支持 `href`

#### 3.1.1 类型扩展

```ts
interface ItemPanelProps {
  itemId: string
  amount?: number
  showAmount?: boolean
  showTips?: boolean
  showName?: boolean
  className?: string
  iconClassName?: string
  name?: string
  rarity?: number
  href?: string
}
```

#### 3.1.2 渲染分支

```tsx
const panelContent = (
  <>
    <ItemIcon itemId={itemId} className={iconClassName ?? 'w-12 h-12'} />
    {showAmount && amount !== undefined && (
      <span className="text-[10px] text-archive-dust font-mono">{toCountString(amount)}</span>
    )}
    <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] || '#a0a0a0' }} />
    {showName && (
      <span className="text-[10px] text-archive-ivory text-center leading-tight line-clamp-2">{name}</span>
    )}
  </>
)

if (href) {
  return (
    <Link
      to={href}
      className={`flex flex-col items-center gap-1 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors text-left ${className ?? ''}`}
    >
      {panelContent}
    </Link>
  )
}

return (
  <>
    <button
      type="button"
      onClick={() => {
        if (showTips && !DISABLED_TIP_ITEMS.has(itemId)) {
          setShowTooltip((v) => !v)
        }
      }}
      className={`...`}
    >
      {panelContent}
    </button>
    {showTooltip && <ItemTooltipOverlay itemId={itemId} onClose={() => setShowTooltip(false)} />}
  </>
)
```

#### 3.1.3 约束

- 传入 `href` 时，`showTips` 失效，点击直接跳转。
- 未传 `href` 时保持原有按钮与 Tooltip 行为，避免影响现有调用方。

### 3.2 `src/lib/richText.tsx` 高亮颜色覆盖

修改 `wrapTag` 中 `mark` 分支：

```tsx
case 'mark':
  return (
    <span style={{ backgroundColor: attrs.mark, color: '#0A0A0D' }}>
      {children}
    </span>
  )
```

通过 CSS 内联样式强制高亮区域内文字为档案墨，覆盖内部 `<color>` / `<@style>` 颜色。

### 3.3 `src/lib/types.ts` 类型扩展

```ts
export interface SearchEntity {
  type: 'weapon' | 'operator' | 'item' | 'enemy' | 'skill'
  id: string
  name: string
  route: string
  icon?: string
  portrait?: string
  rarity?: number
  displayType?: number
  subInfo?: string
  tags?: string[]
  skillId?: string
}

export interface SearchResult {
  table: string
  path: string
  id: string
  text: string
  entityKey: string | null
  ownerEntity?: SearchEntity
}
```

### 3.4 `src/lib/search.ts` 别名表与反向索引

#### 3.4.1 别名表

```ts
export const SEARCH_ENTITY_ALIAS_TABLES: Record<string, string> = {
  CharGrowthTable: 'CharacterTable',
  CharacterTagDesTable: 'CharacterTable',
}
```

#### 3.4.2 间接关联表配置

```ts
interface IndirectTableConfig {
  resolveOwner: (locale: string, entityKey: string) => Promise<SearchEntity | undefined>
}

const SEARCH_ENTITY_INDIRECT_TABLES: Record<string, IndirectTableConfig> = {
  PotentialTalentEffectTable: {
    resolveOwner: resolvePotentialTalentOwner,
  },
  SkillPatchTable: {
    resolveOwner: resolveSkillOwner,
  },
}
```

#### 3.4.3 反向索引构建

```ts
async function buildSkillOwnerIndex(locale: string): Promise<Record<string, { type: 'operator' | 'weapon'; id: string }>> {
  const [growthRaw, weaponRaw] = await Promise.all([
    getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')),
    getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')),
  ])

  const index: Record<string, { type: 'operator' | 'weapon'; id: string }> = {}

  for (const [, v] of Object.entries<any>(growthRaw)) {
    const charId = v.charId ?? v.$key ?? ''
    for (const group of Object.values<any>(v.skillGroupMap ?? {})) {
      for (const skillId of group.skillIdList ?? []) {
        if (!index[skillId]) index[skillId] = { type: 'operator', id: charId }
      }
    }
  }

  for (const [, v] of Object.entries<any>(weaponRaw)) {
    const weaponId = v.weaponId ?? v.$key ?? ''
    for (const skillId of v.weaponSkillList ?? []) {
      if (!index[skillId]) index[skillId] = { type: 'weapon', id: weaponId }
    }
  }

  return index
}

async function buildTalentEffectOwnerIndex(locale: string): Promise<Record<string, string>> {
  const growthRaw = await getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable'))
  const index: Record<string, string> = {}

  for (const [, v] of Object.entries<any>(growthRaw)) {
    const charId = v.charId ?? v.$key ?? ''
    for (const node of Object.values<any>(v.talentNodeMap ?? {})) {
      if (node.nodeType === 4 && node.passiveSkillNodeInfo?.talentEffectId) {
        index[node.passiveSkillNodeInfo.talentEffectId] = charId
      }
    }
  }

  return index
}
```

#### 3.4.4 实体解析入口

修改 `enrichResults`：

```ts
export async function enrichResults(
  results: LightweightResult[],
  locale: string,
): Promise<{
  enriched: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
}> {
  const texts = await Promise.all(results.map(r => fetchI18nText(locale, r.id)))

  const enriched: SearchResult[] = results.map((r, i) => ({
    table: r.table,
    path: r.path,
    id: r.id,
    text: texts[i],
    entityKey: r.entityKey,
  }))

  const entities: Record<string, Record<string, SearchEntity>> = {}
  const indirectOwners: Record<string, SearchEntity | undefined> = {}

  // 直接识别表
  const directTables = new Set<string>()
  for (const r of results) {
    const targetTable = SEARCH_ENTITY_ALIAS_TABLES[r.table] ?? r.table
    if (r.entityKey && SEARCH_ENTITY_TABLES[targetTable]) {
      directTables.add(targetTable)
    }
  }

  await Promise.all(Array.from(directTables).map(async (table) => {
    entities[table] = await SEARCH_ENTITY_TABLES[table].buildMap(locale)
  }))

  // 间接关联表
  const skillIds = results.filter(r => r.table === 'SkillPatchTable').map(r => r.entityKey).filter(Boolean) as string[]
  const talentIds = results.filter(r => r.table === 'PotentialTalentEffectTable').map(r => r.entityKey).filter(Boolean) as string[]

  if (skillIds.length > 0) {
    const skillIndex = await buildSkillOwnerIndex(locale)
    const operatorMap = entities['CharacterTable'] ?? await buildOperatorEntityMap(locale)
    const weaponMap = entities['WeaponBasicTable'] ?? await buildWeaponEntityMap(locale)
    entities['CharacterTable'] = operatorMap
    entities['WeaponBasicTable'] = weaponMap

    for (const id of skillIds) {
      const owner = skillIndex[id]
      if (!owner) continue
      indirectOwners[id] = owner.type === 'operator' ? operatorMap[owner.id] : weaponMap[owner.id]
    }
  }

  if (talentIds.length > 0) {
    const talentIndex = await buildTalentEffectOwnerIndex(locale)
    const operatorMap = entities['CharacterTable'] ?? await buildOperatorEntityMap(locale)
    entities['CharacterTable'] = operatorMap

    for (const id of talentIds) {
      const charId = talentIndex[id]
      if (!charId) continue
      indirectOwners[id] = operatorMap[charId]
    }
  }

  for (const r of enriched) {
    if (r.table === 'SkillPatchTable' || r.table === 'PotentialTalentEffectTable') {
      r.ownerEntity = indirectOwners[r.entityKey ?? '']
    }
  }

  return { enriched, entities }
}
```

### 3.5 `src/components/skills/SkillReferenceCard.tsx` 公共技能组件

从 `WeaponSkillPanel` 提取核心技能展示逻辑：

```tsx
interface SkillReferenceCardProps {
  skillId: string
  showLevelSlider?: boolean
  defaultLevel?: number
  className?: string
}

interface SkillLevelData {
  level: number
  skillName: string
  description: string
  iconId: string
  blackboard: Record<string, number>
}

export default function SkillReferenceCard({
  skillId,
  showLevelSlider = false,
  defaultLevel,
  className,
}: SkillReferenceCardProps) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const [patches, setPatches] = useState<SkillLevelData[]>([])
  const [level, setLevel] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [patchRaw, patchI18n] = await Promise.all([
        getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)),
      ])
      if (cancelled) return

      const bundle = patchRaw[skillId]?.SkillPatchDataBundle ?? []
      const missingIds = new Set<string>()
      const tryResolve = (id?: string | number) => {
        if (id === undefined || id === null || id === '') return ''
        const key = String(id)
        if (patchI18n[key]) return patchI18n[key]
        missingIds.add(key)
        return ''
      }

      const parsed = bundle.map((p: any) => {
        const bb: Record<string, number> = {}
        for (const b of (p.blackboard ?? [])) bb[b.key] = b.value ?? 0
        return {
          level: p.level,
          skillName: tryResolve(p.skillName?.id),
          description: tryResolve(p.description?.id),
          descriptionId: String(p.description?.id ?? ''),
          skillNameId: String(p.skillName?.id ?? ''),
          iconId: p.iconId ?? '',
          blackboard: bb,
        }
      })

      if (missingIds.size > 0) {
        const globalTexts = await Promise.all(
          Array.from(missingIds).map(async (id) => ({ id, text: await fetchI18nText(locale, id) }))
        )
        const globalMap = Object.fromEntries(globalTexts.filter(x => x.text).map(x => [x.id, x.text]))
        for (const p of parsed) {
          if (!p.skillName && p.skillNameId) p.skillName = globalMap[p.skillNameId] || p.skillNameId
          if (!p.description && p.descriptionId) p.description = globalMap[p.descriptionId] || p.descriptionId
        }
      }

      setPatches(parsed)

      if (parsed.length > 0) {
        const sorted = [...parsed].sort((a, b) => a.level - b.level)
        const target = defaultLevel ?? sorted[sorted.length - 1].level
        const found = sorted.find(p => p.level === target)
        setLevel(found ? found.level : sorted[sorted.length - 1].level)
      }
    }
    load()
    return () => { cancelled = true }
  }, [skillId, locale, defaultLevel])

  if (patches.length === 0 || level === null) return null

  const sorted = [...patches].sort((a, b) => a.level - b.level)
  const current = patches.find(p => p.level === level) ?? sorted[sorted.length - 1]

  return (
    <div className={`p-2 rounded bg-archive-ink border border-archive-border ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        {current.iconId && (
          <img
            src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${current.iconId}.png`}
            alt=""
            className="w-6 h-6 object-contain bg-archive-file rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-xs font-medium text-archive-ivory">{current.skillName || skillId}</span>
        <span className="text-[10px] text-archive-lead font-mono ml-auto">{t('common.level', { level: current.level })}</span>
      </div>
      {current.description && (
        <div className="mt-1 text-xs text-archive-ivory leading-relaxed">
          <RichText text={formatBlackboard(current.description, current.blackboard)} />
        </div>
      )}
      {showLevelSlider && sorted.length > 1 && (
        <div className="mt-2">
          <input
            type="range"
            min={sorted[0].level}
            max={sorted[sorted.length - 1].level}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none bg-archive-border accent-archive-gold cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-archive-lead mt-1">
            <span>{t('common.level', { level: sorted[0].level })}</span>
            <span>{t('common.level', { level: sorted[sorted.length - 1].level })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 3.6 `src/components/Weapons/WeaponSkillPanel.tsx` 复用公共组件

将 `WeaponSkillPanel` 简化为拉取 skillIds 后调用 `SkillReferenceCard`：

```tsx
import SkillReferenceCard from '../skills/SkillReferenceCard'

export default function WeaponSkillPanel({ weaponId, skillIds: propSkillIds, showLevelSlider = false }: WeaponSkillPanelProps) {
  // ... 保持 skillIds 解析逻辑不变

  return (
    <div className="space-y-2">
      {skillIds.map(skillId => (
        <SkillReferenceCard
          key={skillId}
          skillId={skillId}
          showLevelSlider={showLevelSlider}
        />
      ))}
    </div>
  )
}
```

> `WeaponSkillPanel` 不传 `defaultLevel`，因此默认展示最高等级，保持武器详情页现有行为。

### 3.7 `src/components/Search/EntityCards.tsx` 改造

#### 3.7.1 武器 Card 复用 `ItemPanel`

```tsx
function WeaponReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <ItemPanel
      itemId={entity.id}
      name={entity.name}
      rarity={entity.rarity ?? 1}
      showTips={false}
      showName
      href={entity.route}
      className="w-auto items-start"
    />
  )
}
```

#### 3.7.2 技能结果渲染

`EntityReferenceCard` 保持对已有四种类型的处理；技能组件在 `ArchiveSearchResults` 中直接渲染，不通过 `EntityReferenceCard`。

### 3.8 `src/components/Search/ArchiveSearchResults.tsx` 翻页回顶与技能结果

#### 3.8.1 翻页滚动

```tsx
const initialPageRef = useRef(true)

useEffect(() => {
  if (initialPageRef.current) {
    initialPageRef.current = false
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, [page])
```

#### 3.8.2 技能结果渲染

```tsx
{results.map((r, i) => {
  const entity = r.entityKey ? entities[r.table]?.[r.entityKey] : undefined
  const ownerEntity = r.ownerEntity
  return (
    <div key={`${r.id}-${i}`} className="rounded border border-archive-border bg-archive-file p-3">
      <div className="text-[10px] text-archive-lead mb-1">{r.table}</div>
      <div className="text-sm text-archive-ivory leading-relaxed mb-2">
        <RichText text={highlightText(r.text, query)} />
      </div>
      {r.table === 'SkillPatchTable' && r.entityKey && (
        <SkillReferenceCard skillId={r.entityKey} showLevelSlider defaultLevel={9} className="mb-2" />
      )}
      {(entity || ownerEntity) && <EntityReferenceCard entity={ownerEntity ?? entity} />}
    </div>
  )
})}
```

### 3.9 `src/pages/search/ArchiveSearch.tsx` URL query 联动

```tsx
import { useSearchParams } from 'react-router-dom'

export default function ArchiveSearch() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const keywordParam = searchParams.get('keyword') ?? ''
  const [input, setInput] = useState(keywordParam)
  const [query, setQuery] = useState(keywordParam)

  useEffect(() => {
    const kw = searchParams.get('keyword') ?? ''
    setInput(kw)
    setQuery(kw)
  }, [searchParams])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const trimmed = input.trim()
    if (trimmed) {
      setSearchParams({ keyword: trimmed })
    } else {
      setSearchParams({})
    }
    setQuery(trimmed)
  }

  // ...
}
```

### 3.10 `src/pages/races/RaceDetail.tsx` 与 `FactionDetail.tsx` 穿透链接

```tsx
<div className="flex items-center justify-between mb-2">
  <h3 className="text-sm font-medium text-archive-dust">{t('race.relatedRecords')}</h3>
  <Link
    to={`/archive/search?keyword=${encodeURIComponent(data.name)}`}
    className="text-xs text-archive-gold hover:text-archive-ivory transition-colors"
  >
    {t('search.searchMore')}
  </Link>
</div>
```

阵营页同理，使用 `t('search.searchMore')`。

### 3.11 多语言 key

在 `src/i18n/dicts/*.json` 中新增：

```json
{
  "search": {
    "searchMore": "搜索更多"
  }
}
```

## 4. 实现顺序

### 阶段一：基础组件改造（第 1 轮提交）

1. `src/components/Items/ItemPanel.tsx`：支持 `href`。
2. `src/lib/richText.tsx`：`<mark>` 颜色覆盖。
3. `src/lib/types.ts`：类型扩展。

### 阶段二：数据层扩展（第 2 轮提交）

1. `src/lib/search.ts`：别名表、反向索引、间接关联实体解析。

### 阶段三：技能公共组件（第 3 轮提交）

1. `src/components/skills/SkillReferenceCard.tsx`：提取公共技能组件。
2. `src/components/Weapons/WeaponSkillPanel.tsx`：复用公共组件。

### 阶段四：搜索结果改造（第 4 轮提交）

1. `src/components/Search/EntityCards.tsx`：武器复用 `ItemPanel`。
2. `src/components/Search/ArchiveSearchResults.tsx`：翻页回顶、技能结果渲染。
3. `src/pages/search/ArchiveSearch.tsx`：URL keyword 联动。

### 阶段五：种族/阵营穿透（第 5 轮提交）

1. `src/pages/races/RaceDetail.tsx`：「相关记载」行尾搜索链接。
2. `src/pages/factions/FactionDetail.tsx`：「相关记载」行尾搜索链接。
3. `src/i18n/dicts/*.json`：补充 `search.searchMore`。

### 阶段六：测试与验证（第 6 轮提交）

1. 单元测试：`search.test.ts`、`richText.test.tsx`。
2. 组件测试：`ArchiveSearchResults.test.tsx`。
3. E2E 测试：`archive-search.spec.ts`。
4. 运行 `npm run lint` / `npm run test` / `npm run build`。

## 5. 测试计划

### 5.1 单元测试

- `extractEntityKey`：验证 `CharGrowthTable` / `CharacterTagDesTable` 的 `charId` 提取。
- `buildSkillOwnerIndex`：已知 skillId 返回正确的 operator/weapon 归属。
- `buildTalentEffectOwnerIndex`：已知 `talentEffectId` 返回正确的 `charId`。
- `escapeRegex`：保持现有覆盖。
- `RichText` `<mark>`：黄色原文被高亮后文字颜色为深色。

### 5.2 组件测试

- `ArchiveSearchResults`：
  - 翻页时调用 `window.scrollTo({ top: 0, behavior: 'smooth' })`。
  - `SkillPatchTable` 结果展示 `SkillReferenceCard`。
  - 武器结果使用 `ItemPanel` 渲染且可跳转。

### 5.3 E2E 测试

- `/archive/search?keyword=xxx` 直接进入后搜索结果加载。
- 输入关键词回车后 URL 更新为 `?keyword=xxx`。
- 翻页后页面滚动到顶部。
- 种族/阵营详情页点击「搜索更多」跳转 `/archive/search?keyword=xxx`。

## 6. 验收标准

- [ ] `ItemPanel` 传入 `href` 时渲染为链接并可跳转。
- [ ] 关键词高亮后浅色原文保持可读。
- [ ] 干员关联表命中结果展示干员 Card。
- [ ] `SkillPatchTable` 命中结果展示 `SkillReferenceCard`（默认 Lv.9）与归属 Card。
- [ ] `PotentialTalentEffectTable` 命中结果展示归属干员 Card。
- [ ] 翻页后页面回到顶部。
- [ ] URL `keyword` query 与搜索框双向联动。
- [ ] 种族/阵营详情页「相关记载」行尾存在「搜索更多」链接。
- [ ] `npm run lint` 通过。
- [ ] `npm run test` 通过。
- [ ] `npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `SkillReferenceCard` 默认 Lv.9 对某些技能不存在 | 展示最高等级 | 找不到 Lv.9 时回退到最近存在的等级 |
| 反向索引构建增加首次搜索耗时 | 搜索页首屏变慢 | 仅按需构建；复用现有表缓存 |
| `ItemPanel` 增加 `href` 影响现有调用方 | 物品提示失效 | 默认行为不变，`href` 为可选 |
| URL query 同步与浏览器回退冲突 | 状态不一致 | 使用 `useSearchParams` 官方机制 |

回滚策略：本次改动为纯前端增量优化，若出现严重问题，可直接回滚到上一稳定 commit。

## 8. 相关文档

- [[20260719-search-results-optimization|搜索结果优化]]
- [[20260719-search-results-optimization|搜索结果优化 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
