import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import type { TableDiffComponentProps } from './registry'

function lt(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
  return ((obj as Record<string, string>)[locale] || (obj as Record<string, string>).CN || '')
}

export default function SkillPatchDiff({ diff }: TableDiffComponentProps) {
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

      {tab === 'added' && <AddedList entries={entries.added} locale={locale} />}
      {tab === 'removed' && <AddedList entries={entries.removed} locale={locale} />}
      {tab === 'changed' && <ChangedList entries={entries.changed} />}
    </div>
  )
}

function AddedList({ entries, locale }: { entries: Record<string, any>; locale: string }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-2">
      {keys.map((id) => {
        const e = entries[id]
        const bundle = e.SkillPatchDataBundle || []
        return (
          <details key={id} className="border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono">
              {id}
              <span className="text-archive-dust ml-2 text-xs">{bundle.length} 个数据包</span>
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border space-y-2 mt-2">
              {bundle.map((b: any, i: number) => (
                <SkillBundleCard key={b.skillId || i} bundle={b} locale={locale} />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ChangedList({ entries }: { entries: Record<string, any> }) {
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
                        <span className="text-[#ef4444]">旧 {JSON.stringify(change.oldValue)}</span>
                        <span className="text-[#26bbfd]">新 {JSON.stringify(change.newValue)}</span>
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

function SkillBundleCard({ bundle, locale }: { bundle: any; locale: string }) {
  return (
    <div className="border border-archive-border rounded p-2 bg-archive-ink">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-archive-gold font-mono">{bundle.skillId}</span>
          <span className="text-xs text-archive-dust ml-2">Lv.{bundle.level}</span>
          {bundle.iconId && <span className="text-xs text-archive-lead ml-2">{bundle.iconId}</span>}
        </div>
        <div className="text-xs text-archive-lead">
          {bundle.costType && <span>消耗{bundle.costType}×{bundle.costValue}</span>}
          {bundle.coolDown !== undefined && <span className="ml-2">CD{bundle.coolDown}s</span>}
        </div>
      </div>
      {bundle.description && (
        <div className="text-xs text-archive-ivory mt-1">{lt(bundle.description, locale)}</div>
      )}
      {bundle.blackboard && bundle.blackboard.length > 0 && (
        <div className="mt-1">
          <div className="text-[10px] text-archive-lead">参数（{bundle.blackboard.length}）</div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {bundle.blackboard.map((bb: any, i: number) => (
              <span key={bb.key ?? i} className="text-[10px] px-1 py-0.5 rounded bg-archive-border text-archive-dust">
                {bb.key}={bb.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
