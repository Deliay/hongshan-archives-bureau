import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { useState, useMemo, useEffect } from 'react'
import { useWeapons } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { resolveI18n } from '../../lib/adapter'
import WeaponBar from '../../components/Weapons/WeaponBar'
import RarityFilterSelect from '../../components/RarityFilterSelect'
import { useI18n } from '../../i18n'

const PAGE_SIZES = [12, 24, 48, 0] as const
const RARITIES = [3, 4, 5, 6]

type SortField = '' | 'weaponType' | 'rarity'
type GroupField = '' | 'weaponType'

export default function WeaponList() {
  const { locale } = useLocale()
  const { t } = useI18n()
  const { data: weapons, loading, error } = useWeapons()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState(24)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>('rarity')
  const [sortDesc, setSortDesc] = useState(true)
  const [groupField, setGroupField] = useState<GroupField>('')
  const [groupPageMap, setGroupPageMap] = useState<Record<string, number>>({})
  const [skillNameMap, setSkillNameMap] = useState<Record<string, string[]>>({})
  const [skillTagMap, setSkillTagMap] = useState<Record<string, string[]>>({})
  const [skill1Filter, setSkill1Filter] = useState('')
  const [skill2Filter, setSkill2Filter] = useState('')
  const [skill3PrefixFilter, setSkill3PrefixFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [patchRaw, patchI18n] = await Promise.all([
        getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)),
      ])
      if (cancelled) return
      const map: Record<string, string[]> = {}
      const tagMap: Record<string, string[]> = {}
      if (weapons) {
        for (const w of weapons) {
          for (const skillId of w.skills) {
            if (map[skillId]) continue
            const entry = patchRaw[skillId]
            if (entry?.SkillPatchDataBundle?.[0]) {
              const firstName = resolveI18n(entry.SkillPatchDataBundle[0].skillName, patchI18n) || skillId
              map[skillId] = [firstName]
              tagMap[skillId] = [entry.SkillPatchDataBundle[0].tagId ?? '']
            }
          }
        }
      }
      setSkillNameMap(map)
      setSkillTagMap(tagMap)
    }
    if (weapons) load()
    return () => { cancelled = true }
  }, [locale, weapons])

  const weaponTypes = useMemo(() => {
    if (!weapons) return []
    const seen = new Set<number>()
    const result: { key: number; name: string }[] = []
    for (const w of weapons) {
      if (w.weaponType && !seen.has(w.weaponType)) {
        seen.add(w.weaponType)
        result.push({ key: w.weaponType, name: w.type })
      }
    }
    return result.sort((a, b) => a.key - b.key)
  }, [weapons])

  const skill1Options = useMemo(() => {
    if (!weapons) return []
    const seen = new Set<string>()
    const result: { key: string; name: string }[] = []
    for (const w of weapons) {
      const sid = w.skills[0]
      if (sid) {
        const tags = skillTagMap[sid]
        const t = tags?.[0]
        if (t && !seen.has(t)) {
          seen.add(t)
          result.push({ key: t, name: skillNameMap[sid]?.[0] || t })
        }
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key))
  }, [weapons, skillTagMap, skillNameMap])

  const skill2Options = useMemo(() => {
    if (!weapons) return []
    const seen = new Set<string>()
    const result: { key: string; name: string }[] = []
    for (const w of weapons) {
      const sid = w.skills[1]
      if (sid) {
        const tags = skillTagMap[sid]
        const t = tags?.[0]
        if (t && !seen.has(t)) {
          seen.add(t)
          result.push({ key: t, name: skillNameMap[sid]?.[0] || t })
        }
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key))
  }, [weapons, skillTagMap, skillNameMap])

  const skill3PrefixOptions = useMemo(() => {
    if (!weapons) return []
    const seen = new Set<string>()
    const result: { key: string; name: string }[] = []
    for (const w of weapons) {
      const third = w.skills[2]
      if (third) {
        const names = skillNameMap[third]
        if (names?.length) {
          const prefix = names[0].split('·')[0]
          if (prefix && !seen.has(prefix)) {
            seen.add(prefix)
            result.push({ key: prefix, name: prefix })
          }
        }
      }
    }
    return result.sort()
  }, [weapons, skillNameMap])

  const filtered = useMemo(() => {
    if (!weapons) return []
    return weapons.filter(w => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.id.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && String(w.weaponType) !== typeFilter) return false
      if (rarityFilter !== null && w.rarity !== rarityFilter) return false
      if (skill1Filter) {
        const sid = w.skills[0]
        const tags = sid ? skillTagMap[sid] : undefined
        if (!tags?.some(t => t === skill1Filter)) return false
      }
      if (skill2Filter) {
        const sid = w.skills[1]
        const tags = sid ? skillTagMap[sid] : undefined
        if (!tags?.some(t => t === skill2Filter)) return false
      }
      if (skill3PrefixFilter) {
        const third = w.skills[2]
        const names = third ? skillNameMap[third] : undefined
        const prefix = names?.length ? names[0].split('·')[0] : ''
        if (prefix !== skill3PrefixFilter) return false
      }
      return true
    })
  }, [weapons, search, typeFilter, rarityFilter, skill1Filter, skill2Filter, skill3PrefixFilter, skillTagMap, skillNameMap])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'rarity') cmp = a.rarity - b.rarity
      else if (sortField === 'weaponType') cmp = a.weaponType - b.weaponType
      return cmp * dir
    })
  }, [filtered, sortField, sortDesc])

  const groups = useMemo(() => {
    if (!groupField) return null
    const map = new Map<string, typeof sorted>()
    for (const w of sorted) {
      const key = groupField === 'weaponType' ? String(w.weaponType) : ''
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(w)
    }
    return [...map.entries()].sort(([a], [b]) => Number(a) - Number(b))
  }, [sorted, groupField])

  const totalPages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1
  const paged = pageSize > 0 ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted

  useEffect(() => {
    setPage(0)
    setGroupPageMap({})
  }, [search, typeFilter, rarityFilter, skill1Filter, skill2Filter, skill3PrefixFilter, pageSize, sortField, sortDesc, groupField])

  if (loading) return <ListSkeleton filters={4} cards={12} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!weapons || weapons.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('weapon.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.weapons}</Badge>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchWithName', { name: t('weapon.title') })}
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
            <option value="">{t('weapon.allTypes')}</option>
            {weaponTypes.map(t => (
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
            value={skill1Filter}
            onChange={(e) => setSkill1Filter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('weapon.skill1')}</option>
            {skill1Options.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={skill2Filter}
            onChange={(e) => setSkill2Filter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('weapon.skill2')}</option>
            {skill2Options.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={skill3PrefixFilter}
            onChange={(e) => setSkill3PrefixFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">{t('weapon.skill3Prefix')}</option>
            {skill3PrefixOptions.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="rarity">{t('weapon.sortByRarity')}</option>
            <option value="weaponType">{t('weapon.sortByType')}</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDesc(v => !v)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${sortField ? 'border-archive-gold/40 text-archive-ivory hover:border-archive-gold' : 'border-archive-border text-archive-lead cursor-not-allowed'}`}
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
            <option value="weaponType">{t('weapon.groupByType')}</option>
          </select>
        </div>
      </div>

      {groups ? (
        <div className="space-y-6">
          {groups.map(([key, groupItems]) => {
            const typeName = groupItems[0]?.type || key
            const gp = groupPageMap[key] ?? 0
            const groupTotalPages = pageSize > 0 ? Math.ceil(groupItems.length / pageSize) : 1
            const groupPaged = pageSize > 0 ? groupItems.slice(gp * pageSize, (gp + 1) * pageSize) : groupItems
            return (
              <section key={key}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-archive-border">
                  <h3 className="text-sm font-medium text-archive-gold">{typeName}</h3>
                  <span className="text-[10px] text-archive-lead">{t('common.countPiece', { count: groupItems.length })}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {groupPaged.map(w => (
                    <div key={w.id} className="flex-1 min-w-72 max-w-96">
                      <WeaponBar weapon={w} skillNames={w.skills.flatMap(sid => skillNameMap[sid] ?? [])} />
                    </div>
                  ))}
                </div>
                {pageSize > 0 && groupTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.max(0, gp - 1) }))}
                      disabled={gp === 0}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.prev')}</button>
                    <span className="text-xs text-archive-dust">{gp + 1} / {groupTotalPages}</span>
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.min(groupTotalPages - 1, gp + 1) }))}
                      disabled={gp >= groupTotalPages - 1}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.next')}</button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-start">
            {paged.map(w => (
              <div key={w.id} className="flex-1 min-w-72 max-w-96">
                <WeaponBar weapon={w} skillNames={w.skills.flatMap(sid => skillNameMap[sid] ?? [])} />
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-archive-lead mt-4">{t('common.noResult', { name: t('weapon.title') })}</p>
          )}

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.prev')}</button>
              <span className="text-sm text-archive-dust">{page + 1} / {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">{t('common.next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
