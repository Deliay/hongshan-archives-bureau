import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { useState, useMemo, useEffect } from 'react'
import { useItems } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { resolveI18n, ASSET_BASE } from '../../lib/adapter'
import ItemTile from '../../components/Items/ItemTile'
import RarityFilterSelect from '../../components/RarityFilterSelect'
import { useI18n } from '../../i18n'

const PAGE_SIZES = [24, 48, 96, 0] as const
const RARITIES = [1, 2, 3, 4, 5, 6]

type SortField = '' | 'showingType' | 'rarity' | 'type'
type GroupField = '' | 'showingType' | 'type' | 'valuableTabType'

interface NamedFilter {
  key: string
  name: string
  icon?: string
}

function getGroupLabel(groupField: GroupField, key: string, showingTypeMap: Record<string, NamedFilter>, typeNameMap: Record<string, string>, valuableTabMap: Record<string, NamedFilter>): string {
  if (groupField === 'showingType') return showingTypeMap[key]?.name || key
  if (groupField === 'type') return typeNameMap[key] || key
  if (groupField === 'valuableTabType') return valuableTabMap[key]?.name || key
  return key
}

function getGroupIcon(groupField: GroupField, key: string, showingTypeMap: Record<string, NamedFilter>, valuableTabMap: Record<string, NamedFilter>): string | undefined {
  if (groupField === 'showingType') return showingTypeMap[key]?.icon
  if (groupField === 'valuableTabType') return valuableTabMap[key]?.icon
  return undefined
}

