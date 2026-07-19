import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useState, useMemo } from 'react'
import { useOperators } from '../../hooks/useData'
import { Link } from 'react-router-dom'
import Rarity from '../../components/Rarity'

type SortKey = 'profession' | 'rarity' | 'element' | 'race' | 'faction'
type GroupKey = '' | 'element' | 'profession' | 'rarity' | 'race' | 'faction' | 'mainAttr'

export default function OperatorList() {
  const { data: operators, loading, error } = useOperators()

  const [filterElement, setFilterElement] = useState('')
  const [filterProfession, setFilterProfession] = useState('')
  const [filterRarity, setFilterRarity] = useState<number | ''>('')
  const [filterTag, setFilterTag] = useState('')
  const [filterRace, setFilterRace] = useState('')
  const [filterFaction, setFilterFaction] = useState('')
  const [filterMainAttr, setFilterMainAttr] = useState('')
  const [filterSubAttr, setFilterSubAttr] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rarity')
  const [sortDesc, setSortDesc] = useState(true)
  const [groupKey, setGroupKey] = useState<GroupKey>('')

  const elementOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.element).filter(Boolean))].sort()
  }, [operators])

  const professionOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.profession).filter(Boolean))].sort()
  }, [operators])

  const tagOptions = useMemo(() => {
    if (!operators) return []
    const tags = new Set<string>()
    operators.forEach((o) => o.tags.forEach((t) => tags.add(t)))
    return [...tags].sort()
  }, [operators])

  const raceOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.race).filter(Boolean))].sort()
  }, [operators])

  const factionOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.faction).filter(Boolean))].sort()
  }, [operators])

  const attrOptions = useMemo(() => {
    if (!operators) return []
    const seen = new Set<number>()
    const result: { id: number; name: string; icon: string }[] = []
    operators.forEach((o) => {
      ;[o.mainAttr, o.subAttr].forEach((a) => {
        if (a.id && !seen.has(a.id)) {
          seen.add(a.id)
          result.push(a)
        }
      })
    })
    return result.sort((a, b) => a.id - b.id)
  }, [operators])

  const visible = useMemo(() => {
    if (!operators) return []
    let list = [...operators]

    if (filterElement) list = list.filter((o) => o.element === filterElement)
    if (filterProfession) list = list.filter((o) => o.profession === filterProfession)
    if (filterRarity !== '') list = list.filter((o) => o.rarity === filterRarity)
    if (filterTag) list = list.filter((o) => o.tags.includes(filterTag))
    if (filterRace) list = list.filter((o) => o.race === filterRace)
    if (filterFaction) list = list.filter((o) => o.faction === filterFaction)
    if (filterMainAttr) list = list.filter((o) => o.mainAttr.name === filterMainAttr)
    if (filterSubAttr) list = list.filter((o) => o.subAttr.name === filterSubAttr)

    const dir = sortDesc ? -1 : 1
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'profession') cmp = a.profession.localeCompare(b.profession)
      else if (sortKey === 'rarity') cmp = a.rarity - b.rarity
      else if (sortKey === 'element') cmp = a.element.localeCompare(b.element)
      else if (sortKey === 'race') cmp = a.race.localeCompare(b.race)
      else if (sortKey === 'faction') cmp = a.faction.localeCompare(b.faction)
      return cmp * dir
    })

    return list
  }, [operators, filterElement, filterProfession, filterRarity, filterTag, filterRace, filterFaction, filterMainAttr, filterSubAttr, sortKey, sortDesc])

  const grouped = useMemo(() => {
    if (!groupKey || !visible.length) return null
    const groups: Record<string, typeof visible> = {}
    for (const op of visible) {
      const k = groupKey === 'mainAttr' ? op.mainAttr.name
              : groupKey === 'rarity' ? String(op.rarity)
              : String((op as any)[groupKey] ?? '未知')
      if (!groups[k]) groups[k] = []
      groups[k].push(op)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (groupKey === 'rarity') return Number(b) - Number(a)
      return a.localeCompare(b)
    })
  }, [visible, groupKey])

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!operators || operators.length === 0) return <div className="text-archive-dust text-sm">暂无记录</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">干员档案</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.operators}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部元素</option>
          {elementOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部职业</option>
          {professionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value ? Number(e.target.value) : '')}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部稀有度</option>
          {[0, 1, 2, 3, 4, 5, 6].map((v) => <option key={v} value={v}>稀有度 {v}</option>)}
        </select>

        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部Tags</option>
          {tagOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterRace} onChange={(e) => setFilterRace(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部种族</option>
          {raceOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterFaction} onChange={(e) => setFilterFaction(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部阵营</option>
          {factionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterMainAttr} onChange={(e) => setFilterMainAttr(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部主属性</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <select value={filterSubAttr} onChange={(e) => setFilterSubAttr(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">全部副属性</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <span className="text-archive-lead">|</span>

        {/* Sort */}
        <span className="text-archive-dust">排序：</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="profession">职业</option>
          <option value="rarity">稀有度</option>
          <option value="element">元素</option>
          <option value="race">种族</option>
          <option value="faction">阵营</option>
        </select>

        <button onClick={() => setSortDesc((d) => !d)}
          className="px-2 py-1.5 rounded border border-archive-border bg-archive-file text-archive-ivory hover:border-archive-gold/40 transition-colors">
          {sortDesc ? '降序 ↓' : '升序 ↑'}
        </button>

        <span className="text-archive-lead">|</span>

        {/* Group */}
        <span className="text-archive-dust">分组：</span>
        <select value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">不分组</option>
          <option value="element">元素</option>
          <option value="profession">职业</option>
          <option value="rarity">稀有度</option>
          <option value="race">种族</option>
          <option value="faction">阵营</option>
          <option value="mainAttr">主属性</option>
        </select>
      </div>

      {grouped ? (
        <div className="flex flex-col gap-6">
          {grouped.map(([groupLabel, ops]) => (
            <div key={groupLabel}>
              <h3 className="text-sm font-medium text-archive-ivory mb-2">{groupLabel} · {ops.length}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ops.map((op) => (
                  <Link
                    key={op.id}
                    to={`/archive/operators/${op.id}`}
                    className="block p-4 rounded border border-archive-border bg-archive-file
                               hover:border-archive-gold/40 transition-all duration-200 group"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
                        {op.portrait ? (
                          <img src={op.portrait} alt={op.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-archive-lead text-lg">?</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors truncate">
                          {op.name || '未知'}
                        </h4>
                        <Rarity level={op.rarity} />
                        {op.race && (
                          <div className="text-[10px] text-archive-dust leading-tight">{op.race}</div>
                        )}
                        {op.faction && (
                          <div className="text-[10px] text-archive-lead leading-tight">{op.faction}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1">
                        <img src={op.elementIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs shrink-0" style={{ color: op.elementColor }}>{op.element}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <img src={op.professionIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs text-archive-dust shrink-0">{op.profession}</span>
                      </span>
                      {op.mainAttr.icon && (
                        <span className="flex items-center gap-1 ml-auto">
                          <img src={op.mainAttr.icon} alt="" className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs text-archive-dust shrink-0">{op.mainAttr.name}</span>
                        </span>
                      )}
                    </div>
                    {op.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {op.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visible.map((op) => (
            <Link
              key={op.id}
              to={`/archive/operators/${op.id}`}
              className="block p-4 rounded border border-archive-border bg-archive-file
                         hover:border-archive-gold/40 transition-all duration-200 group"
            >
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
                  {op.portrait ? (
                    <img src={op.portrait} alt={op.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-archive-lead text-lg">?</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors truncate">
                    {op.name || '未知'}
                  </h3>
                  <Rarity level={op.rarity} />
                  {op.race && (
                    <div className="text-[10px] text-archive-dust leading-tight">{op.race}</div>
                  )}
                  {op.faction && (
                    <div className="text-[10px] text-archive-lead leading-tight">{op.faction}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1">
                  <img src={op.elementIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs shrink-0" style={{ color: op.elementColor }}>{op.element}</span>
                </span>
                <span className="flex items-center gap-1">
                  <img src={op.professionIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs text-archive-dust shrink-0">{op.profession}</span>
                </span>
                {op.mainAttr.icon && (
                  <span className="flex items-center gap-1 ml-auto">
                    <img src={op.mainAttr.icon} alt="" className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs text-archive-dust shrink-0">{op.mainAttr.name}</span>
                  </span>
                )}
              </div>
              {op.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {op.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
