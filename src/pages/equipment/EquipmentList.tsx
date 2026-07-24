import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { useState, useMemo, useEffect } from 'react'
import { useEquips } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import EquipBar from '../../components/Equipment/EquipBar'
import SuitLogo from '../../components/Equipment/SuitLogo'
import RarityFilterSelect from '../../components/RarityFilterSelect'
import { getAttributeShowMap } from '../../lib/attributeShow'
import type { AttrShowMapEntry } from '../../lib/attributeShow'
import type { Equip, Suit } from '../../lib/types'

const PAGE_SIZES = [12, 24, 48, 0] as const

const PART_KEYS: Record<number, string> = {
  0: 'equipment.partBody',
  1: 'equipment.partHand',
  2: 'equipment.partEdc',
}

export default function EquipmentList() {
  const { t } = useI18n()
  const { data, loading, error } = useEquips()
  const [search, setSearch] = useState('')
  const [partFilter, setPartFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState<number | null>(5)
  const [sortField, setSortField] = useState<'rarity' | 'wearLevel'>('rarity')
  const [sortDesc, setSortDesc] = useState(true)
  const [pageSize, setPageSize] = useState(24)
  const [groupPageMap, setGroupPageMap] = useState<Record<string, number>>({})
  const { locale } = useLocale()
  const [attrShowMap, setAttrShowMap] = useState<Record<string, AttrShowMapEntry>>({})

  useEffect(() => {
    let cancelled = false
    getAttributeShowMap(locale).then(m => { if (!cancelled) setAttrShowMap(m) })
    return () => { cancelled = true }
  }, [locale])

  const suits = useMemo(() => {
    if (!data) return new Map<string, Suit>()
    return new Map(data.suits.map(s => [s.id, s]))
  }, [data])

  const rarities = useMemo(() => {
    if (!data) return []
    const seen = new Set<number>()
    for (const e of data.equips) {
      if (e.rarity && !seen.has(e.rarity)) seen.add(e.rarity)
    }
    return [...seen].sort()
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.equips.filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false
      if (partFilter !== '' && e.partType !== Number(partFilter)) return false
      if (rarityFilter !== null && e.rarity !== rarityFilter) return false
      return true
    })
  }, [data, search, partFilter, rarityFilter])

  const sorted = useMemo(() => {
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      if (sortField === 'rarity') return (a.rarity - b.rarity) * dir
      return (a.minWearLv - b.minWearLv) * dir
    })
  }, [filtered, sortField, sortDesc])

  const groups = useMemo(() => {
    const map = new Map<string, Equip[]>()
    for (const e of sorted) {
      const key = e.suitId || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    const entries = [...map.entries()]
    entries.sort(([a], [b]) => {
      if (a === '' && b !== '') return 1
      if (a !== '' && b === '') return -1
      const suitA = suits.get(a)
      const suitB = suits.get(b)
      return (suitA?.name ?? a).localeCompare(suitB?.name ?? b)
    })
    return entries
  }, [sorted, suits])

  useEffect(() => {
    setGroupPageMap({})
  }, [search, partFilter, rarityFilter, pageSize, sortField, sortDesc])

  if (loading) return <ListSkeleton filters={4} cards={12} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!data || data.equips.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('equipment.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.equipment}</Badge>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchWithName', { name: t('equipment.title') })}
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
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('common.allType')}</option>
            {Object.entries(PART_KEYS).map(([k, v]) => (
              <option key={k} value={k}>{t(v)}</option>
            ))}
          </select>

          <RarityFilterSelect
            value={rarityFilter}
            onChange={setRarityFilter}
            levels={rarities}
            allLabel={t('common.allRarity')}
          />

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as 'rarity' | 'wearLevel')}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="rarity">{t('equipment.sortByRarity')}</option>
            <option value="wearLevel">{t('equipment.sortByWearLevel')}</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDesc(v => !v)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${sortField ? 'border-archive-gold/40 text-archive-ivory hover:border-archive-gold' : 'border-archive-border text-archive-lead cursor-not-allowed'}`}
          >
            {sortDesc ? t('common.desc') : t('common.asc')}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(([suitId, groupItems]) => {
          const suit = suitId ? suits.get(suitId) : null
          const groupKey = suitId || '__loose__'
          const gp = groupPageMap[groupKey] ?? 0
          const groupTotalPages = pageSize > 0 ? Math.ceil(groupItems.length / pageSize) : 1
          const groupPaged = pageSize > 0 ? groupItems.slice(gp * pageSize, (gp + 1) * pageSize) : groupItems

          return (
            <section key={groupKey}>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-archive-border">
                <SuitLogo logoName={suit?.logoName ?? ''} />
                <h3 className="text-sm font-medium text-archive-gold">
                  {suit?.name ?? t('equipment.looseGroup')}
                </h3>
                <span className="text-[10px] text-archive-lead">{t('common.countPiece', { count: groupItems.length })}</span>
              </div>
              <div className="flex flex-wrap gap-2 items-start">
                {groupPaged.map(e => (
                  <div key={e.id} className="grow-0 min-w-72">
                    <EquipBar equip={e} attrShowMap={attrShowMap} />
                  </div>
                ))}
              </div>
              {pageSize > 0 && groupTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [groupKey]: Math.max(0, gp - 1) }))}
                    disabled={gp === 0}
                    className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.prev')}</button>
                  <span className="text-xs text-archive-dust">{gp + 1} / {groupTotalPages}</span>
                  <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [groupKey]: Math.min(groupTotalPages - 1, gp + 1) }))}
                    disabled={gp >= groupTotalPages - 1}
                    className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.next')}</button>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-archive-lead mt-4">{t('common.noResult', { name: t('equipment.title') })}</p>
      )}
    </div>
  )
}
