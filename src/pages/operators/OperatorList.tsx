import { useOperators } from '../../hooks/useData'
import { Link } from 'react-router-dom'

export default function OperatorList() {
  const { data: operators, loading, error } = useOperators()

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!operators || operators.length === 0) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">干员档案</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {operators.map((op) => (
          <Link
            key={op.id}
            to={`/archive/operators/${op.id}`}
            className="block p-4 rounded border border-[#2A2A32] bg-[#1A1B23]
                       hover:border-[#C9A96E]/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: op.elementColor }}
              />
              <span className="text-xs text-[#8B8982]">{op.profession}</span>
            </div>
            <h3 className="text-sm font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors">
              {op.name || '未知'}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#5A5A62]">
              <span>{op.race}</span>
              <span>·</span>
              <span>{'★'.repeat(op.rarity)}</span>
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
