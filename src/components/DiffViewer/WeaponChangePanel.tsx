import { useState, useEffect } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useWeaponAggregatedDiff } from '../../hooks/useWeaponAggregatedDiff'
import type { WeaponChange } from '../../hooks/useWeaponAggregatedDiff'
import type { ChangedEntry } from '../../lib/types-diff'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'
import { RichTextDiff } from './RichTextDiff'
import { useI18n, translate } from '../../i18n'

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

const TABLE_COLORS: Record<string, string> = {
  WeaponBasicTable: '#5A7A6A',
  ItemTable: '#9452fa',
  SkillPatchTable: '#B89A6A',
}


function localeText(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return ''
  const dict = obj as Record<string, string>
  return dict[locale] || dict.CN || ''
}

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

function ChangeBadge({ label, color, count }: { label: string; color: string; count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono"
      style={{ backgroundColor: `${color}18`, color }}>
      {label}
      <span className="opacity-60">×{count}</span>
    </span>
  )
}

function renderObj(obj: any, locale: string, indent = ''): string {
  if (obj === null || obj === undefined) return `${indent}${translate(locale, 'diff.empty')}`
  if (Array.isArray(obj)) {
    if (obj.length === 0) return indent + '[]'
    return obj.map((_v, i) => `${indent}[${i}]: ${renderObj(_v, locale, indent + '  ')}`).join('\n')
  }
  if (typeof obj === 'object') {
    const text = 'text' in obj ? (obj.text || '') : ''
    const id = 'id' in obj ? String(obj.id) : ''
    if (id || text) return `${indent}${text ? `"${text}"` : ''}${id && text ? ' ' : ''}${id ? `(${id})` : ''}`.trim()
    const keys = Object.keys(obj)
    if (keys.length === 0) return indent + '{}'
    return keys.map(k => {
      const v = obj[k]
      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
        return `${indent}${k}:\n${renderObj(v, locale, indent + '  ')}`
      }
      return `${indent}${k}: ${renderObj(v, locale, '')}`.trim()
    }).join('\n')
  }
  return String(obj)
}

