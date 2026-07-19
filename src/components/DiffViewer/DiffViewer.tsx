import { useState } from 'react'
import type { FieldChange, ChangedEntry, TableDiff } from '../../lib/types-diff'

const LOCALE_CODES = new Set(['CN', 'EN', 'JP', 'KR', 'RU', 'BR', 'DE', 'FR', 'ID', 'IT', 'MX', 'TC', 'TH', 'VN'])

const LOCALE_LABELS: Record<string, string> = {
  CN: '简中', TC: '繁中', EN: 'English', JP: '日本語',
  KR: '한국어', RU: 'Русский', BR: 'Português', DE: 'Deutsch',
  FR: 'Français', ID: 'Bahasa', IT: 'Italiano', MX: 'Español',
  TH: 'ไทย', VN: 'Tiếng Việt',
}

function isLocaleObj(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const keys = Object.keys(v)
  if (keys.length === 0) return false
  return keys.every((k) => LOCALE_CODES.has(k))
}

interface DiffViewerProps {
  diff: TableDiff
  renderKey?: (key: string, entry: any) => string
}

export default function DiffViewer({ diff, renderKey }: DiffViewerProps) {
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>('changed')
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

      {tab === 'added' && <EntryList entries={entries.added} empty="无新增条目" renderKey={renderKey} />}
      {tab === 'removed' && <EntryList entries={entries.removed} empty="无移除条目" renderKey={renderKey} />}
      {tab === 'changed' && <ChangedEntryList entries={entries.changed} renderKey={renderKey} />}
    </div>
  )
}

function EntryList({ entries, empty, renderKey }: {
  entries: Record<string, any>
  empty: string
  renderKey?: (key: string, entry: any) => string
}) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">{empty}</p>

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const entry = entries[key]
        const label = renderKey ? renderKey(key, entry) : key
        return (
          <details key={key} className="group border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono truncate">
              {label}
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border overflow-x-auto">
              <pre className="text-xs text-archive-dust mt-2 leading-relaxed whitespace-pre-wrap">
                {formatJSON(entry, '')}
              </pre>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ChangedEntryList({ entries, renderKey }: {
  entries: Record<string, ChangedEntry>
  renderKey?: (key: string, entry: ChangedEntry) => string
}) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">无变更条目</p>

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const entry = entries[key]
        const label = renderKey ? renderKey(key, entry) : key
        return (
          <details key={key} className="group border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 text-sm text-archive-ivory cursor-pointer hover:text-archive-gold transition-colors font-mono truncate">
              {label}
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border">
              <div className="mt-2 space-y-1">
                {Object.entries(entry.changed).map(([path, change]) => (
                  <FieldChangeRow key={path} path={path} change={change} />
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function FieldChangeRow({ path, change }: { path: string; change: FieldChange }) {
  return (
    <div className="text-xs border-b border-archive-border/50 pb-1 last:border-0">
      <div className="text-archive-dust font-mono mb-0.5">{path}</div>
      {change.type === 'value' ? (
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[archive-seal]">旧</span>
            <span className="ml-1 text-archive-ivory whitespace-pre-wrap break-all">{formatValue(change.oldValue)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[archive-bronze]">新</span>
            <span className="ml-1 text-archive-ivory whitespace-pre-wrap break-all">{formatValue(change.newValue)}</span>
          </div>
        </div>
      ) : (
        <div className="text-archive-ivory">
          {Object.entries(change.changedLocales).map(([locale, { oldText, newText }]) => (
            <div key={locale} className="mb-1 last:mb-0">
              <span className="text-archive-gold font-mono">{LOCALE_LABELS[locale] || locale}</span>
              <span className="mx-1 text-archive-lead">旧</span>
              <span className="text-[archive-seal]">{oldText || '（空）'}</span>
              <span className="mx-1 text-archive-lead">→</span>
              <span className="text-[archive-bronze]">{newText || '（空）'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '（空）'
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 0)
}

function formatJSON(obj: unknown, indent: string): string {
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'string') return `"${obj}"`
  if (typeof obj !== 'object') return String(obj)
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return `[\n${obj.map(i => `${indent}  ${formatJSON(i, indent + '  ')}`).join(',\n')}\n${indent}]`
  }
  if (isLocaleObj(obj)) {
    const lines = Object.entries(obj).map(([k, v]) => {
      const label = LOCALE_LABELS[k] || k
      return `${indent}  ${label}: "${v}"`
    })
    return `{\n${lines.join(',\n')}\n${indent}}`
  }
  const entries = Object.entries(obj as Record<string, unknown>)
  if (entries.length === 0) return '{}'
  return `{\n${entries.map(([k, v]) => `${indent}  "${k}": ${formatJSON(v, indent + '  ')}`).join(',\n')}\n${indent}}`
}
