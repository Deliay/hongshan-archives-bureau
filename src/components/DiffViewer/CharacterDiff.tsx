import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { useLocale } from '../../lib/locale'
import type { TableDiffComponentProps } from './registry'
import { RichTextDiff } from './RichTextDiff'
import { useI18n, translate } from '../../i18n'
import type { FieldChange, ChangedEntry } from '../../lib/types-diff'

import { rarityColor } from '../../data/constants'

interface LookupMaps {
  professions: Record<number, { name: string; icon: string }>
  elements: Record<string, { name: string; color: string; icon: string }>
  battleTags: Record<string, string>
  attributes: Record<number, { name: string; icon: string }>
  i18n: Record<string, string>
  locale: string
}

export default function CharacterDiff({ diff }: TableDiffComponentProps) {
  const { t } = useI18n()
  const diffLocale = diff.locale || 'CN'
  const { locale: globalLocale } = useLocale()
  const [maps, setMaps] = useState<LookupMaps | null>(null)
  const [tab, setTab] = useState<'added' | 'removed' | 'changed'>('changed')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [profRaw, profI18n, elemRaw, elemI18n, tagRaw, tagI18n, attrMetaVal, attrShowVal, attrI18n, i18nRaw] = await Promise.all([
        getCachedData<Record<string, any>>('CharProfessionTable', () => fetchTableAll('CharProfessionTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>(`I18nDict_${globalLocale}_CharProfessionTable`, () => fetchTableDictAll('CharProfessionTable', globalLocale)).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('CharTypeTable', () => fetchTableAll('CharTypeTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>(`I18nDict_${globalLocale}_CharTypeTable`, () => fetchTableDictAll('CharTypeTable', globalLocale)).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('CharBattleTagTable', () => fetchTableAll('CharBattleTagTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>(`I18nDict_${globalLocale}_CharBattleTagTable`, () => fetchTableDictAll('CharBattleTagTable', globalLocale)).catch(() => ({} as Record<string, string>)),
        getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')).catch(() => ({} as Record<string, any>)),
        getCachedData<Record<string, string>>(`I18nDict_${globalLocale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', globalLocale)).catch(() => ({} as Record<string, string>)),
        getTableI18nDict('I18nTextTable', diffLocale).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return

      const professions: Record<number, { name: string; icon: string }> = {}
      for (const [, v] of Object.entries<any>(profRaw)) {
        const id = Number(v.profession ?? v.$key ?? 0)
        professions[id] = {
          name: resolveI18n(v.name, profI18n) || `${translate(globalLocale, 'common.unknown')} ${id}`,
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
          name: (nameId && attrI18n[nameId]) || v.iconName?.replace('icon_attribute_', '') || `${translate(globalLocale, 'common.unknown')} ${k}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/attributeicon/${v.iconName}.png`,
        }
      }

      setMaps({ professions, elements, battleTags, attributes, i18n: i18nRaw, locale: diffLocale })
    }
    load()
    return () => { cancelled = true }
  }, [globalLocale, diffLocale])

  const { stats, entries } = diff

  const tabs = (
    [
      { id: 'added' as const, label: t('diff.addedOperators'), count: stats.added },
      { id: 'removed' as const, label: t('diff.removedOperators'), count: stats.removed },
      { id: 'changed' as const, label: t('diff.changedOperators'), count: stats.changed },
    ] as const
  ).filter((t) => t.count > 0)

  if (!maps) {
    return <div className="text-sm text-archive-lead">{t('diff.loadingLookup')}</div>
  }

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

      {tab === 'added' && <EntryCards entries={entries.added} maps={maps} />}
      {tab === 'removed' && <EntryCards entries={entries.removed} maps={maps} />}
      {tab === 'changed' && <ChangedCards entries={entries.changed} maps={maps} locale={diffLocale} />}
    </div>
  )
}

function EntryCards({ entries, maps }: { entries: Record<string, any>; maps: LookupMaps }) {
  const keys = Object.keys(entries)
  if (keys.length === 0) return <p className="text-sm text-archive-lead">{translate(maps.locale, 'common.empty')}</p>
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
  if (keys.length === 0) return <p className="text-sm text-archive-lead">{translate(maps.locale, 'common.empty')}</p>
  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const e = entries[key]
        const changedEntries = Object.entries(e.changed)

        const voiceGroups: Map<string, { index: string; changes: [string, FieldChange][] }> = new Map()
        const otherChanges: [string, FieldChange][] = []
        for (const [path, change] of changedEntries) {
          const m = path.match(/^(profileVoice)\[(\d+)]\.(.+)$/)
          if (m) {
            const idx = m[2]
            if (!voiceGroups.has(idx)) voiceGroups.set(idx, { index: idx, changes: [] })
            voiceGroups.get(idx)!.changes.push([path, change])
          } else {
            otherChanges.push([path, change])
          }
        }

        return (
          <details key={key} className="group border border-archive-border rounded bg-archive-file">
            <summary className="px-3 py-2 cursor-pointer hover:text-archive-gold transition-colors">
              <span className="font-mono text-sm text-archive-ivory">{key}</span>
              <span className="ml-2 text-sm text-archive-dust">「{resolveEntryName(e.newValue, locale, maps.i18n) || key}」</span>
            </summary>
            <div className="px-3 pb-3 border-t border-archive-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="border border-archive-border rounded">
                  <div className="text-xs text-[archive-seal] px-2 py-1 border-b border-archive-border font-medium">{translate(maps.locale, 'diff.oldVersion')}</div>
                  <OpCard charId={key} entry={e.oldValue} maps={maps} compact />
                </div>
                <div className="border border-archive-border rounded">
                  <div className="text-xs text-[archive-bronze] px-2 py-1 border-b border-archive-border font-medium">{translate(maps.locale, 'diff.newVersion')}</div>
                  <OpCard charId={key} entry={e.newValue} maps={maps} compact />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-archive-dust mb-1 font-medium">{translate(maps.locale, 'diff.changedFields')}</div>
                {Array.from(voiceGroups.values()).map(({ index, changes }) => {
                  const voice = e.newValue?.profileVoice?.[Number(index)]
                  const title = resolveFieldText(voice?.voiceTitle, maps.locale, maps.i18n) || `${translate(maps.locale, 'common.unknown')} ${index}`
                  const desc = resolveFieldText(voice?.voiceDesc, maps.locale, maps.i18n)
                  return (
                    <div key={index} className="mb-2">
                      <div className="text-xs text-archive-gold font-medium mb-1">#{index} {title}</div>
                      {desc && <div className="text-[10px] text-archive-dust mb-1">{desc}</div>}
                      {changes.map(([path, change]) => (
                        <FieldDiff key={path} path={path} change={change} maps={maps} entry={e.newValue} />
                      ))}
                    </div>
                  )
                })}
                {otherChanges.map(([path, change]) => (
                  <FieldDiff key={path} path={path} change={change} maps={maps} entry={e.newValue} />
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
        <div className="w-14 h-14 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
          <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`}
            alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-archive-ivory">{name}</div>
              <div className="text-xs text-archive-lead font-mono mt-0.5">{charId}</div>
            </div>
            <StarRating level={rarity} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {prof && <span className="text-xs px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">{prof.name}</span>}
            {elem && <span className="text-xs px-1.5 py-0.5 rounded bg-archive-border" style={{ color: elem.color }}>{elem.name}</span>}
            {mainAttr && <span className="text-xs text-archive-dust">{translate(maps.locale, 'operator.mainAttr')} {mainAttr.name}</span>}
            {subAttr && <span className="text-xs text-archive-dust">{translate(maps.locale, 'operator.subAttr')} {subAttr.name}</span>}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-lead">
                  {maps.battleTags[t] || t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 space-y-2 border-t border-archive-border pt-2">
          <Section title={translate(maps.locale, 'operator.profileRecords')} items={entry?.profileRecord} renderItem={(r: any) => (
            <div>
              <div className="text-archive-dust text-[10px]">{resolveFieldText(r.recordTitle, maps.locale, maps.i18n)}</div>
              <div className="text-archive-ivory text-xs mt-0.5 whitespace-pre-wrap line-clamp-3">
                {resolveFieldText(r.recordDesc, maps.locale, maps.i18n)}
              </div>
            </div>
          )} itemKey={(r: any) => r.id || r.recordID} />
          <Section title={translate(maps.locale, 'operator.voiceRecords')} items={entry?.profileVoice} renderItem={(v: any) => (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-archive-lead font-mono shrink-0 mt-0.5">#{v.voiceIndex}</span>
              <div>
                <div className="text-archive-dust text-[10px]">{resolveFieldText(v.voiceTitle, maps.locale, maps.i18n)}</div>
                <div className="text-archive-ivory text-xs">{resolveFieldText(v.voiceDesc, maps.locale, maps.i18n)}</div>
              </div>
            </div>
          )} itemKey={(v: any) => v.id || v.voiceIndex} />
        </div>
      )}
    </div>
  )
}

function StarRating({ level }: { level: number }) {
  const color = rarityColor(level)
  return <span className="inline-flex gap-0.5 text-xs" style={{ color }}>{'★'.repeat(Math.min(level, 6))}</span>
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

function renderUnlockInfo(unlockType: number, unlockValue: number, locale: string): string {
  if (unlockType === 0) return translate(locale, 'operator.unlock.initial')
  if (unlockType === 2) return translate(locale, 'operator.unlock.elite', { level: unlockValue })
  if (unlockType === 4) return translate(locale, 'operator.unlock.trust', { value: unlockValue })
  return ''
}

function findRelatedUnlockType(path: string, entry: any): number {
  const m = path.match(/^(profileVoice|profileRecord)\[(\d+)]\./)
  if (!m || !entry) return 0
  const [, field, idx] = m
  const obj = entry[field]?.[Number(idx)]
  return obj?.unlockType ?? 0
}

function FieldDiff({ path, change, maps, entry }: { path: string; change: FieldChange; maps: LookupMaps; entry?: any }) {
  const format = (v: unknown) => {
    if (typeof v === 'number' && path.endsWith('unlockType')) {
      if (v === 0) return translate(maps.locale, 'operator.unlock.initial')
      if (v === 2) return translate(maps.locale, 'operator.unlock.elite', { level: v })
      if (v === 4) return translate(maps.locale, 'operator.unlock.trust', { value: v })
      return ''
    }
    if (typeof v === 'number' && path.endsWith('unlockValue')) {
      const unlockType = findRelatedUnlockType(path, entry)
      return renderUnlockInfo(unlockType, v, maps.locale) || formatFieldValue(v, maps)
    }
    return formatFieldValue(v, maps)
  }
  return (
    <div className="text-xs border-b border-archive-border/50 pb-1.5 last:border-0">
      <div className="text-archive-dust font-mono mb-0.5">{path}</div>
      {change.type === 'value' ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[archive-seal]">{translate(maps.locale, 'diff.old')} </span>
            <span className="text-archive-ivory">{format(change.oldValue)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[archive-bronze]">{translate(maps.locale, 'diff.new')} </span>
            <span className="text-archive-ivory">{format(change.newValue)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {Object.entries(change.changedLocales).map(([loc, { oldText, newText }]) => (
            <div key={loc}>
              <span className="text-archive-gold font-mono text-[10px]">{LOCALE_LABELS[loc] || loc}</span>
              <RichTextDiff oldText={oldText || ''} newText={newText || ''} />
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
  if (v === undefined || v === null) return translate(maps.locale, 'diff.empty')
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