export default function ItemList() {
  const { locale } = useLocale()
  const { t } = useI18n()
  const { data: items, loading, error } = useItems()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState<number | null>(null)
  const [showingTypeFilter, setShowingTypeFilter] = useState('')
  const [valuableTabFilter, setValuableTabFilter] = useState('')
  const [pageSize, setPageSize] = useState(48)
  const [page, setPage] = useState(0)

  const [sortField, setSortField] = useState<SortField>('rarity')
  const [sortDesc, setSortDesc] = useState(true)
  const [groupField, setGroupField] = useState<GroupField>('')
  const [groupPageMap, setGroupPageMap] = useState<Record<string, number>>({})

  const [typeNameMap, setTypeNameMap] = useState<Record<string, string>>({})
  const [showingTypeMap, setShowingTypeMap] = useState<Record<string, NamedFilter>>({})
  const [valuableTabMap, setValuableTabMap] = useState<Record<string, NamedFilter>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [typeRaw, typeI18n, showRaw, showI18n, valRaw, valI18n] = await Promise.all([
        getCachedData<Record<string, any>>('ItemTypeTable', () => fetchTableAll('ItemTypeTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTypeTable`, () => fetchTableDictAll('ItemTypeTable', locale)),
        getCachedData<Record<string, any>>('ItemShowingTypeTable', () => fetchTableAll('ItemShowingTypeTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemShowingTypeTable`, () => fetchTableDictAll('ItemShowingTypeTable', locale)),
        getCachedData<Record<string, any>>('ValuableDepot', () => fetchTableAll('ValuableDepot')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ValuableDepot`, () => fetchTableDictAll('ValuableDepot', locale)),
      ])
      if (cancelled) return

      const tMap: Record<string, string> = {}
      for (const [k, v] of Object.entries<any>(typeRaw)) {
        tMap[k] = resolveI18n(v.name, typeI18n) || k
      }
      setTypeNameMap(tMap)

      const sMap: Record<string, NamedFilter> = {}
      for (const [k, v] of Object.entries<any>(showRaw)) {
        sMap[k] = {
          key: k,
          name: resolveI18n(v.name, showI18n) || k,
          icon: v.icon ? `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/inventory/${v.icon}.png` : undefined,
        }
      }
      setShowingTypeMap(sMap)

      const vMap: Record<string, NamedFilter> = {}
      for (const [k, v] of Object.entries<any>(valRaw)) {
        vMap[k] = {
          key: k,
          name: resolveI18n(v.name, valI18n) || k,
          icon: v.icon ? `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/inventory/${v.icon}.png` : undefined,
        }
      }
      setValuableTabMap(vMap)
    }
    load()
    return () => { cancelled = true }
  }, [locale])

  const typeOptions = useMemo(() => {
    if (!items) return []
    const seen = new Set<string>()
    const result: NamedFilter[] = []
    for (const i of items) {
      const key = String(i.type)
      if (key && !seen.has(key)) {
        seen.add(key)
        result.push({ key, name: typeNameMap[key] || key })
      }
    }
    return result.sort((a, b) => Number(a.key) - Number(b.key))
  }, [items, typeNameMap])

  const showingTypeOptions = useMemo(() => {
    if (!items) return []
    const seen = new Set<string>()
    const result: NamedFilter[] = []
    for (const i of items) {
      const key = String(i.showingType)
      if (key && key !== '0' && !seen.has(key)) {
        seen.add(key)
        result.push(showingTypeMap[key] || { key, name: key })
      }
    }
    return result.sort((a, b) => Number(a.key) - Number(b.key))
  }, [items, showingTypeMap])

  const valuableTabOptions = useMemo(() => {
    if (!items) return []
    const seen = new Set<string>()
    const result: NamedFilter[] = []
    for (const i of items) {
      const key = String(i.valuableTabType)
      if (key && key !== '0' && !seen.has(key)) {
        seen.add(key)
        result.push(valuableTabMap[key] || { key, name: key })
      }
    }
    return result.sort((a, b) => Number(a.key) - Number(b.key))
  }, [items, valuableTabMap])

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && String(i.type) !== typeFilter) return false
      if (rarityFilter !== null && i.rarity !== rarityFilter) return false
      if (showingTypeFilter && String(i.showingType) !== showingTypeFilter) return false
      if (valuableTabFilter && String(i.valuableTabType) !== valuableTabFilter) return false
      return true
    })
  }, [items, search, typeFilter, rarityFilter, showingTypeFilter, valuableTabFilter])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'rarity') cmp = a.rarity - b.rarity
      else if (sortField === 'type') cmp = a.type - b.type
      else if (sortField === 'showingType') cmp = a.showingType - b.showingType
      return cmp * dir
    })
  }, [filtered, sortField, sortDesc])

  const groups = useMemo(() => {
    if (!groupField) return null
    const map = new Map<string, typeof sorted>()
    for (const item of sorted) {
      let key: string
      if (groupField === 'showingType') key = String(item.showingType)
      else if (groupField === 'type') key = String(item.type)
      else if (groupField === 'valuableTabType') key = String(item.valuableTabType)
      else key = ''
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return [...map.entries()].sort(([a], [b]) => Number(a) - Number(b))
  }, [sorted, groupField])

  const totalPages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1
  const paged = pageSize > 0 ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted

  useEffect(() => {
    setPage(0)
    setGroupPageMap({})
  }, [search, typeFilter, rarityFilter, showingTypeFilter, valuableTabFilter, pageSize, sortField, sortDesc, groupField])

  if (loading) return <ListSkeleton filters={4} cards={12} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!items || items.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('item.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.items}</Badge>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchWithName', { name: t('item.title') })}
            className="flex-1 px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 transition-colors"
          />
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            {PAGE_SIZES.map(ps => (
              <option key={ps} value={ps}>{ps === 0 ? t('common.all') : `${ps} / ${t('common.page')}`}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('item.allTypes')}</option>
            {typeOptions.map(t => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>

          <RarityFilterSelect
            value={rarityFilter}
            onChange={setRarityFilter}
            levels={RARITIES}
            allLabel={t('common.allRarity')}
          />

          <select
            value={showingTypeFilter}
            onChange={(e) => setShowingTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('item.allShowingTypes')}</option>
            {showingTypeOptions.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={valuableTabFilter}
            onChange={(e) => setValuableTabFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('item.allValuableTabs')}</option>
            {valuableTabOptions.map(v => (
              <option key={v.key} value={v.key}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('common.defaultSort')}</option>
            <option value="showingType">{t('item.sortByShowingType')}</option>
            <option value="rarity">{t('item.sortByRarity')}</option>
            <option value="type">{t('item.sortByType')}</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDesc(v => !v)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${sortField ? 'border-archive-gold/40 text-archive-ivory hover:border-archive-gold' : 'border-archive-border text-archive-lead cursor-not-allowed'}`}
            disabled={!sortField}
          >
            {sortDesc ? t('common.desc') : t('common.asc')}
          </button>

          <div className="w-px bg-archive-border" />

          <select
            value={groupField}
            onChange={(e) => setGroupField(e.target.value as GroupField)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('common.noGroup')}</option>
            <option value="showingType">{t('item.groupByShowingType')}</option>
            <option value="type">{t('item.groupByType')}</option>
            <option value="valuableTabType">{t('item.groupByValuableTab')}</option>
          </select>
        </div>
      </div>

      {groups ? (
        <div className="space-y-6">
          {groups.map(([key, groupItems]) => {
            const label = getGroupLabel(groupField, key, showingTypeMap, typeNameMap, valuableTabMap)
            const icon = getGroupIcon(groupField, key, showingTypeMap, valuableTabMap)
            const gp = groupPageMap[key] ?? 0
            const groupTotalPages = pageSize > 0 ? Math.ceil(groupItems.length / pageSize) : 1
            const groupPaged = pageSize > 0 ? groupItems.slice(gp * pageSize, (gp + 1) * pageSize) : groupItems
            return (
              <section key={key}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-archive-border">
                  {icon && <img src={icon} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                  <h3 className="text-sm font-medium text-archive-gold">{label}</h3>
                  <span className="text-[10px] text-archive-lead">{t('common.countPiece', { count: groupItems.length })}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {groupPaged.map(item => (
                    <ItemTile key={item.id} itemId={item.id} name={item.name} rarity={item.rarity} />
                  ))}
                </div>
                {pageSize > 0 && groupTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button
                      type="button"
                      disabled={gp === 0}
                      onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.max(0, gp - 1) }))}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors"
                    >
                      {t('common.prev')}
                    </button>
                    <span className="text-xs text-archive-dust">{gp + 1} / {groupTotalPages}</span>
                    <button
                      type="button"
                      disabled={gp >= groupTotalPages - 1}
                      onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.min(groupTotalPages - 1, gp + 1) }))}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors"
                    >
                      {t('common.next')}
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {paged.map((item) => (
              <ItemTile key={item.id} itemId={item.id} name={item.name} rarity={item.rarity} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-archive-lead mt-4">{t('common.noResult', { name: t('item.title') })}</p>
          )}

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors"
              >
                {t('common.prev')}
              </button>
              <span className="text-sm text-archive-dust">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
