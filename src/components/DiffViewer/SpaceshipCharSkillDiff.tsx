import { useState } from 'react'
import type { TableDiffComponentProps } from './registry'

export default function SpaceshipCharSkillDiff({ diff }: TableDiffComponentProps) {
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>(
    diff.stats.changed > 0 ? 'changed' : diff.stats.added > 0 ? 'added' : 'removed',
  )
  const { stats, entries } = diff
  const hasChanges = stats.added + stats.removed + stats.changed > 0

  const tabs = (
    [
      { id: 'added' as const, label: '新增', count: stats.added },
      { id: 'removed' as const, label: '移除', count: stats.removed },
      { id: 'changed' as const, label: '变更', count: stats.changed },
    ] as const
  ).filter((t) => t.count > 0)

  if (!hasChanges) return <p className="text-sm text-[#5A5A62]">无变更</p>

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-[#2A2A32]">
        {tabs.map((t) => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#8B8982] hover:text-[#E8E6E3]'}`}
          >{t.label}（{t.count}）</button>
        ))}
      </div>

      {tab === 'added' && <MappingList entries={entries.added} />}
      {tab === 'removed' && <MappingList entries={entries.removed} />}
      {tab === 'changed' && <ChangedList entries={entries.changed} />}
    </div>
  )
}

function MappingList({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-1">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <div key={id} className="flex items-center gap-3 px-3 py-2 rounded border border-[#2A2A32] bg-[#1A1B23] text-xs">
            <span className="text-[#E8E6E3] font-mono">{id}</span>
            <span className="text-[#5A5A62]">→</span>
            <span className="text-[#8B8982] font-mono">{(e.skillIds || e.skills || []).join(', ') || JSON.stringify(e).slice(0, 60)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ChangedList({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-1">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <details key={id} className="border border-[#2A2A32] rounded bg-[#1A1B23]">
            <summary className="px-3 py-2 text-sm text-[#E8E6E3] cursor-pointer hover:text-[#C9A96E] transition-colors font-mono">
              {id}
            </summary>
            <div className="px-3 pb-3 border-t border-[#2A2A32]">
              <div className="mt-2 space-y-1">
                {Object.entries(e.changed).map(([path, change]: [string, any]) => (
                  <div key={path} className="text-xs border-b border-[#2A2A32]/50 pb-1">
                    <div className="text-[#8B8982] font-mono mb-0.5">{path}</div>
                    <div className="flex gap-3">
                      <span className="text-[#ef4444]">旧 {JSON.stringify(change.oldValue ?? change.oldText)}</span>
                      <span className="text-[#26bbfd]">新 {JSON.stringify(change.newValue ?? change.newText)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
