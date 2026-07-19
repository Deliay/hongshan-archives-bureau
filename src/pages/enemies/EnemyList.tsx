import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEnemies } from '../../hooks/useData'
import Rarity from '../../components/Rarity'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'

const PAGE_SIZES = [12, 24, 48, 0] as const
const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }

type SortField = '' | 'displayType' | 'name'
type GroupField = '' | 'wikiGroup'

function getEnemyIconUrl(templateId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericon/${templateId}.png`
}

export default function EnemyList() {
  const { locale } = useLocale()
  const { data: enemies, loading, error } = useEnemies()
  const [search, setSearch] = useState('')
  const [starFilter, setStarFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [pageSize, setPageSize] = useState(24)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>('displayType')
  const [sortDesc, setSortDesc] = useState(true)
  const [groupField, setGroupField] = useState<GroupField>('')
  const [groupPageMap, setGroupPageMap] = useState<Record<string, number>>({})
  const [tagNameMap, setTagNameMap] = useState<Record<string, string>>({})
  const [typeNameMap, setTypeNameMap] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [tagRaw, tagI18n, typeRaw, typeI18n] = await Promise.all([
        getCachedData<Record<string, any>>('EnemyTagTable', () => fetchTableAll('EnemyTagTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyTagTable`, () => fetchTableDictAll('EnemyTagTable', locale)),
        getCachedData<Record<string, any>>('DisplayEnemyTypeTable', () => fetchTableAll('DisplayEnemyTypeTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_DisplayEnemyTypeTable`, () => fetchTableDictAll('DisplayEnemyTypeTable', locale)),
      ])
      if (cancelled) return
      const tMap: Record<string, string> = {}
      for (const [, v] of Object.entries<any>(tagRaw)) {
        tMap[v.tagId] = resolveI18n(v.tagText, tagI18n) || v.tagId
      }
      setTagNameMap(tMap)
      const tmMap: Record<number, string> = {}
      for (const [k, v] of Object.entries<any>(typeRaw)) {
        tmMap[Number(k)] = resolveI18n(v.name, typeI18n) || `类型${k}`
      }
      setTypeNameMap(tmMap)
    }
    load()
    return () => { cancelled = true }
  }, [locale])

  const groups = useMemo(() => {
    if (!enemies) return []
    const seen = new Set<string>()
    const result: { key: string; name: string }[] = []
    for (const e of enemies) {
      if (e.wikiGroup && !seen.has(e.wikiGroup)) {
        seen.add(e.wikiGroup)
        result.push({ key: e.wikiGroup, name: e.wikiGroup })
      }
    }
    return result.sort()
  }, [enemies])

  const filtered = useMemo(() => {
    if (!enemies) return []
    return enemies.filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false
      if (starFilter && ENEMY_STARS[e.displayType] !== Number(starFilter)) return false
      if (groupFilter && e.wikiGroup !== groupFilter) return false
      return true
    })
  }, [enemies, search, starFilter, groupFilter])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'displayType') cmp = (ENEMY_STARS[a.displayType] ?? 0) - (ENEMY_STARS[b.displayType] ?? 0)
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      return cmp * dir
    })
  }, [filtered, sortField, sortDesc])

  const groupedList = useMemo(() => {
    if (!groupField) return null
    const map = new Map<string, typeof sorted>()
    for (const e of sorted) {
      const key = e.wikiGroup || '其他'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [sorted, groupField])

  const totalPages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1
  const paged = pageSize > 0 ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted

  useEffect(() => {
    setPage(0)
    setGroupPageMap({})
  }, [search, starFilter, groupFilter, pageSize, sortField, sortDesc, groupField])

  if (loading) return <div className="text-archive-dust text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!enemies || enemies.length === 0) return <div className="text-archive-dust text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-archive-ivory mb-4">敌人图鉴</h2>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索敌人名称或 ID…"
            className="flex-1 px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 transition-colors"
          />
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            {PAGE_SIZES.map(ps => (
              <option key={ps} value={ps}>{ps === 0 ? '全部' : `${ps} / 页`}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">全部星级</option>
            {[1, 2, 3, 4, 5, 6].map(r => (
              <option key={r} value={r}>{'★'.repeat(r)}</option>
            ))}
          </select>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">全部阵营</option>
            {groups.map(g => (
              <option key={g.key} value={g.key}>{g.name}</option>
            ))}
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="displayType">敌人星级</option>
            <option value="name">名称</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDesc(v => !v)}
            className="px-2 py-1.5 text-sm rounded border transition-colors border-archive-gold/40 text-archive-ivory hover:border-archive-gold"
          >
            {sortDesc ? '↓ 倒序' : '↑ 正序'}
          </button>
          <div className="w-px bg-archive-border" />
          <select
            value={groupField}
            onChange={(e) => setGroupField(e.target.value as GroupField)}
            className="px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors"
          >
            <option value="">不分組</option>
            <option value="wikiGroup">按阵营分组</option>
          </select>
        </div>
      </div>

      {groupedList ? (
        <div className="space-y-6">
          {groupedList.map(([key, items]) => {
            const gp = groupPageMap[key] ?? 0
            const groupTotalPages = pageSize > 0 ? Math.ceil(items.length / pageSize) : 1
            const groupPaged = pageSize > 0 ? items.slice(gp * pageSize, (gp + 1) * pageSize) : items
            return (
              <section key={key}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-archive-border">
                  <h3 className="text-sm font-medium text-archive-gold">{key}</h3>
                  <span className="text-[10px] text-archive-lead">{items.length} 种</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {groupPaged.map(e => (
                    <EnemyCard key={e.id} enemy={e} tagNameMap={tagNameMap} typeNameMap={typeNameMap} />
                  ))}
                </div>
                {pageSize > 0 && groupTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.max(0, gp - 1) }))}
                      disabled={gp === 0}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">上一页</button>
                    <span className="text-xs text-archive-dust">{gp + 1} / {groupTotalPages}</span>
                    <button type="button" onClick={() => setGroupPageMap(m => ({ ...m, [key]: Math.min(groupTotalPages - 1, gp + 1) }))}
                      disabled={gp >= groupTotalPages - 1}
                      className="px-2 py-1 text-xs rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">下一页</button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {paged.map(e => (
              <EnemyCard key={e.id} enemy={e} tagNameMap={tagNameMap} typeNameMap={typeNameMap} />
            ))}
          </div>
          {filtered.length === 0 && <p className="text-sm text-archive-lead mt-4">未找到匹配敌人</p>}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">上一页</button>
              <span className="text-sm text-archive-dust">{page + 1} / {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory disabled:text-archive-lead disabled:cursor-not-allowed hover:border-archive-gold/40 transition-colors">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EnemyCard({ enemy, tagNameMap, typeNameMap }: { enemy: import('../../lib/types').Enemy; tagNameMap: Record<string, string>; typeNameMap: Record<number, string> }) {
  const stars = ENEMY_STARS[enemy.displayType] ?? 1
  return (
    <Link to={`/archive/enemies/${enemy.id}`} className="flex gap-3 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors">
      <div className="shrink-0">
        <img
          src={getEnemyIconUrl(enemy.templateId)}
          alt=""
          className="w-12 h-12 object-cover bg-archive-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-archive-ivory truncate">{enemy.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-archive-lead">{typeNameMap[enemy.displayType] || `类型${enemy.displayType}`}</span>
          <Rarity level={stars} />
        </div>
        {enemy.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {enemy.tags.map((t, i) => (
              <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-archive-border text-archive-dust">{tagNameMap[t] || t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
