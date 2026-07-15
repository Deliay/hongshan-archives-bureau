import { useState, useMemo } from 'react'
import { useItems } from '../../hooks/useData'
import ItemPanel from '../../components/Items/ItemPanel'

export default function ItemList() {
  const { data: items, loading, error } = useItems()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const types = useMemo(() => {
    if (!items) return []
    return [...new Set(items.map(i => i.type).filter(Boolean))]
  }, [items])

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && i.type !== typeFilter) return false
      return true
    })
  }, [items, search, typeFilter])

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!items || items.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">道具材料</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索道具名称或 ID…"
          className="flex-1 px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] placeholder:text-[#5A5A62] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border border-[#2A2A32] bg-[#1A1B23] text-[#E8E6E3] focus:outline-none focus:border-[#C9A96E]/40 transition-colors"
        >
          <option value="">全部类型</option>
          {types.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {filtered.map((item) => (
          <ItemPanel key={item.id} itemId={item.id} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[#5A5A62] mt-4">未找到匹配道具</p>
      )}
    </div>
  )
}
