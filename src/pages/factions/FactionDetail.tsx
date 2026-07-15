import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFactionDetail } from '../../hooks/useData'
import Rarity from '../../components/Rarity'
import { RichText } from '../../lib/richText'

const HIGHLIGHT_COLOR = '#C9A96E'

function highlightName(text: string, name: string): string {
  if (!name) return text
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'g'), `<mark=${HIGHLIGHT_COLOR}>${name}</mark>`)
}

export default function FactionDetail() {
  const { factionId } = useParams<{ factionId: string }>()
  const { data, loading, error } = useFactionDetail(factionId ?? '')

  const highlighted = useMemo(() => {
    if (!data) return []
    return data.texts.map(t => ({
      ...t,
      html: highlightName(t.text, data.name),
    }))
  }, [data])

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!data) return <div className="text-[#8B8982] text-sm">暂无记录</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/archive/factions"
          className="w-7 h-7 flex items-center justify-center rounded-full border border-[#2A2A32]
                     text-[#8B8982] hover:text-[#C9A96E] hover:border-[#C9A96E]/40
                     transition-all duration-200 text-sm leading-none"
        >
          &lt;
        </Link>
        <h2 className="text-xl font-bold text-[#E8E6E3]">{data.name}</h2>
        {data.engName && (
          <span className="text-sm text-[#5A5A62]">{data.engName}</span>
        )}
        <span className="text-xs text-[#5A5A62]">{data.members.length} 人</span>
      </div>

      {highlighted.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[#8B8982] mb-2">相关记载</h3>
          <div className="flex flex-col gap-3">
            {highlighted.map((t) => (
              <div key={`${t.source}-${t.text.slice(0, 20)}`} className="rounded border border-[#2A2A32] bg-[#1A1B23] p-3">
                <div className="text-[10px] text-[#5A5A62] mb-1">{t.source}</div>
                <div className="text-sm text-[#E8E6E3] leading-relaxed">
                  <RichText text={t.html} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-medium text-[#8B8982] mb-2">所属干员</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.members.map((m) => (
          <Link
            key={m.id}
            to={`/archive/operators/${m.id}`}
            className="block p-4 rounded border border-[#2A2A32] bg-[#1A1B23]
                       hover:border-[#C9A96E]/40 transition-all duration-200 group"
          >
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
                {m.portrait ? (
                  <img src={m.portrait} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A5A62] text-lg">?</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors truncate">
                  {m.name}
                </h4>
                <Rarity level={m.rarity} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
