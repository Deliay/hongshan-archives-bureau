import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import type { TableDiffComponentProps } from './registry'

function lt(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
  return ((obj as Record<string, string>)[locale] || (obj as Record<string, string>).CN || '')
}

export default function CharGrowthDiff({ diff }: TableDiffComponentProps) {
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
    <div className="space-y-3">
      {keys.map((charId) => {
        const e = entries[charId]
        return (
          <details key={charId} className="border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono">
              {charId} {lt(e.name, locale) && <span className="text-archive-dust ml-2">「{lt(e.name, locale)}」</span>}
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border space-y-3 mt-2">
              {e.charBreakCostMap && <BreakCostMap data={e.charBreakCostMap} locale={locale} />}
              {e.skillGroupMap && <SkillGroupMap data={e.skillGroupMap} locale={locale} />}
              {e.talentNodeMap && <TalentNodeMap data={e.talentNodeMap} locale={locale} />}
              {e.skillLevelUp && (
                <div>
                  <div className="text-xs text-archive-dust mb-1">技能升级（{e.skillLevelUp.length} 条）</div>
                  <div className="text-xs text-archive-lead">展开查看详细 JSON</div>
                </div>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ChangedCards({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>
  return (
    <div className="space-y-3">
      {keys.map((charId) => {
        const e = entries[charId]
        return (
          <details key={charId} className="border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono">
              {charId}
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

function BreakCostMap({ data, locale }: { data: Record<string, any>; locale: string }) {
  const entries = Object.entries(data)
  return (
    <div>
      <div className="text-xs text-archive-dust mb-1">突破消耗（{entries.length} 阶）</div>
      <div className="space-y-1">
        {entries.map(([key, node]) => (
          <div key={key} className="text-xs px-2 py-1 rounded bg-archive-ink">
            <span className="text-archive-gold font-mono">{node.nodeId}</span>
            <span className="text-archive-dust ml-2">Lv.{node.breakStage}</span>
            <span className="text-archive-ivory ml-2">{lt(node.name, locale) || lt(node.description, locale)}</span>
            {node.requiredItem?.length > 0 && (
              <span className="text-archive-lead ml-2">素材 {node.requiredItem.length} 种</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillGroupMap({ data, locale }: { data: Record<string, any>; locale: string }) {
  const entries = Object.entries(data)
  return (
    <div>
      <div className="text-xs text-archive-dust mb-1">技能组（{entries.length}）</div>
      <div className="space-y-1">
        {entries.map(([key, sg]) => (
          <div key={key} className="text-xs px-2 py-1 rounded bg-archive-ink">
            <span className="text-archive-gold font-mono">{sg.skillGroupId}</span>
            <span className="text-archive-ivory ml-2">{lt(sg.name, locale)}</span>
            <span className="text-archive-lead ml-2">{sg.skillIdList?.length || 0} 个技能</span>
            {sg.desc && <div className="text-archive-dust mt-0.5">{lt(sg.desc, locale)}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TalentNodeMap({ data, locale }: { data: Record<string, any>; locale: string }) {
  const entries = Object.entries(data)
  return (
    <div>
      <div className="text-xs text-archive-dust mb-1">天赋节点（{entries.length}）</div>
      <div className="space-y-1">
        {entries.map(([key, tn]) => {
          const psi = tn.passiveSkillNodeInfo
          return (
            <div key={key} className="text-xs px-2 py-1 rounded bg-archive-ink">
              <span className="text-archive-gold font-mono">{tn.nodeId}</span>
              <span className="text-archive-dust ml-2">阶段 {tn.nodeType}</span>
              {psi && <span className="text-archive-ivory ml-2">{lt(psi.name, locale)}</span>}
              {tn.requiredItem?.length > 0 && (
                <span className="text-archive-lead ml-2">素材 {tn.requiredItem.length} 种</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
