import { useParams } from 'react-router-dom'
import { useOperator } from '../../hooks/useData'

export default function OperatorDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: op, loading, error } = useOperator(id ?? '')

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!op) return <div className="text-[#8B8982] text-sm">干员档案未找到</div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 rounded border border-[#2A2A32] bg-[#1A1B23] flex items-center justify-center shrink-0">
          <span className="text-2xl text-[#5A5A62]">?</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#E8E6E3]">{op.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[#8B8982]">
            <span>{op.race}</span>
            <span>·</span>
            <span>{op.profession}</span>
            <span>·</span>
            <span style={{ color: op.elementColor }}>{op.element}</span>
            <span>·</span>
            <span>{'★'.repeat(op.rarity)}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {op.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {op.profileRecords.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">档案记录</h3>
          <div className="space-y-3">
            {op.profileRecords.map((record, i) => (
              <p key={i} className="text-sm text-[#B0ACA6] leading-relaxed">{record}</p>
            ))}
          </div>
        </section>
      )}

      {op.voiceLines.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">语音记录</h3>
          <div className="space-y-2">
            {op.voiceLines.slice(0, 10).map((vl, i) => (
              <div key={i} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                <p className="text-xs text-[#5A5A62] mb-1">{vl.title || `语音 ${i + 1}`}</p>
                <p className="text-sm text-[#B0ACA6]">{vl.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
