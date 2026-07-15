import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import type { TableDiffComponentProps } from './registry'
import type { FieldChange, ChangedEntry } from '../../lib/types-diff'

const RARITY_COLORS = ['#6b7280', '#6b7280', '#6b7280', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

interface LookupMaps {
  professions: Record<number, { name: string; icon: string }>
  elements: Record<string, { name: string; color: string; icon: string }>
  battleTags: Record<string, string>
  attributes: Record<number, { name: string; icon: string }>
  i18n: Record<string, string>
  locale: string
}

export default function CharacterDiff({ diff }: TableDiffComponentProps) {
  const locale = diff.locale || 'CN'
  const [maps, setMaps] = useState<LookupMaps | null>(null)
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>('changed')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [profRaw, profI18n, elemRaw, elemI18n, tagRaw, tagI18n, attrMetaVal, attrShowVal, attrI18n, i18nRaw] = await Promise.all([
        getCachedData<Record<string, any>>('CharProfessionTable', () => fetchTableAll('CharProfessionTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>('I18nDict_CN_CharProfessionTable', () => fetchTableDictAll('CharProfessionTable', 'CN')).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('CharTypeTable', () => fetchTableAll('CharTypeTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>('I18nDict_CN_CharTypeTable', () => fetchTableDictAll('CharTypeTable', 'CN')).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('CharBattleTagTable', () => fetchTableAll('CharBattleTagTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>('I18nDict_CN_CharBattleTagTable', () => fetchTableDictAll('CharBattleTagTable', 'CN')).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>('I18nDict_CN_AttributeShowConfigTable', () => fetchTableDictAll('AttributeShowConfigTable', 'CN')).catch(() => ({} as Record<string, string>)),
        getTableI18nDict('I18nTextTable', locale).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return

      const professions: Record<number, { name: string; icon: string }> = {}
      for (const [, v] of Object.entries<any>(profRaw)) {
        const id = Number(v.profession ?? v.$key ?? 0)
        professions[id] = {
          name: resolveI18n(v.name, profI18n) || `职业${id}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charprofessionicon/${v.iconId}.png`,
        }
      }

      const elements: Record<string, { name: string; color: string; icon: string }> = {}
      for (const [k, v] of Object.entries<any>(elemRaw)) {
        elements[k] = {
          name: resolveI18n(v.name, elemI18n) || k,
          color: v.color ? `#${v.color.replace('#', '')}` : '#888',
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/elementicon/${v.icon}.png`,
        }
      }

      const battleTags: Record<string, string> = {}
      for (const [k, v] of Object.entries<any>(tagRaw)) {
        battleTags[k] = resolveI18n(v, tagI18n) || k
      }

      const attributes: Record<number, { name: string; icon: string }> = {}
      for (const [k, v] of Object.entries<any>(attrMetaVal)) {
        const attrType = Number(k)
        const configItem = attrShowVal[k]?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        attributes[attrType] = {
          name: (nameId && attrI18n[nameId]) || v.iconName?.replace('icon_attribute_', '') || `属性${k}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/attributeicon/${v.iconName}.png`,
        }
      }

      setMaps({ professions, elements, battleTags, attributes, i18n: i18nRaw, locale })
    }
    load()
    return () => { cancelled = true }
  }, [locale])

  const { stats, entries } = diff

  const tabs = (
    [
      { id: 'added' as const, label: '新增干员', count: stats.added },
      { id: 'removed' as const, label: '移除干员', count: stats.removed },
      { id: 'changed' as const, label: '变更干员', count: stats.changed },
    ] as const
  ).filter((t) => t.count > 0)

  if (!maps) {
    return <div className="text-sm text-[#5A5A62]">加载对照表…</div>
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-[#2A2A32]">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#C9A96E] text-[#C9A96E]'
                : 'border-transparent text-[#8B8982] hover:text-[#E8E6E3]'
            }`}
          >
            {t.label}（{t.count}）
          </button>
        ))}
      </div>

      {tab === 'added' && <EntryCards entries={entries.added} maps={maps} />}
      {tab === 'removed' && <EntryCards entries={entries.removed} maps={maps} />}
      {tab === 'changed' && <ChangedCards entries={entries.changed} maps={maps} locale={locale} />}
    </div>
  )
}

function EntryCards({ entries, maps }: { entries: Record<string, any>; maps: LookupMaps }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-2">
      {keys.map((key) => (
        <OpCard key={key} charId={key} entry={entries[key]} maps={maps} />
      ))}
    </div>
  )
}

function ChangedCards({ entries, maps, locale }: { entries: Record<string, ChangedEntry>; maps: LookupMaps; locale: string }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-[#5A5A62]">无</p>
  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const e = entries[key]
        return (
          <details key={key} className="group border border-[#2A2A32] rounded bg-[#1A1B23]">
            <summary className="px-3 py-2 cursor-pointer hover:text-[#C9A96E] transition-colors">
              <span className="font-mono text-sm text-[#E8E6E3]">{key}</span>
              <span className="ml-2 text-sm text-[#8B8982]">「{resolveEntryName(e.newValue, locale, maps.i18n) || key}」</span>
            </summary>
            <div className="px-3 pb-3 border-t border-[#2A2A32]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="border border-[#2A2A32] rounded">
                  <div className="text-xs text-[#ef4444] px-2 py-1 border-b border-[#2A2A32] font-medium">旧版本</div>
                  <OpCard charId={key} entry={e.oldValue} maps={maps} compact />
                </div>
                <div className="border border-[#2A2A32] rounded">
                  <div className="text-xs text-[#26bbfd] px-2 py-1 border-b border-[#2A2A32] font-medium">新版本</div>
                  <OpCard charId={key} entry={e.newValue} maps={maps} compact />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-[#8B8982] mb-1 font-medium">变更字段</div>
                {Object.entries(e.changed).map(([path, change]) => (
                  <FieldDiff key={path} path={path} change={change} maps={maps} />
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function OpCard({ charId, entry, maps, compact }: { charId: string; entry: any; maps: LookupMaps; compact?: boolean }) {
  const name = resolveFieldText(entry?.name, maps.locale, maps.i18n) || charId
  const rarity = entry?.rarity ?? 0
  const profId: number = entry?.profession ?? 0
  const prof = maps.professions[profId]
  const charType: string = entry?.charTypeId ?? ''
  const elem = maps.elements[charType]
  const mainAttrType: number = entry?.mainAttrType ?? 0
  const subAttrType: number = entry?.subAttrType ?? 0
  const mainAttr = maps.attributes[mainAttrType]
  const subAttr = maps.attributes[subAttrType]
  const tags: string[] = entry?.charBattleTagIds ?? []

  return (
    <div className="p-3">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
          <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`}
            alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-[#E8E6E3]">{name}</div>
              <div className="text-xs text-[#5A5A62] font-mono mt-0.5">{charId}</div>
            </div>
            <StarRating level={rarity} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {prof && <span className="text-xs px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{prof.name}</span>}
            {elem && <span className="text-xs px-1.5 py-0.5 rounded bg-[#2A2A32]" style={{ color: elem.color }}>{elem.name}</span>}
            {mainAttr && <span className="text-xs text-[#8B8982]">主{mainAttr.name}</span>}
            {subAttr && <span className="text-xs text-[#8B8982]">副{subAttr.name}</span>}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#5A5A62]">
                  {maps.battleTags[t] || t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 space-y-2 border-t border-[#2A2A32] pt-2">
          <Section title="档案记录" items={entry?.profileRecord} renderItem={(r: any) => (
            <div>
              <div className="text-[#8B8982] text-[10px]">{resolveFieldText(r.recordTitle, maps.locale, maps.i18n)}</div>
              <div className="text-[#E8E6E3] text-xs mt-0.5 whitespace-pre-wrap line-clamp-3">
                {resolveFieldText(r.recordDesc, maps.locale, maps.i18n)}
              </div>
            </div>
          )} itemKey={(r: any) => r.id || r.recordID} />
          <Section title="语音" items={entry?.profileVoice} renderItem={(v: any) => (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-[#5A5A62] font-mono shrink-0 mt-0.5">#{v.voiceIndex}</span>
              <div>
                <div className="text-[#8B8982] text-[10px]">{resolveFieldText(v.voiceTitle, maps.locale, maps.i18n)}</div>
                <div className="text-[#E8E6E3] text-xs">{resolveFieldText(v.voiceDesc, maps.locale, maps.i18n)}</div>
              </div>
            </div>
          )} itemKey={(v: any) => v.id || v.voiceIndex} />
        </div>
      )}
    </div>
  )
}

function StarRating({ level }: { level: number }) {
  const color = RARITY_COLORS[level] || '#6b7280'
  return <span className="inline-flex gap-0.5 text-xs" style={{ color }}>{'★'.repeat(Math.min(level, 6))}</span>
}

function Section({ title, items, renderItem, itemKey }: { title: string; items: any[]; renderItem: (item: any) => React.ReactNode; itemKey?: (item: any) => string | number }) {
  if (!items || items.length === 0) return null
  return (
    <details className="group">
      <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">
        {title}（{items.length}）
      </summary>
      <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
        {items.map((item, i) => (
          <div key={itemKey ? itemKey(item) : i} className="px-2 py-1 rounded bg-[#0F0F12]">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </details>
  )
}

function FieldDiff({ path, change, maps }: { path: string; change: FieldChange; maps: LookupMaps }) {
  return (
    <div className="text-xs border-b border-[#2A2A32]/50 pb-1.5 last:border-0">
      <div className="text-[#8B8982] font-mono mb-0.5">{path}</div>
      {change.type === 'value' ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[#ef4444]">旧 </span>
            <span className="text-[#E8E6E3]">{formatFieldValue(change.oldValue, maps)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[#26bbfd]">新 </span>
            <span className="text-[#E8E6E3]">{formatFieldValue(change.newValue, maps)}</span>
          </div>
        </div>
      ) : (
        <div>
          {Object.entries(change.changedLocales).map(([loc, { oldText, newText }]) => (
            <div key={loc} className="mb-0.5 last:mb-0">
              <span className="text-[#C9A96E] font-mono">{LOCALE_LABELS[loc] || loc}</span>
              <span className="mx-1 text-[#5A5A62]">旧</span>
              <span className="text-[#ef4444]">{oldText || '（空）'}</span>
              <span className="mx-1 text-[#5A5A62]">→</span>
              <span className="text-[#26bbfd]">{newText || '（空）'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const LOCALE_LABELS: Record<string, string> = {
  CN: '简中', TC: '繁中', EN: 'English', JP: '日本語',
  KR: '한국어', RU: 'Русский', BR: 'Português', DE: 'Deutsch',
  FR: 'Français', ID: 'Bahasa', IT: 'Italiano', MX: 'Español',
  TH: 'ไทย', VN: 'Tiếng Việt',
}

function formatFieldValue(v: unknown, maps: LookupMaps): string {
  if (v === undefined || v === null) return '（空）'
  if (typeof v === 'object' && !Array.isArray(v)) {
    const resolved = resolveFieldText(v, maps.locale, maps.i18n)
    if (resolved) return resolved
    return JSON.stringify(v)
  }
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

function resolveFieldText(field: any, locale: string, i18nDict?: Record<string, string>): string {
  if (field === undefined || field === null) return ''
  if (typeof field !== 'object') return String(field)
  if ('id' in field) {
    return resolveI18n(field, i18nDict)
  }
  const obj = field as Record<string, string>
  return obj[locale] || obj.CN || ''
}

function resolveEntryName(entry: any, locale: string, i18n: Record<string, string>): string {
  if (!entry) return ''
  const name = entry.name
  if (!name) return ''
  return resolveFieldText(name, locale, i18n) || name.text || ''
}

async function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  return getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale))
}
