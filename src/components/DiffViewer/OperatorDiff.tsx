import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE } from '../../lib/adapter'
import type { TableDiffComponentProps } from './registry'
import type { FieldChange, ChangedEntry } from '../../lib/types-diff'

const RARITY_COLORS = ['#6b7280', '#6b7280', '#6b7280', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

const PROFESSION_NAMES: Record<number, string> = {
  1: '先锋', 2: '近卫', 3: '重装', 4: '狙击',
  5: '术士', 6: '辅助', 7: '特种', 8: '医疗',
}

function localeText(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
  const dict = obj as Record<string, string>
  return dict[locale] || dict.CN || ''
}

function StarRating({ level }: { level: number }) {
  const color = RARITY_COLORS[level] || '#6b7280'
  return (
    <span className="inline-flex gap-0.5" title={`稀有度 ${level}`} style={{ color }}>
      {'✦'.repeat(level)}
    </span>
  )
}

export default function OperatorDiff({ diff }: TableDiffComponentProps) {
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>(
    diff.stats.changed > 0 ? 'changed' : diff.stats.added > 0 ? 'added' : 'removed',
  )
  const { stats, entries } = diff

  const tabs = (
    [
      { id: 'added' as const, label: '新增干员', count: stats.added },
      { id: 'removed' as const, label: '移除干员', count: stats.removed },
      { id: 'changed' as const, label: '变更干员', count: stats.changed },
    ] as const
  ).filter((t) => t.count > 0)

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-archive-border">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'border-archive-gold text-archive-gold'
                : 'border-transparent text-archive-dust hover:text-archive-ivory'
            }`}
          >
            {t.label}（{t.count}）
          </button>
        ))}
      </div>

      {tab === 'added' && <AddedRemovedList entries={entries.added} />}
      {tab === 'removed' && <AddedRemovedList entries={entries.removed} />}
      {tab === 'changed' && <ChangedList entries={entries.changed} />}
    </div>
  )
}

function AddedRemovedList({ entries }: { entries: Record<string, any> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <OperatorCard key={key} charId={key} entry={entries[key]} />
      ))}
    </div>
  )
}

function ChangedList({ entries }: { entries: Record<string, ChangedEntry> }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无</p>

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const e = entries[key]
        return (
          <details key={key} className="group border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 cursor-pointer hover:text-archive-gold transition-colors">
              <ChangedHeader charId={key} oldVal={e.oldValue} newVal={e.newValue} />
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="border border-archive-border rounded">
                  <div className="text-xs text-[#ef4444] px-2 py-1 border-b border-archive-border font-medium">旧版本</div>
                  <OperatorCard charId={key} entry={e.oldValue} compact />
                </div>
                <div className="border border-archive-border rounded">
                  <div className="text-xs text-[#26bbfd] px-2 py-1 border-b border-archive-border font-medium">新版本</div>
                  <OperatorCard charId={key} entry={e.newValue} compact />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-archive-dust mb-1 font-medium">变更字段</div>
                {Object.entries(e.changed).map(([path, change]) => (
                  <FieldDiff key={path} path={path} change={change} />
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ChangedHeader({ charId, oldVal, newVal }: { charId: string; oldVal: any; newVal: any }) {
  const { locale } = useLocale()
  const oldName = localeText(oldVal?.name, locale) || charId
  const newName = localeText(newVal?.name, locale) || charId
  const oldRarity = oldVal?.rarity ?? 0
  const newRarity = newVal?.rarity ?? 0
  return (
    <span className="font-mono text-sm text-archive-ivory">
      {charId}
      {oldName !== newName
        ? <span className="ml-2">「{oldName} → {newName}」</span>
        : <span className="ml-2 text-archive-dust">「{oldName}」</span>
      }
      {oldRarity !== newRarity && (
        <span className="ml-2 text-xs">
          <StarRating level={oldRarity} /> → <StarRating level={newRarity} />
        </span>
      )}
    </span>
  )
}

function OperatorCard({ charId, entry, compact }: { charId: string; entry: any; compact?: boolean }) {
  const { locale } = useLocale()
  const name = localeText(entry?.name, locale) || charId
  const rarity = entry?.rarity ?? 0
  const profession = entry?.profession as number | undefined
  const charTypeId = entry?.charTypeId ?? ''
  const mainAttr = entry?.mainAttrType ?? 0
  const subAttr = entry?.subAttrType ?? 0
  const tags: string[] = entry?.charBattleTagIds ?? []
  const portraitUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`

  return (
    <div className="border border-archive-border rounded bg-archive-file p-3">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
          <img
            src={portraitUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-archive-ivory">{name}</div>
              <div className="text-xs text-archive-lead font-mono mt-0.5">{charId}</div>
            </div>
            <div className="text-right shrink-0">
              <StarRating level={rarity} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {profession !== undefined && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                {PROFESSION_NAMES[profession] || `职业${profession}`}
              </span>
            )}
            {charTypeId && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                {charTypeId}
              </span>
            )}
            {mainAttr > 0 && (
              <span className="text-xs text-archive-dust">主{mainAttr}</span>
            )}
            {subAttr > 0 && (
              <span className="text-xs text-archive-dust">副{subAttr}</span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-lead">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 space-y-2 border-t border-archive-border pt-2">
          <Section title="档案记录" items={entry?.profileRecord} renderItem={(r: any) => (
            <div>
              <div className="text-archive-dust text-[10px]">{localeText(r.recordTitle, locale)}</div>
              <div className="text-archive-ivory text-xs mt-0.5 whitespace-pre-wrap line-clamp-3">
                {localeText(r.recordDesc, locale)}
              </div>
            </div>
          )} itemKey={(r: any) => r.id || r.recordID} />
          <Section title='语音' items={entry?.profileVoice} renderItem={(v: any) => (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-archive-lead font-mono shrink-0 mt-0.5">#{v.voiceIndex}</span>
              <div>
                <div className="text-archive-dust text-[10px]">{localeText(v.voiceTitle, locale)}</div>
                <div className="text-archive-ivory text-xs">{localeText(v.voiceDesc, locale)}</div>
              </div>
            </div>
          )} itemKey={(v: any) => v.id || v.voiceIndex} />
        </div>
      )}
    </div>
  )
}

