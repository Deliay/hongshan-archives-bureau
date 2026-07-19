import { useState, useEffect } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useEnemyAggregatedDiff } from '../../hooks/useEnemyAggregatedDiff'
import { getEnemyTypeNameMap, getEnemyAttrNameMap } from '../../hooks/useData'
import type { EnemyChange } from '../../hooks/useEnemyAggregatedDiff'
import type { ChangedEntry } from '../../lib/types-diff'
import { RichText } from '../../lib/richText'
import { RichTextDiff } from './RichTextDiff'

const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }

const RARITY_COLORS = ['#6b7280', '#6b7280', '#6b7280', '#5A7A6A', '#9452fa', '#B89A6A', '#ef5a00']

const TABLE_COLORS: Record<string, string> = {
  EnemyTemplateDisplayInfoTable: '#5A7A6A',
  EnemyDisplayInfoTable: '#B89A6A',
  EnemyTable: '#9452fa',
  EnemyAttributeTemplateTable: '#22c55e',
}

function localeText(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return ''
  const dict = obj as Record<string, string>
  return dict[locale] || dict.CN || ''
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

function renderObj(obj: any, indent = ''): string {
  if (obj === null || obj === undefined) return indent + '（空）'
  if (Array.isArray(obj)) {
    if (obj.length === 0) return indent + '[]'
    return obj.map((_v, i) => `${indent}[${i}]: ${renderObj(_v, indent + '  ')}`).join('\n')
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
        return `${indent}${k}:\n${renderObj(v, indent + '  ')}`
      }
      return `${indent}${k}: ${renderObj(v, '')}`.trim()
    }).join('\n')
  }
  return String(obj)
}

function formatDiffValue(v: unknown, locale: string): string {
  if (v === undefined || v === null) return '（空）'
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
                    <span className="text-[archive-seal]">旧 {formatDiffValue(change.oldValue, locale)}</span>
                    <span className="text-[archive-bronze]">新 {formatDiffValue(change.newValue, locale)}</span>
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
    return <div className="text-archive-dust text-[10px]">无详细变更信息</div>
  }
  return <div className="text-archive-dust text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{renderObj(entry)}</div>
}

function renderTableEntry(change: { tableName: string; op: string; key: string; entry: any }, locale: string) {
  const { tableName, op, entry } = change
  if (tableName === 'EnemyAttributeTemplateTable') return <EnemyAttrEntry entry={entry} op={op} locale={locale} />
  if (tableName === 'EnemyTable') return <EnemyTableEntry entry={entry} op={op} locale={locale} />
  if (tableName === 'EnemyTemplateDisplayInfoTable') return <EnemyDisplayInfoEntry entry={entry} op={op} locale={locale} />
  return renderChangeEntry(entry, op, locale)
}

function EnemyDisplayInfoEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const data = op === 'changed' ? (entry as any)?.newValue ?? entry : entry
  const distIds: string[] = data?.distributionIds ?? []
  const [areaNames, setAreaNames] = useState<Record<string, string>>({})
  useEffect(() => {
    if (distIds.length === 0) return
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('DistributionInfoTable', () => fetchTableAll('DistributionInfoTable')).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_DistributionInfoTable`, () => fetchTableDictAll('DistributionInfoTable', locale)).catch(() => ({}) as Record<string, string>),
    ]).then(([raw, i18n]) => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const id of distIds) {
        const e = (raw as Record<string, any>)[id]
        if (e) map[id] = resolveI18n(e.areaName, i18n as Record<string, string>) || id
      }
      setAreaNames(map)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [distIds.join(','), locale])

  const changed = op === 'changed' ? (entry as any)?.changed ?? {} : {}
  const distChangeKeys = Object.keys(changed).filter(k => k.startsWith('distributionIds'))
  const hasDistDiff = distChangeKeys.length > 0

  const oldDistIds: string[] = hasDistDiff ? ((entry as any)?.oldValue?.distributionIds ?? []) : (op === 'removed' ? distIds : [])
  const newDistIds: string[] = hasDistDiff ? distIds : (op === 'added' ? distIds : [])
  const added = newDistIds.filter(id => !oldDistIds.includes(id))
  const removed = oldDistIds.filter(id => !newDistIds.includes(id))
  const unchanged = newDistIds.filter(id => oldDistIds.includes(id))

  const otherChanges = op === 'changed' ? Object.keys(changed).filter(k => !k.startsWith('distributionIds')) : []

  return (
    <div className="space-y-1">
      {op !== 'changed' && (
        <div className="text-archive-dust text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {renderObjFiltered(data, ['distributionIds'], '')}
        </div>
      )}
      {otherChanges.length > 0 && (
        <div className="space-y-1">
          {otherChanges.map(path => {
            const change = changed[path]
            if (change.type === 'value') {
              return (
                <div key={path} className="text-[10px]">
                  <span className="text-archive-lead font-mono">{path}</span>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[archive-seal]">旧 {formatDiffValue(change.oldValue, locale)}</span>
                    <span className="text-[archive-bronze]">新 {formatDiffValue(change.newValue, locale)}</span>
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
                        <RichTextDiff oldText={v.oldText || ''} newText={v.newText || ''} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {(op === 'added' || op === 'removed' || hasDistDiff) && Object.keys(areaNames).length > 0 && (
        <div className="px-2 py-1 rounded bg-archive-ink">
          <div className="text-[10px] text-archive-dust mb-0.5">分布区域</div>
          <div className="space-y-1">
            {removed.length > 0 && (
              <div>
                <div className="text-[10px] text-[archive-seal] mb-0.5">移除</div>
                <div className="flex flex-wrap gap-1">
                  {removed.map(id => (
                    <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-[archive-seal] line-through">
                      {areaNames[id] || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {added.length > 0 && (
              <div>
                <div className="text-[10px] text-[archive-bronze] mb-0.5">新增</div>
                <div className="flex flex-wrap gap-1">
                  {added.map(id => (
                    <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-bronze/10 text-[archive-bronze]">
                      {areaNames[id] || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {unchanged.length > 0 && (
              <div>
                <div className="text-[10px] text-archive-dust mb-0.5">已存在</div>
                <div className="flex flex-wrap gap-1">
                  {unchanged.map(id => (
                    <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                      {areaNames[id] || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!hasDistDiff && op === 'added' && (
              <div className="flex flex-wrap gap-1">
                {distIds.map(id => (
                  <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                    {areaNames[id] || id}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function renderObjFiltered(obj: any, excludeKeys: string[], indent: string): string {
  if (obj === null || obj === undefined) return indent + '（空）'
  if (Array.isArray(obj)) {
    if (obj.length === 0) return indent + '[]'
    return obj.map((_v, i) => `${indent}[${i}]: ${renderObjFiltered(_v, excludeKeys, indent + '  ')}`).join('\n')
  }
  if (typeof obj === 'object') {
    const text = 'text' in obj ? (obj.text || '') : ''
    const id = 'id' in obj ? String(obj.id) : ''
    if (id || text) return `${indent}${text ? `"${text}"` : ''}${id && text ? ' ' : ''}${id ? `(${id})` : ''}`.trim()
    const keys = Object.keys(obj).filter(k => !excludeKeys.includes(k))
    if (keys.length === 0) return indent + '{}'
    return keys.map(k => {
      const v = obj[k]
      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
        return `${indent}${k}:\n${renderObjFiltered(v, excludeKeys, indent + '  ')}`
      }
      return `${indent}${k}: ${renderObjFiltered(v, excludeKeys, '')}`.trim()
    }).join('\n')
  }
  return String(obj)
}

function EnemyTableEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const data = op === 'changed' ? (entry as any)?.newValue ?? entry : entry
  const attrTemplateId = data?.attrTemplateId as string | undefined
  const [attrData, setAttrData] = useState<any>(null)
  useEffect(() => {
    if (!attrTemplateId) return
    let cancelled = false
    getCachedData<Record<string, any>>('EnemyAttributeTemplateTable', () => fetchTableAll('EnemyAttributeTemplateTable'))
      .then(raw => {
        if (cancelled) return
        const found = (raw as Record<string, any>)[attrTemplateId]
        if (found) setAttrData(found)
      }).catch(() => {})
    return () => { cancelled = true }
  }, [attrTemplateId])
  const lda: { level?: number }[] = attrData?.levelDependentAttributes ?? []
  const hasLevelField = lda.some(a => a != null && typeof a === 'object' && 'level' in a)
  const levelCount = hasLevelField ? Math.max(1, ...lda.map(a => a.level ?? 1)) : lda.length
  const [level, setLevel] = useState(1)
  useEffect(() => { setLevel(levelCount) }, [levelCount])
  return (
    <div className="space-y-1">
      {renderChangeEntry(entry, op, locale)}
      {attrData && (
        <div className="px-2 py-1.5 rounded bg-archive-ink mt-1">
          <div className="text-[10px] text-archive-dust mb-1">属性模板 ({attrTemplateId})</div>
          <AttributeView attrData={attrData} level={level} />
          {levelCount > 1 && (
            <div className="mt-2">
              <input type="range" min={1} max={levelCount} value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none bg-archive-border accent-archive-gold cursor-pointer" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EnemyAttrEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const data = op === 'changed' ? (entry as any)?.newValue ?? entry : entry
  const lda: { level?: number }[] = data?.levelDependentAttributes ?? []
  const hasLevelField = lda.some(a => a != null && typeof a === 'object' && 'level' in a)
  const levelCount = hasLevelField ? Math.max(1, ...lda.map(a => a.level ?? 1)) : lda.length
  const [level, setLevel] = useState(1)
  useEffect(() => { setLevel(levelCount) }, [levelCount])
  if (op === 'changed') return renderChangeEntry(entry, op, locale)
  return (
    <div className="px-2 py-1.5 rounded bg-archive-ink">
      <AttributeView attrData={data} level={level} />
      {levelCount > 1 && (
        <div className="mt-2">
          <input type="range" min={1} max={levelCount} value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none bg-archive-border accent-archive-gold cursor-pointer" />
        </div>
      )}
    </div>
  )
}

function EnemyCard({ ep, locale }: { ep: EnemyChange; locale: string }) {
  const [expanded, setExpanded] = useState(false)
  const isAdded = ep.changes.some(c => c.op === 'added' && c.key === ep.enemyId && (c.tableName === 'EnemyTemplateDisplayInfoTable' || c.tableName === 'EnemyDisplayInfoTable'))
  const [tagI18n, setTagI18n] = useState<Record<string, string>>({})
  const [typeNameMap, setTypeNameMap] = useState<Record<number, string>>({})
  const [fallbackDisplayData, setFallbackDisplayData] = useState<Record<string, any> | null>(null)
  const [fallbackDisplayData2, setFallbackDisplayData2] = useState<Record<string, any> | null>(null)
  const [displayI18n, setDisplayI18n] = useState<Record<string, string>>({})
  const [displayI18n2, setDisplayI18n2] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyTemplateDisplayInfoTable`, () => fetchTableDictAll('EnemyTemplateDisplayInfoTable', locale)).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyDisplayInfoTable`, () => fetchTableDictAll('EnemyDisplayInfoTable', locale)).catch(() => ({})),
    ]).then(([d1, d2]) => { setDisplayI18n(d1 as Record<string, string>); setDisplayI18n2(d2 as Record<string, string>) })
  }, [locale])

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyTagTable`, () => fetchTableDictAll('EnemyTagTable', locale))
      .then(d => setTagI18n(d)).catch(() => {})
  }, [locale])

  useEffect(() => {
    getEnemyTypeNameMap(locale).then(setTypeNameMap).catch(() => {})
  }, [locale])

  useEffect(() => {
    Promise.all([
      getCachedData<Record<string, any>>('EnemyTemplateDisplayInfoTable', () => fetchTableAll('EnemyTemplateDisplayInfoTable')).catch(() => ({})),
      getCachedData<Record<string, any>>('EnemyDisplayInfoTable', () => fetchTableAll('EnemyDisplayInfoTable')).catch(() => ({})),
    ]).then(([raw, raw2]) => {
      const keys1 = Object.keys(raw as Record<string, any>)
      const keys2 = Object.keys(raw2 as Record<string, any>)
      const key = keys1.find(k => k === ep.enemyId)
      const key2 = keys2.find(k => k === ep.enemyId)
      if (key) setFallbackDisplayData((raw as Record<string, any>)[key])
      if (key2) setFallbackDisplayData2((raw2 as Record<string, any>)[key2])
    }).catch(() => {})
  }, [ep.enemyId])

  const displayEntry = (() => {
    for (const tn of ['EnemyTemplateDisplayInfoTable', 'EnemyDisplayInfoTable']) {
      const c = ep.changes.find(c => c.tableName === tn)
      if (c) return c.op === 'changed' ? (c.entry as ChangedEntry).newValue : c.entry
    }
    return null
  })()

  const fallbackData = fallbackDisplayData || fallbackDisplayData2
  const fallbackI18n = fallbackDisplayData ? displayI18n : displayI18n2

  const name = localeText(ep.name, locale)
    || localeText(displayEntry?.name, locale)
    || (fallbackData?.name ? resolveI18n(fallbackData.name, fallbackI18n) : null)
    || ep.enemyId

  const nickname = localeText(ep.nickname, locale) || localeText(displayEntry?.nickname, locale) || ''
  const displayType = ep.displayType ?? displayEntry?.displayType ?? fallbackData?.displayType ?? 0
  const stars = ENEMY_STARS[displayType] ?? 1
  const typeLabel = typeNameMap[displayType] || `类型${displayType}`
  const tags: string[] = ep.tags ?? displayEntry?.tags ?? fallbackData?.tags ?? []

  const tableCounts: Record<string, { op: string; count: number }> = {}
  for (const c of ep.changes) {
    if (!tableCounts[c.tableName]) {
      tableCounts[c.tableName] = { op: c.op, count: 0 }
    }
    tableCounts[c.tableName].count++
  }

  const changeCategories = {
    added: ep.changes.filter(c => c.op === 'added').length,
    removed: ep.changes.filter(c => c.op === 'removed').length,
    changed: ep.changes.filter(c => c.op === 'changed').length,
  }
  const variantKeys = new Set(ep.changes.map(c => c.key))
  const hasVariants = variantKeys.size > 1 || (variantKeys.size === 1 && !variantKeys.has(ep.enemyId))

  return (
    <div className={`rounded overflow-hidden transition-colors ${
      isAdded ? 'border border-[archive-bronze]/40 bg-archive-file' : 'border border-archive-border bg-archive-file'
    }`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#22222C] transition-colors"
      >
        <div className="w-12 h-12 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericon/${displayEntry?.templateId || ep.enemyId}.png`}
            alt={name} className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate flex items-center gap-1.5">
              {isAdded && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[archive-bronze] text-white font-bold shrink-0">新增</span>}
              <span className="text-sm font-medium text-archive-ivory">{name}</span>
              <span className="text-[10px] text-archive-lead font-mono">{ep.enemyId}</span>
            </div>
            <span className="inline-flex gap-0.5 text-xs" style={{ color: RARITY_COLORS[stars] || '#6b7280' }}>
              {'✦'.repeat(Math.min(stars, 6))}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">{typeLabel}</span>
            {nickname && <span className="text-[10px] text-archive-dust">「{nickname}」</span>}
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-archive-border text-archive-lead">{tagI18n[t] || t}</span>
            ))}
            <span className="text-[10px] text-archive-lead">
              {changeCategories.added > 0 && <span className="text-[archive-bronze] mr-1">+{changeCategories.added}</span>}
              {changeCategories.removed > 0 && <span className="text-[archive-seal] mr-1">-{changeCategories.removed}</span>}
              {changeCategories.changed > 0 && <span className="text-[archive-gold] mr-1">~{changeCategories.changed}</span>}
              {hasVariants && <span className="text-archive-dust">({variantKeys.size} 个变体)</span>}
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
          {isAdded && displayEntry ? (
            <AddedEnemyDetail templateId={displayEntry?.templateId || ep.enemyId} displayEntry={displayEntry} locale={locale} typeNameMap={typeNameMap} />
          ) : (
            ep.changes.map((c) => {
              const label = c.tableName
              const color = TABLE_COLORS[c.tableName] || '#8B8982'
              const opLabel = c.op === 'added' ? '新增' : c.op === 'removed' ? '移除' : '变更'
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

function AddedEnemyDetail({ templateId, displayEntry, locale, typeNameMap }: { templateId: string; displayEntry: any; locale: string; typeNameMap: Record<number, string> }) {
  const [abilities, setAbilities] = useState<{ name: string; description: string }[]>([])
  const [attrData, setAttrData] = useState<any>(null)
  const [attrLevel, setAttrLevel] = useState(1)

  const abilityDescIds: string[] = displayEntry?.abilityDescIds ?? []

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [abilityRaw, abilityI18n, attrRaw] = await Promise.all([
        getCachedData<Record<string, any>>('EnemyAbilityDescTable', () => fetchTableAll('EnemyAbilityDescTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyAbilityDescTable`, () => fetchTableDictAll('EnemyAbilityDescTable', locale)).catch(() => ({}) as Record<string, string>),
        getCachedData<Record<string, any>>('EnemyAttributeTemplateTable', () => fetchTableAll('EnemyAttributeTemplateTable')).catch(() => ({})),
      ])
      if (cancelled) return

      const result: { name: string; description: string }[] = []
      for (const aid of abilityDescIds) {
        const entry = (abilityRaw as Record<string, any>)[aid]
        if (entry) {
          result.push({
            name: resolveI18n(entry.name, abilityI18n as Record<string, string>) || '',
            description: resolveI18n(entry.description, abilityI18n as Record<string, string>) || '',
          })
        }
      }
      setAbilities(result)

      const attrEntry = (attrRaw as Record<string, any>)[templateId]
      if (attrEntry) {
        setAttrData(attrEntry)
        const maxLv = Math.max(1, ...(attrEntry.levelDependentAttributes?.map((a: any) => a.level ?? 1) ?? [1]))
        setAttrLevel(maxLv)
      }
    }
    load()
    return () => { cancelled = true }
  }, [templateId, abilityDescIds.join(','), locale])

  const desc = localeText(displayEntry?.description, locale) || ''
  const nickname = localeText(displayEntry?.nickname, locale) || ''

  return (
    <div className="space-y-3">
      {desc && (
        <div className="p-2 rounded bg-archive-ink">
          <div className="text-[10px] text-archive-dust mb-1">描述</div>
          <div className="text-xs text-archive-ivory leading-relaxed"><RichText text={desc} /></div>
        </div>
      )}

      {abilities.length > 0 && (
        <details className="group" open>
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">
            能力（{abilities.length}）
          </summary>
          <div className="mt-1 space-y-2">
            {abilities.map((a) => (
              <div key={`${a.name}-${a.description.slice(0, 20)}`} className="px-2 py-1.5 rounded bg-archive-ink">
                {a.name && <div className="text-xs text-archive-ivory font-medium">{a.name}</div>}
                {a.description && <div className="text-[10px] text-archive-dust leading-relaxed mt-0.5"><RichText text={a.description} /></div>}
              </div>
            ))}
          </div>
        </details>
      )}

      {attrData && (
        <details className="group" open>
          <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">属性模板</summary>
          <div className="mt-1 px-2 py-1.5 rounded bg-archive-ink">
            <AttributeView attrData={attrData} level={attrLevel} />
            {attrData.levelDependentAttributes?.length > 1 && (
              <div className="mt-2">
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, ...(attrData.levelDependentAttributes?.map((a: any) => a.level ?? 1) ?? [1]))}
                  value={attrLevel}
                  onChange={(e) => setAttrLevel(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none bg-archive-border accent-archive-gold cursor-pointer"
                />
              </div>
            )}
          </div>
        </details>
      )}

      <details className="group" open>
        <summary className="text-xs text-archive-dust cursor-pointer hover:text-archive-gold transition-colors">基本信息</summary>
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs px-2">
          <dt className="text-archive-lead">模板 ID</dt>
          <dd className="text-archive-ivory font-mono">{templateId}</dd>
          <dt className="text-archive-lead">显示类型</dt>
            <dd className="text-archive-ivory">{typeNameMap[displayEntry?.displayType ?? 0] || `类型${displayEntry?.displayType}`}</dd>
          {nickname && <>
            <dt className="text-archive-lead">别称</dt>
            <dd className="text-archive-ivory">{nickname}</dd>
          </>}
        </dl>
      </details>
    </div>
  )
}

function AttributeView({ attrData, level }: { attrData: any; level: number }) {
  const [attrNameMap, setAttrNameMap] = useState<Record<number, string>>({})
  const { locale } = useLocale()

  useEffect(() => {
    getEnemyAttrNameMap(locale).then(setAttrNameMap).catch(() => {})
  }, [locale])

  const lda: { attrs: { attrType: number; attrValue: number }[] }[] = attrData?.levelDependentAttributes ?? []
  const hasLevelField = lda.some(a => a != null && typeof a === 'object' && 'level' in a)
  const depAttrs: Record<number, number> = {}
  if (hasLevelField) {
    for (const a of lda) {
      if ((a as any).level === level && (a as any).attrs) {
        for (const attr of (a as any).attrs) depAttrs[attr.attrType] = attr.attrValue
      }
    }
  } else if (lda.length > 0) {
    const idx = Math.min(Math.max(level - 1, 0), lda.length - 1)
    const entry = lda[idx]
    if (entry?.attrs) {
      for (const attr of entry.attrs) depAttrs[attr.attrType] = attr.attrValue
    }
  }

  const fixedAttrs: Record<number, number> = {}
  const lia = attrData?.levelIndependentAttributes
  if (lia?.attrs) {
    for (const a of lia.attrs) fixedAttrs[a.attrType] = a.attrValue
  }

  const allTypes = [...new Set([...Object.keys(depAttrs).map(Number), ...Object.keys(fixedAttrs).map(Number)])].sort((a, b) => a - b)
  if (allTypes.length === 0) return <div className="text-[10px] text-archive-lead">无属性数据</div>

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {allTypes.map(type => (
        <div key={type} className="flex items-center justify-between text-[10px]">
          <span className="text-archive-dust">{attrNameMap[type] || `属性${type}`}</span>
          <span className="text-archive-ivory font-mono">
            {depAttrs[type] ?? fixedAttrs[type] ?? '-'}
          </span>
        </div>
      ))}
      {attrData?.physicalDmgResistScalar != null && (
        <div className="flex items-center justify-between text-[10px] col-span-2">
          <span className="text-archive-dust">物理抗性倍率</span>
          <span className="text-archive-ivory font-mono">{attrData.physicalDmgResistScalar}</span>
        </div>
      )}
      {attrData?.resilience != null && (
        <div className="flex items-center justify-between text-[10px] col-span-2">
          <span className="text-archive-dust">韧性</span>
          <span className="text-archive-ivory font-mono">{attrData.resilience}</span>
        </div>
      )}
    </div>
  )
}

interface Props {
  versionName: string
}

export default function EnemyChangePanel({ versionName }: Props) {
  const { locale } = useLocale()
  const { data: enemies, loading, error } = useEnemyAggregatedDiff(versionName)

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-medium text-archive-ivory mb-3">敌人变动概览</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded border border-archive-border bg-archive-file animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !enemies || enemies.length === 0) return null

  const totalChanges = enemies.reduce((s, o) => s + o.changes.length, 0)
  const withAdded = enemies.filter(o => o.changes.some(c => c.op === 'added')).length
  const withRemoved = enemies.filter(o => o.changes.some(c => c.op === 'removed')).length
  const withChanged = enemies.filter(o => o.changes.some(c => c.op === 'changed')).length

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-archive-ivory">
          敌人变动概览
          <span className="text-xs text-archive-lead font-normal ml-2">
            {enemies.length} 个敌人 · {totalChanges} 处变动
          </span>
        </h3>
        <div className="flex gap-2 text-[10px] text-archive-lead">
          {withAdded > 0 && <span className="text-[archive-bronze]">新增 {withAdded}</span>}
          {withRemoved > 0 && <span className="text-[archive-seal]">移除 {withRemoved}</span>}
          {withChanged > 0 && <span className="text-[archive-gold]">变更 {withChanged}</span>}
        </div>
      </div>

      <div className="space-y-2">
        {enemies.map(ep => (
          <EnemyCard key={ep.enemyId} ep={ep} locale={locale} />
        ))}
      </div>
    </div>
  )
}
