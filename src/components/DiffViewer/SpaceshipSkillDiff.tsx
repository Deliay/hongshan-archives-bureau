import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import type { TableDiffComponentProps } from './registry'

function lt(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
  return ((obj as Record<string, string>)[locale] || (obj as Record<string, string>).CN || '')
}

export default function SpaceshipSkillDiff({ diff }: TableDiffComponentProps) {
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
      <div className="flex gap-1 mb-4 border-b border-[#2A2A32]">
        {tabs.map((t) => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#8B8982] hover:text-[#E8E6E3]'}`}
          >{t.label}（{t.count}）</button>
        ))}
      </div>

      {tab === 'added' && <EntryCards entries={entries.added} locale={locale} />}
      {tab === 'removed' && <EntryCards entries={entries.removed} locale={locale} />}
      {tab === 'changed' && <ChangedCards entries={entries.changed} locale={locale} />}
    </div>
  )
}

function EntryCards({ entries, locale }: { entries: Record<string, any>; locale: string }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-2">
      {keys.map((id) => {
        const e = entries[id]
        return (
          <div key={id} className="border border-[#2A2A32] rounded bg-[#1A1B23] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm text-[#E8E6E3] font-mono">{id}</span>
                {lt(e.name, locale) && <span className="text-sm text-[#8B8982] ml-2">「{lt(e.name, locale)}」</span>}
              </div>
              <span className="text-xs text-[#5A5A62] shrink-0">Lv.{e.level ?? '?'}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-[#5A5A62]">
              {e.effectType && <span>类型 {e.effectType}</span>}
              {e.roomType && <span>房间 {e.roomType}</span>}
              {e.icon && <span>{e.icon}</span>}
            </div>
            {lt(e.talentName, locale) && (
              <div className="text-xs text-[#C9A96E] mt-1">{lt(e.talentName, locale)}</div>
            )}
            {lt(e.desc, locale) && (
              <div className="text-xs text-[#E8E6E3] mt-0.5">{lt(e.desc, locale)}</div>
            )}
            {e.parameters && e.parameters.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {e.parameters.map((p: any, i: number) => (
                  <span key={`${p}-${i}`} className="text-[10px] px-1 py-0.5 rounded bg-[#2A2A32] text-[#5A5A62]">{p}</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChangedCards({ entries, locale }: { entries: Record<string, any>; locale: string }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-2">
      {keys.map((id) => {
        const e = entries[id]
        const oldName = lt(e.oldValue?.name, locale)
        const newName = lt(e.newValue?.name, locale)
        return (
          <details key={id} className="border border-[#2A2A32] rounded bg-[#1A1B23]">
            <summary className="px-3 py-2 text-sm text-[#E8E6E3] cursor-pointer hover:text-[#C9A96E] transition-colors font-mono">
              {id}
              {(oldName || newName) && (
                <span className="text-[#8B8982] ml-2">
                  「{oldName}」{oldName !== newName && <span> → 「{newName}」</span>}
                </span>
              )}
            </summary>
            <div className="px-3 pb-3 border-t border-[#2A2A32]">
              <div className="mt-2 space-y-1">
                {Object.entries(e.changed).map(([path, change]: [string, any]) => (
                  <div key={path} className="text-xs border-b border-[#2A2A32]/50 pb-1">
                    <div className="text-[#8B8982] font-mono mb-0.5">{path}</div>
                    {change.type === 'value' ? (
                      <div className="flex gap-3">
                        <span className="text-[#ef4444]">旧 {JSON.stringify(change.oldValue)}</span>
                        <span className="text-[#26bbfd]">新 {JSON.stringify(change.newValue)}</span>
                      </div>
                    ) : (
                      Object.entries(change.changedLocales).map(([loc, { oldText, newText }]: [string, any]) => (
                        <div key={loc} className="mb-0.5 last:mb-0">
                          <span className="text-[#C9A96E] font-mono">{loc}</span>
                          <span className="mx-1 text-[#5A5A62]">旧</span>
                          <span className="text-[#ef4444]">{oldText || '（空）'}</span>
                          <span className="mx-1 text-[#5A5A62]">→</span>
                          <span className="text-[#26bbfd]">{newText || '（空）'}</span>
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
