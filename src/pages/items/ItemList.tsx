import { useItems } from '../../hooks/useData'

export default function ItemList() {
  const { data: items, loading, error } = useItems()
  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!items || items.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">道具材料</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {items.slice(0, 100).map((item) => (
          <div key={item.id} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
            <p className="text-sm text-[#E8E6E3] truncate">{item.name || item.id}</p>
            <p className="text-xs text-[#5A5A62] mt-1">{item.type}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
