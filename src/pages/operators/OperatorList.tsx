import { useState, useMemo } from 'react'
import { useOperators } from '../../hooks/useData'
import { Link } from 'react-router-dom'
import Rarity from '../../components/Rarity'

type SortKey = 'profession' | 'rarity' | 'element'

export default function OperatorList() {
  const { data: operators, loading, error } = useOperators()

  const [filterElement, setFilterElement] = useState('')
  const [filterProfession, setFilterProfession] = useState('')
  const [filterRarity, setFilterRarity] = useState<number | ''>('')
  const [filterTag, setFilterTag] = useState('')
  const [filterMainAttr, setFilterMainAttr] = useState('')
  const [filterSubAttr, setFilterSubAttr] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rarity')
  const [sortDesc, setSortDesc] = useState(true)

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
    if (filterMainAttr) list = list.filter((o) => o.mainAttr.name === filterMainAttr)
    if (filterSubAttr) list = list.filter((o) => o.subAttr.name === filterSubAttr)

    const dir = sortDesc ? -1 : 1
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'profession') cmp = a.profession.localeCompare(b.profession)
      else if (sortKey === 'rarity') cmp = a.rarity - b.rarity
      else if (sortKey === 'element') cmp = a.element.localeCompare(b.element)
      return cmp * dir
    })

    return list
  }, [operators, filterElement, filterProfession, filterRarity, filterTag, filterMainAttr, filterSubAttr, sortKey, sortDesc])

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!operators || operators.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">干员档案</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部元素</option>
          {elementOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部职业</option>
          {professionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value ? Number(e.target.value) : '')}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部稀有度</option>
          {[0, 1, 2, 3, 4, 5, 6].map((v) => <option key={v} value={v}>稀有度 {v}</option>)}
        </select>

        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部Tags</option>
          {tagOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterMainAttr} onChange={(e) => setFilterMainAttr(e.target.value)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部主属性</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <select value={filterSubAttr} onChange={(e) => setFilterSubAttr(e.target.value)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="">全部副属性</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <span className="text-[#5A5A62]">|</span>

        {/* Sort */}
        <span className="text-[#8B8982]">排序：</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-[#1A1B23] border border-[#2A2A32] rounded px-2 py-1.5 text-[#E8E6E3] outline-none focus:border-[#C9A96E]/40">
          <option value="profession">职业</option>
          <option value="rarity">稀有度</option>
          <option value="element">元素</option>
        </select>

        <button onClick={() => setSortDesc((d) => !d)}
          className="px-2 py-1.5 rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] hover:border-[#C9A96E]/40 transition-colors">
          {sortDesc ? '降序 ↓' : '升序 ↑'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {visible.map((op) => (
          <Link
            key={op.id}
            to={`/archive/operators/${op.id}`}
            className="block p-4 rounded border border-[#2A2A32] bg-[#1A1B23]
                       hover:border-[#C9A96E]/40 transition-all duration-200 group"
          >
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
                {op.portrait ? (
                  <img src={op.portrait} alt={op.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A5A62] text-lg">?</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors truncate">
                  {op.name || '未知'}
                </h3>
                <Rarity level={op.rarity} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1">
                <img src={op.elementIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs shrink-0" style={{ color: op.elementColor }}>{op.element}</span>
              </span>
              <span className="flex items-center gap-1">
                <img src={op.professionIcon} alt="" className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs text-[#8B8982] shrink-0">{op.profession}</span>
              </span>
              {op.mainAttr.icon && (
                <span className="flex items-center gap-1 ml-auto">
                  <img src={op.mainAttr.icon} alt="" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs text-[#8B8982] shrink-0">{op.mainAttr.name}</span>
                </span>
              )}
            </div>
            {op.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {op.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
