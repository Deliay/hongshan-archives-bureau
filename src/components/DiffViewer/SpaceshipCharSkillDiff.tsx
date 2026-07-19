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

  if (!hasChanges) return <p className="text-sm text-archive-lead">无变更</p>

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-archive-border">
        {tabs.map((t) => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-archive-gold text-archive-gold' : 'border-transparent text-archive-dust hover:text-archive-ivory'}`}
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
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-1">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <div key={id} className="flex items-center gap-3 px-3 py-2 rounded border border-archive-border bg-archive-file text-xs">
            <span className="text-archive-ivory font-mono">{id}</span>
            <span className="text-archive-lead">→</span>
            <span className="text-archive-dust font-mono">{(e.skillIds || e.skills || []).join(', ') || JSON.stringify(e).slice(0, 60)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ChangedList({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-1">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <details key={id} className="border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono">
              {id}
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border">
              <div className="mt-2 space-y-1">
                {Object.entries(e.changed).map(([path, change]: [string, any]) => (
                  <div key={path} className="text-xs border-b border-archive-border/50 pb-1">
                    <div className="text-archive-dust font-mono mb-0.5">{path}</div>
                    <div className="flex gap-3">
                      <span className="text-[archive-seal]">旧 {JSON.stringify(change.oldValue ?? change.oldText)}</span>
                      <span className="text-[archive-bronze]">新 {JSON.stringify(change.newValue ?? change.newText)}</span>
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