function formatDiffValue(v: unknown, locale: string): string {
  if (v === undefined || v === null) return translate(locale, 'diff.empty')
  if (typeof v === 'object' && !Array.isArray(v)) {
    const text = localeText(v, locale)
    if (text) return `"${text}"`
    if ('text' in (v as any) && (v as any).text) return `"${(v as any).text}"`
    return JSON.stringify(v)
  }
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

function renderChangeEntry(entry: any, op: string, locale: string, formatter?: (text: string) => string) {
  if (op === 'changed') {
    const e = entry as { oldValue?: Record<string, any>; newValue?: Record<string, any>; changed?: Record<string, any> }
    const changed = e.changed ?? {}
    const keys = Object.keys(changed)
    if (keys.length > 0) {
      return (
        <div className="space-y-1">
          {keys.map((path) => {
            const change = changed[path]
            if (change.type === 'value') {
              return (
                <div key={path} className="text-[10px]">
                  <span className="text-archive-lead font-mono">{path}</span>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[archive-seal]">{translate(locale, 'diff.old')} {formatDiffValue(change.oldValue, locale)}</span>
                    <span className="text-[archive-bronze]">{translate(locale, 'diff.new')} {formatDiffValue(change.newValue, locale)}</span>
                  </div>
                </div>
              )
            }
            return (
              <div key={path} className="text-[10px]">
                <span className="text-archive-lead font-mono">{path}</span>
                <div className="mt-0.5 space-y-0.5">
                  {Object.entries(change.changedLocales).map(([loc, val]) => {
                    const v = val as { oldText: string; newText: string }
                    return (
                      <div key={loc}>
                        <span className="text-archive-gold">{loc}</span>
                        <RichTextDiff oldText={v.oldText || ''} newText={v.newText || ''} formatter={formatter} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    return <div className="text-archive-dust text-[10px]">{translate(locale, 'diff.noDetail')}</div>
  }
  return <div className="text-archive-dust text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{renderObj(entry, locale)}</div>
}

function WeaponCard({ wp, locale }: { wp: WeaponChange; locale: string }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const isAdded = wp.changes.some(c => c.op === 'added' && c.tableName === 'WeaponBasicTable')
  const [weaponTypeMap, setWeaponTypeMap] = useState<Record<number, string>>({})
  const [fallbackItemData, setFallbackItemData] = useState<Record<string, any> | null>(null)
  const [fallbackBasicData, setFallbackBasicData] = useState<Record<string, any> | null>(null)
  const [itemI18n, setItemI18n] = useState<Record<string, string>>({})

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale))
      .then(d => setItemI18n(d)).catch(() => {})
  }, [locale])

  useEffect(() => {
    getCachedData<Record<string, any>>('TextTable', () => fetchTableAll('TextTable'))
      .then(raw => {
        getCachedData<Record<string, string>>(`I18nDict_${locale}_TextTable`, () => fetchTableDictAll('TextTable', locale))
          .then(i18n => {
            const map: Record<number, string> = {}
            for (let i = 1; i <= 6; i++) {
              if (i === 4) continue
              const key = `LUA_WEAPON_TYPE_${i}`
              const entry = raw[key]
              if (entry) {
                map[i] = resolveI18n(entry, i18n) || entry.text || `${translate(locale, 'common.unknown')} ${i}`
              }
            }
            setWeaponTypeMap(map)
          }).catch(() => {})
      }).catch(() => {})
  }, [locale])

  useEffect(() => {
    const hasItemEntry = wp.changes.some(c => c.tableName === 'ItemTable')
    if (hasItemEntry) return
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable'))
      .then(raw => {
        const key = Object.keys(raw).find(k => k === wp.weaponId)
        if (key) setFallbackItemData(raw[key])
      })
      .catch(() => {})
  }, [wp.weaponId, wp.changes])

  useEffect(() => {
    const hasBasicEntry = wp.changes.some(c => c.tableName === 'WeaponBasicTable')
    if (hasBasicEntry) return
    getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable'))
      .then(raw => {
        const key = Object.keys(raw).find(k => k === wp.weaponId)
        if (key) setFallbackBasicData(raw[key])
      })
      .catch(() => {})
  }, [wp.weaponId, wp.changes])

  const basicEntry = (() => {
    const c = wp.changes.find(c => c.tableName === 'WeaponBasicTable')
    if (!c) return null
    return c.op === 'changed' ? (c.entry as ChangedEntry).newValue : c.entry
  })()

  const itemEntry = (() => {
    const c = wp.changes.find(c => c.tableName === 'ItemTable')
    if (!c) return null
    return c.op === 'changed' ? (c.entry as ChangedEntry).newValue : c.entry
  })()

  const name = localeText(wp.name, locale)
    || localeText(itemEntry?.name, locale)
    || (fallbackItemData?.name ? resolveI18n(fallbackItemData.name, itemI18n) : null)
    || wp.weaponId

  const iconId = wp.iconId ?? itemEntry?.iconId ?? fallbackItemData?.iconId ?? ''
  const rarity = wp.rarity ?? basicEntry?.rarity ?? itemEntry?.rarity ?? fallbackBasicData?.rarity ?? fallbackItemData?.rarity ?? 0
  const weaponTypeNum = wp.weaponType ?? basicEntry?.weaponType ?? fallbackBasicData?.weaponType ?? 0
  const typeName = weaponTypeMap[weaponTypeNum] || ''

  const tableCounts: Record<string, { op: string; count: number }> = {}
  for (const c of wp.changes) {
    if (!tableCounts[c.tableName]) {
      tableCounts[c.tableName] = { op: c.op, count: 0 }
    }
    tableCounts[c.tableName].count++
  }

  const changeCategories = {
    added: wp.changes.filter(c => c.op === 'added').length,
    removed: wp.changes.filter(c => c.op === 'removed').length,
    changed: wp.changes.filter(c => c.op === 'changed').length,
  }

  return (
    <div className={`rounded overflow-hidden transition-colors ${
      isAdded ? 'border border-[archive-bronze]/40 bg-archive-file' : 'border border-archive-border bg-archive-file'
    }`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#22222C] transition-colors"
      >
        <div className="w-12 h-12 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
          {iconId && (
            <img src={getItemIconUrl(iconId)} alt={name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate flex items-center gap-1.5">
              {isAdded && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[archive-bronze] text-white font-bold shrink-0">{t('update.added')}</span>}
              <span className="text-sm font-medium text-archive-ivory">{name}</span>
              <span className="text-[10px] text-archive-lead font-mono">{wp.weaponId}</span>
            </div>
            <span className="inline-flex gap-0.5 text-xs" style={{ color: RARITY_COLORS[rarity] || '#6b7280' }}>
              {'✦'.repeat(Math.min(rarity, 6))}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {typeName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">{typeName}</span>
            )}
            <span className="text-[10px] text-archive-lead">
              {changeCategories.added > 0 && <span className="text-[archive-bronze] mr-1">+{changeCategories.added}</span>}
              {changeCategories.removed > 0 && <span className="text-[archive-seal] mr-1">-{changeCategories.removed}</span>}
              {changeCategories.changed > 0 && <span className="text-[archive-gold]">~{changeCategories.changed}</span>}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(tableCounts).map(([table, info]) => (
              <ChangeBadge key={table} label={table}
                color={TABLE_COLORS[table] || '#8B8982'} count={info.count} />
            ))}
          </div>
        </div>
        <span className={`text-archive-lead text-xs mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-archive-border p-3 space-y-3">
          {isAdded && basicEntry ? (
            <AddedWeaponDetail weaponId={wp.weaponId} basicEntry={basicEntry} itemEntry={itemEntry} locale={locale} />
          ) : (
            wp.changes.map((c) => {
              const label = c.tableName
              const color = TABLE_COLORS[c.tableName] || '#8B8982'
              const opLabel = c.op === 'added' ? t('update.added') : c.op === 'removed' ? t('update.removed') : t('update.changed')
              const opColor = c.op === 'added' ? '#5A7A6A' : c.op === 'removed' ? '#9E3A3A' : '#B89A6A'
              return (
                <div key={c.tableName + c.key} className="text-xs border-b border-archive-border/50 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-archive-lead">{c.key}</span>
                    <span className="font-mono text-[10px] px-1 rounded" style={{ backgroundColor: `${color}18`, color }}>{label}</span>
                    <span className="text-[10px] font-mono" style={{ color: opColor }}>{opLabel}</span>
                  </div>
                  {renderTableEntry(c, locale)}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function renderTableEntry(change: { tableName: string; op: string; key: string; entry: any }, locale: string) {
  const { tableName, op, entry } = change
  if (tableName === 'SkillPatchTable') return <WeaponSkillEntry entry={entry} op={op} locale={locale} />
  return renderChangeEntry(entry, op, locale)
}

let _skillI18nCache: Map<string, Record<string, string>> | null = null
async function getSkillI18n(locale: string): Promise<Record<string, string>> {
  if (!_skillI18nCache) _skillI18nCache = new Map()
  let cached = _skillI18nCache.get(locale)
  if (!cached) {
    cached = await getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)).catch(() => ({}))
    _skillI18nCache.set(locale, cached)
  }
  return cached
}

function WeaponSkillEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const { t } = useI18n()
  const [i18n, setI18n] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => { getSkillI18n(locale).then(d => { setI18n(d); setLoading(false) }) }, [locale])
  if (loading) return <div className="text-[10px] text-archive-lead">{translate(locale, 'diff.loadingSkill')}</div>

  if (op === 'changed') {
    const e = entry as { changed?: Record<string, any>; newValue?: Record<string, any> }
    if (e.changed) {
      const bundle = e.newValue?.SkillPatchDataBundle
      let formatter: ((text: string) => string) | undefined
      if (bundle?.length) {
        const bb: Record<string, number> = {}
        for (const b of (bundle[0].blackboard ?? [])) bb[b.key] = b.value
        formatter = (text: string) => formatBlackboard(text, bb)
      }
      return renderChangeEntry(entry, op, locale, formatter)
    }
    return <div className="text-[10px] text-archive-lead">{translate(locale, 'diff.noSkillChange')}</div>
  }

  const bundle = entry?.SkillPatchDataBundle
  if (!bundle?.length) return <div className="text-[10px] text-archive-lead">{translate(locale, 'diff.noSkillData')}</div>
  const first = bundle[0]
  const name = localeText(first.skillName, locale) || resolveI18n(first.skillName, i18n) || first.skillId || ''
  const desc = localeText(first.description, locale) || resolveI18n(first.description, i18n) || ''
  const bb: Record<string, number> = {}
  for (const b of (first.blackboard ?? [])) bb[b.key] = b.value
  const formattedDesc = formatBlackboard(desc, bb)
  return (
    <div className="text-xs">
      {name && <div className="text-archive-ivory font-medium mb-1">{name}</div>}
      {formattedDesc && <div className="text-archive-dust leading-relaxed"><RichText text={formattedDesc} /></div>}
      <div className="text-[10px] text-archive-lead mt-1">{t('common.level', { level: first.level })} · {t('diff.levelCount', { count: bundle.length })}</div>
    </div>
  )
}

function AddedWeaponDetail({ weaponId, basicEntry, itemEntry, locale: _locale }: { weaponId: string; basicEntry: any; itemEntry: any; locale: string }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <WeaponSkillPreview weaponId={weaponId} />
      {itemEntry?.decoDesc && (
        <details className="group">
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">{t('item.description')}</summary>
          <div className="mt-1 text-xs text-archive-ivory leading-relaxed whitespace-pre-wrap">
            <RichText text={localeText(itemEntry.decoDesc, _locale) || ''} />
          </div>
        </details>
      )}
      {itemEntry?.desc && (
        <details className="group">
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">{t('item.explain')}</summary>
          <div className="mt-1 text-xs text-archive-ivory leading-relaxed whitespace-pre-wrap">
            <RichText text={localeText(itemEntry.desc, _locale) || ''} />
          </div>
        </details>
      )}
      {basicEntry?.weaponDesc && (
        <details className="group">
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">{t('weapon.weaponDesc')}</summary>
          <div className="mt-1 text-xs text-archive-ivory leading-relaxed whitespace-pre-wrap">
            <RichText text={localeText(basicEntry.weaponDesc, _locale) || ''} />
          </div>
        </details>
      )}
      {basicEntry && (
        <details className="group" open>
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">{t('common.basicInfo')}</summary>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs px-2">
            <dt className="text-archive-lead">{t('weapon.weaponId')}</dt>
            <dd className="text-archive-ivory font-mono">{weaponId}</dd>
            <dt className="text-archive-lead">{t('weapon.maxLevel')}</dt>
            <dd className="text-archive-ivory">{basicEntry.maxLv ?? '-'}</dd>
            {basicEntry.breakthroughTemplateId && <>
              <dt className="text-archive-lead">{t('weapon.breakTemplate')}</dt>
              <dd className="text-archive-ivory font-mono text-[10px]">{basicEntry.breakthroughTemplateId}</dd>
            </>}
            {basicEntry.levelTemplateId && <>
              <dt className="text-archive-lead">{t('weapon.levelTemplate')}</dt>
              <dd className="text-archive-ivory font-mono text-[10px]">{basicEntry.levelTemplateId}</dd>
            </>}
            {basicEntry.talentTemplateId && <>
              <dt className="text-archive-lead">{t('weapon.talentTemplate')}</dt>
              <dd className="text-archive-ivory font-mono text-[10px]">{basicEntry.talentTemplateId}</dd>
            </>}
            {basicEntry.weaponSkillList?.length > 0 && <>
              <dt className="text-archive-lead">{t('diff.skillId')}</dt>
              <dd className="text-archive-ivory font-mono text-[10px]">{basicEntry.weaponSkillList.join(', ')}</dd>
            </>}
          </dl>
        </details>
      )}
    </div>
  )
}

function WeaponSkillPreview({ weaponId }: { weaponId: string }) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const [data, setData] = useState<{ skillId: string; name: string; desc: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [basicRaw, patchRaw, patchI18n] = await Promise.all([
        getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')).catch(() => ({})),
        getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return
      const basic = (basicRaw as Record<string, any>)[weaponId]
      const skillIds = basic?.weaponSkillList ?? []
      const result: { skillId: string; name: string; desc: string }[] = []
      for (const sid of skillIds) {
        const entry = (patchRaw as Record<string, any>)[sid]
        const bundle = entry?.SkillPatchDataBundle
        if (bundle?.length) {
          const first = bundle[0]
          const name = resolveI18n(first.skillName, patchI18n as Record<string, string>) || sid
          const desc = resolveI18n(first.description, patchI18n as Record<string, string>) || ''
          const bb: Record<string, number> = {}
          for (const b of (first.blackboard ?? [])) bb[b.key] = b.value
          result.push({
            skillId: sid,
            name,
            desc: formatBlackboard(desc, bb),
          })
        }
      }
      setData(result)
    }
    load()
    return () => { cancelled = true }
  }, [weaponId, locale])
  if (data.length === 0) return null
  return (
    <details className="group" open>
      <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">{t('operator.skill')}（{data.length}）</summary>
      <div className="mt-1 space-y-2">
        {data.map((s, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-archive-ink">
            <div className="text-xs text-archive-ivory font-medium">{s.name}</div>
            {s.desc && <div className="text-[10px] text-archive-dust leading-relaxed mt-1"><RichText text={s.desc} /></div>}
          </div>
        ))}
      </div>
    </details>
  )
}

interface Props {
  versionName: string
}

export default function WeaponChangePanel({ versionName }: Props) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const { data: weapons, loading, error } = useWeaponAggregatedDiff(versionName)

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-medium text-archive-ivory mb-3">{t('diff.weaponOverview')}</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded border border-archive-border bg-archive-file animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !weapons || weapons.length === 0) return null

  const totalChanges = weapons.reduce((s, o) => s + o.changes.length, 0)
  const withAdded = weapons.filter(o => o.changes.some(c => c.op === 'added')).length
  const withRemoved = weapons.filter(o => o.changes.some(c => c.op === 'removed')).length
  const withChanged = weapons.filter(o => o.changes.some(c => c.op === 'changed')).length

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-archive-ivory">
          {t('diff.weaponOverview')}
          <span className="text-xs text-archive-lead font-normal ml-2">
            {t('diff.weaponCount', { count: weapons.length, changes: totalChanges })}
          </span>
        </h3>
        <div className="flex gap-2 text-[10px] text-archive-lead">
          {withAdded > 0 && <span className="text-[archive-bronze]">{t('update.added')} {withAdded}</span>}
          {withRemoved > 0 && <span className="text-[archive-seal]">{t('update.removed')} {withRemoved}</span>}
          {withChanged > 0 && <span className="text-[archive-gold]">{t('update.changed')} {withChanged}</span>}
        </div>
      </div>

      <div className="space-y-2">
        {weapons.map(wp => (
          <WeaponCard key={wp.weaponId} wp={wp} locale={locale} />
        ))}
      </div>
    </div>
  )
}
