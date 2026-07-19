import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useFactions } from '../../hooks/useData'
import { Link } from 'react-router-dom'
import Rarity from '../../components/Rarity'

export default function FactionList() {
  const { data: factions, loading, error } = useFactions()

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!factions || factions.length === 0) return <div className="text-archive-dust text-sm">暂无记录</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-xl font-bold text-archive-ivory">势力阵营</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.factions}</Badge>
      </div>

      <div className="flex flex-col gap-4">
        {factions.map((faction) => (
          <Link
            key={faction.id}
            to={`/archive/factions/${faction.id}`}
            className="block rounded border border-archive-border bg-archive-file p-4
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-base font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">{faction.name}</h3>
                {faction.engName && (
                  <span className="text-xs text-archive-lead">{faction.engName}</span>
                )}
                <span className="text-xs text-archive-lead">{faction.members.length} 人</span>
              </div>

            {faction.members.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} role="none">
                {faction.members.map((m) => (
                  <Link
                    key={m.id}
                    to={`/archive/operators/${m.id}`}
                    className="flex items-center gap-2 p-2 rounded border border-transparent
                               hover:border-archive-gold/40 hover:bg-archive-ink/60 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
                      {m.portrait ? (
                        <img src={m.portrait} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-archive-lead text-xs">?</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-archive-ivory group-hover:text-archive-gold transition-colors truncate">
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
