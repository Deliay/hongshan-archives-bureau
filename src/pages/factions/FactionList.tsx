import { useFactions } from '../../hooks/useData'
import { Link } from 'react-router-dom'
import Rarity from '../../components/Rarity'

export default function FactionList() {
  const { data: factions, loading, error } = useFactions()

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!factions || factions.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-6">势力阵营</h2>

      <div className="flex flex-col gap-4">
        {factions.map((faction) => (
          <Link
            key={faction.id}
            to={`/archive/factions/${faction.id}`}
            className="block rounded border border-[#2A2A32] bg-[#1A1B23] p-4
                       hover:border-[#C9A96E]/40 transition-all duration-200 group"
          >
            <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-base font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors">{faction.name}</h3>
                {faction.engName && (
                  <span className="text-xs text-[#5A5A62]">{faction.engName}</span>
                )}
                <span className="text-xs text-[#5A5A62]">{faction.members.length} 人</span>
              </div>

            {faction.members.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} role="none">
                {faction.members.map((m) => (
                  <Link
                    key={m.id}
                    to={`/archive/operators/${m.id}`}
                    className="flex items-center gap-2 p-2 rounded border border-transparent
                               hover:border-[#C9A96E]/40 hover:bg-[#0F0F12]/60 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
                      {m.portrait ? (
                        <img src={m.portrait} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5A5A62] text-xs">?</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors truncate">
                        {m.name}
                      </div>
                      <Rarity level={m.rarity} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
