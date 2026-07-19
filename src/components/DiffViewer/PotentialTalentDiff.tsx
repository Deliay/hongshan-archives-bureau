import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import type { TableDiffComponentProps } from './registry'

function lt(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
  return ((obj as Record<string, string>)[locale] || (obj as Record<string, string>).CN || '')
}

export default function PotentialTalentDiff({ diff }: TableDiffComponentProps) {
  const { locale } = useLocale()
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>(
    diff.stats.changed > 0 ? 'changed' : diff.stats.added > 0 ? 'added' : 'removed',
  )
  const { stats, entries } = diff

  const tabs = (
    [
      { id: 'added' as const, label: '新增', count: stats.added },
      { id: 'removed' as const, label: '移除', count: stats.removed },
      { id: 'changed' as const, label: '变更', count: stats.changed },
    ] as const
  ).filter((t) => t.count > 0)

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-archive-border">
        {tabs.map((t) => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-archive-gold text-archive-gold' : 'border-transparent text-archive-dust hover:text-archive-ivory'}`}
          >{t.label}（{t.count}）</button>
        ))}
      </div>

      {tab === 'added' && <EntryCards entries={entries.added} locale={locale} />}
      {tab === 'removed' && <EntryCards entries={entries.removed} locale={locale} />}
      {tab === 'changed' && <ChangedCards entries={entries.changed} />}
    </div>
  )
}

function EntryCards({ entries, locale }: { entries: Record<string, any>; locale: string }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-2">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <div key={id} className="border border-archive-border rounded bg-archive-file p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm text-archive-ivory font-mono">{id}</span>
                <span className="text-xs text-archive-dust ml-2">{e.id}</span>
              </div>
            </div>
            {e.desc && (
              <div className="text-xs text-archive-ivory mt-1">{lt(e.desc, locale)}</div>
            )}
            {e.dataList && e.dataList.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-archive-dust">数据（{e.dataList.length} 条）</div>
                {e.dataList.map((d: any, i: number) => (
                  <div key={d.modifyType ?? i} className="text-xs px-2 py-1 rounded bg-archive-ink text-archive-lead">
                    {d.modifyType && <span className="font-mono text-archive-gold">{d.modifyType} </span>}
                    {Object.entries(d).filter(([k]) => k !== 'modifyType').map(([k, v]: [string, any]) => (
                      <span key={k} className="ml-2">{k}={String(v).slice(0, 40)}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChangedCards({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-2">
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
                    {change.type === 'value' ? (
                      <div className="flex gap-3">
                        <span className="text-[archive-seal]">旧 {JSON.stringify(change.oldValue)}</span>
                        <span className="text-[archive-bronze]">新 {JSON.stringify(change.newValue)}</span>
                      </div>
                    ) : (
                      Object.entries(change.changedLocales).map(([loc, { oldText, newText }]: [string, any]) => (
                        <div key={loc}>
                          <span className="text-archive-gold">{loc}</span>: {oldText} → {newText}
                        </div>
                      ))
                    )}
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