function Section({ title, items, renderItem, itemKey }: { title: string; items: any[]; renderItem: (item: any) => React.ReactNode; itemKey?: (item: any) => string | number }) {
  if (!items || items.length === 0) return null
  return (
    <details className="group">
      <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">
        {title}（{items.length}）
      </summary>
      <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
        {items.map((item, i) => (
          <div key={itemKey ? itemKey(item) : i} className="px-2 py-1 rounded bg-archive-ink">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </details>
  )
}

function FieldDiff({ path, change }: { path: string; change: FieldChange }) {
  const { locale } = useLocale()
  return (
    <div className="text-xs border-b border-archive-border/50 pb-1.5 last:border-0">
      <div className="text-archive-dust font-mono mb-0.5">{path}</div>
      {change.type === 'value' ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[#ef4444]">旧 </span>
            <span className="text-archive-ivory">{formatFieldValue(change.oldValue, locale)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[#26bbfd]">新 </span>
            <span className="text-archive-ivory">{formatFieldValue(change.newValue, locale)}</span>
          </div>
        </div>
      ) : (
        <div>
          {Object.entries(change.changedLocales).map(([loc, { oldText, newText }]) => (
            <div key={loc} className="mb-0.5 last:mb-0">
              <span className="text-archive-gold font-mono">{loc}</span>
              <span className="mx-1 text-archive-lead">旧</span>
              <span className="text-[#ef4444]">{oldText || '（空）'}</span>
              <span className="mx-1 text-archive-lead">→</span>
              <span className="text-[#26bbfd]">{newText || '（空）'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatFieldValue(v: unknown, locale: string): string {
  if (v === undefined || v === null) return '（空）'
  if (typeof v === 'object' && !Array.isArray(v)) {
    const text = localeText(v, locale)
    if (text) return text
    return JSON.stringify(v)
  }
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}
