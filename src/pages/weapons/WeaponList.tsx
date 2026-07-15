import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeapons } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'

const PAGE_SIZES = [12, 24, 48, 0] as const
const RARITIES = [3, 4, 5, 6]

type SortField = '' | 'weaponType' | 'rarity'
type GroupField = '' | 'weaponType'

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

export default function WeaponList() {
  const { locale } = useLocale()
  const { data: weapons, loading, error } = useWeapons()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
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
      if (rarityFilter && w.rarity !== Number(rarityFilter)) return false
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

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!weapons || weapons.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">武器档案</h2>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索武器名称或 ID…"
            className="flex-1 px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] placeholder:text-[#5A5A62] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          />
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            {PAGE_SIZES.map(ps => (
              <option key={ps} value={ps}>{ps === 0 ? '全部' : `${ps} / 页`}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">全部类型</option>
            {weaponTypes.map(t => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">全部稀有度</option>
            {RARITIES.map(r => (
              <option key={r} value={r}>{'★'.repeat(r)}</option>
            ))}
          </select>

          <select
            value={skill1Filter}
            onChange={(e) => setSkill1Filter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">技能一</option>
            {skill1Options.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={skill2Filter}
            onChange={(e) => setSkill2Filter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">技能二</option>
            {skill2Options.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={skill3PrefixFilter}
            onChange={(e) => setSkill3PrefixFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">技能三前缀</option>
            {skill3PrefixOptions.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="rarity">稀有度</option>
            <option value="weaponType">武器类型</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDesc(v => !v)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${sortField ? 'border-[#C9A96E]/40 text-[#E8E6E3] hover:border-[#C9A96E]' : 'border-[#2A2A32] text-[#5A5A62] cursor-not-allowed'}`}
          >
            {sortDesc ? '↓ 倒序' : '↑ 正序'}
          </button>

          <div className="w-px bg-[#2A2A32]" />

          <select
            value={groupField}
            onChange={(e) => setGroupField(e.target.value as GroupField)}
            className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
          >
            <option value="">不分組</option>
            <option value="weaponType">按武器类型分组</option>
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
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[#2A2A32]">
                  <h3 className="text-sm font-medium text-[#C9A96E]">{typeName}</h3>
                  <span className="text-[10px] text-[#5A5A62]">{groupItems.length} 件</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {groupPaged.map(w => (
                    <WeaponCard key={w.id} weapon={w} skillNameMap={skillNameMap} />
                  ))}
                </div>
                {pageSize > 0 && groupTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.max(0, gp - 1) }))}
                      disabled={gp === 0}
                      className="px-2 py-1 text-xs rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] disabled:text-[#5A5A62] disabled:cursor-not-allowed hover:border-[#C9A96E]/40 transition-colors">上一页</button>
                    <span className="text-xs text-[#8B8982]">{gp + 1} / {groupTotalPages}</span>
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.min(groupTotalPages - 1, gp + 1) }))}
                      disabled={gp >= groupTotalPages - 1}
                      className="px-2 py-1 text-xs rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] disabled:text-[#5A5A62] disabled:cursor-not-allowed hover:border-[#C9A96E]/40 transition-colors">下一页</button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {paged.map(w => (
              <WeaponCard key={w.id} weapon={w} skillNameMap={skillNameMap} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-[#5A5A62] mt-4">未找到匹配武器</p>
          )}

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] disabled:text-[#5A5A62] disabled:cursor-not-allowed hover:border-[#C9A96E]/40 transition-colors">上一页</button>
              <span className="text-sm text-[#8B8982]">{page + 1} / {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] disabled:text-[#5A5A62] disabled:cursor-not-allowed hover:border-[#C9A96E]/40 transition-colors">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WeaponCard({ weapon, skillNameMap }: { weapon: import('../../lib/types').Weapon; skillNameMap: Record<string, string[]> }) {
  const skillNames = weapon.skills.flatMap(sid => skillNameMap[sid] ?? [])
  return (
    <Link
      to={`/archive/weapons/${weapon.id}`}
      className="flex gap-3 p-2 rounded border border-[#2A2A32] bg-[#1A1B23] hover:border-[#C9A96E]/40 transition-colors"
    >
      <div className="flex flex-col items-center gap-1 shrink-0">
        <img
          src={getItemIconUrl(weapon.iconId)}
          alt=""
          className="w-12 h-12 object-cover bg-[#2A2A32]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: RARITY_COLORS[weapon.rarity] || '#a0a0a0' }} />
        <span className="text-[11px] text-[#E8E6E3] text-center leading-tight line-clamp-2">{weapon.name}</span>
        <span className="text-[9px] text-[#5A5A62]">{weapon.type}</span>
      </div>
      {skillNames.length > 0 && (
        <div className="flex flex-col gap-1 justify-center">
          {skillNames.slice(0, 3).map((sn, i) => (
            <span key={i} className="text-xs text-[#8B8982] leading-tight">{sn}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
