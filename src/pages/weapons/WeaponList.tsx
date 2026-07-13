import { useWeapons } from '../../hooks/useData'

export default function WeaponList() {
  const { data: weapons, loading, error } = useWeapons()
  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!weapons || weapons.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  const grouped: Record<string, typeof weapons> = {}
  for (const w of weapons) {
    (grouped[w.type] ??= []).push(w)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">武器档案</h2>
      {Object.entries(grouped).map(([type, list]) => (
        <section key={type} className="mb-6">
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">{type}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {list.map((w) => (
              <div key={w.id} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                <p className="text-sm text-[#E8E6E3] truncate">{w.name}</p>
                <p className="text-xs text-[#5A5A62] mt-1">{'★'.repeat(w.rarity)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
