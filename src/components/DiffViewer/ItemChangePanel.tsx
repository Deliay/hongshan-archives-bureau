import { useState, useEffect, useMemo } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useItemAggregatedDiff } from '../../hooks/useItemAggregatedDiff'
import type { ItemChange } from '../../hooks/useItemAggregatedDiff'
import type { ChangedEntry } from '../../lib/types-diff'
import { RichText } from '../../lib/richText'
import { RichTextDiff } from './RichTextDiff'

const RARITY_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#6b7280',
  2: '#6b7280',
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

const TABLE_COLORS: Record<string, string> = {
  ItemTable: '#26bbfd',
  UsableItemChestTable: '#9452fa',
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
                  <span className="text-[#5A5A62] font-mono">{path}</span>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[#ef4444]">旧 {formatDiffValue(change.oldValue, locale)}</span>
                    <span className="text-[#26bbfd]">新 {formatDiffValue(change.newValue, locale)}</span>
                  </div>
                </div>
              )
            }
            return (
              <div key={path} className="text-[10px]">
                <span className="text-[#5A5A62] font-mono">{path}</span>
                <div className="mt-0.5 space-y-0.5">
                  {Object.entries(change.changedLocales).map(([loc, val]) => {
                    const v = val as { oldText: string; newText: string }
                    return (
                      <div key={loc}>
                        <span className="text-[#C9A96E]">{loc}</span>
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
    return <div className="text-[#8B8982] text-[10px]">无详细变更信息</div>
  }
  return <div className="text-[#8B8982] text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{renderObj(entry)}</div>
}

function ItemCard({ item, locale }: { item: ItemChange; locale: string }) {
  const [expanded, setExpanded] = useState(false)
  const isAdded = item.changes.some(c => c.op === 'added' && c.tableName === 'ItemTable')
  const [typeMap, setTypeMap] = useState<Record<number, string>>({})
  const [itemI18n, setItemI18n] = useState<Record<string, string>>({})
  const [fallbackData, setFallbackData] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale))
      .then(d => setItemI18n(d)).catch(() => {})
  }, [locale])

  useEffect(() => {
    getCachedData<Record<string, any>>('ItemTypeTable', () => fetchTableAll('ItemTypeTable'))
      .then(raw => {
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTypeTable`, () => fetchTableDictAll('ItemTypeTable', locale))
          .then(i18n => {
            const map: Record<number, string> = {}
            for (const [key, entry] of Object.entries(raw as Record<string, any>)) {
              map[Number(key)] = resolveI18n(entry.name, i18n) || entry.name?.text || `类型${key}`
            }
            setTypeMap(map)
          }).catch(() => {})
      }).catch(() => {})
  }, [locale])

  useEffect(() => {
    const hasEntry = item.changes.some(c => c.tableName === 'ItemTable')
    if (hasEntry) return
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable'))
      .then(raw => {
        const key = Object.keys(raw as Record<string, any>).find(k => k === item.itemId)
        if (key) setFallbackData((raw as Record<string, any>)[key])
      })
      .catch(() => {})
  }, [item.itemId, item.changes])

  const itemEntry = (() => {
    const c = item.changes.find(c => c.tableName === 'ItemTable')
    if (!c) return null
    return c.op === 'changed' ? (c.entry as ChangedEntry).newValue : c.entry
  })()

  const name = localeText(item.name, locale)
    || localeText(itemEntry?.name, locale)
    || (fallbackData?.name ? resolveI18n(fallbackData.name, itemI18n) : null)
    || item.itemId

  const iconId = item.iconId ?? itemEntry?.iconId ?? fallbackData?.iconId ?? ''
  const rarity = item.rarity ?? itemEntry?.rarity ?? fallbackData?.rarity ?? 0
  const typeNum = item.type ?? itemEntry?.type ?? fallbackData?.type ?? 0
  const typeName = typeMap[typeNum] || ''

  const tableCounts: Record<string, { op: string; count: number }> = {}
  for (const c of item.changes) {
    if (!tableCounts[c.tableName]) {
      tableCounts[c.tableName] = { op: c.op, count: 0 }
    }
    tableCounts[c.tableName].count++
  }

  const changeCategories = {
    added: item.changes.filter(c => c.op === 'added').length,
    removed: item.changes.filter(c => c.op === 'removed').length,
    changed: item.changes.filter(c => c.op === 'changed').length,
  }

  return (
    <div className={`rounded overflow-hidden transition-colors ${
      isAdded ? 'border border-[#26bbfd]/40 bg-[#1A1B23]' : 'border border-[#2A2A32] bg-[#1A1B23]'
    }`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#22222C] transition-colors"
      >
        <div className="w-12 h-12 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
          {iconId && (
            <img src={getItemIconUrl(iconId)} alt={name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate flex items-center gap-1.5">
              {isAdded && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#26bbfd] text-white font-bold shrink-0">新增</span>}
              <span className="text-sm font-medium text-[#E8E6E3]">{name}</span>
              <span className="text-[10px] text-[#5A5A62] font-mono">{item.itemId}</span>
            </div>
            <span className="inline-flex gap-0.5 text-xs" style={{ color: RARITY_COLORS[rarity] || '#6b7280' }}>
              {'✦'.repeat(Math.min(rarity, 6))}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {typeName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{typeName}</span>
            )}
            <span className="text-[10px] text-[#5A5A62]">
              {changeCategories.added > 0 && <span className="text-[#26bbfd] mr-1">+{changeCategories.added}</span>}
              {changeCategories.removed > 0 && <span className="text-[#ef4444] mr-1">-{changeCategories.removed}</span>}
              {changeCategories.changed > 0 && <span className="text-[#ffbb03]">~{changeCategories.changed}</span>}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(tableCounts).map(([table, info]) => (
              <ChangeBadge key={table} label={table}
                color={TABLE_COLORS[table] || '#8B8982'} count={info.count} />
            ))}
          </div>
        </div>
        <span className={`text-[#5A5A62] text-xs mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-[#2A2A32] p-3 space-y-3">
          {isAdded && itemEntry ? (
            <AddedItemDetail itemId={item.itemId} itemEntry={itemEntry} locale={locale} />
          ) : (
            item.changes.map((c) => {
              const label = c.tableName
              const color = TABLE_COLORS[c.tableName] || '#8B8982'
              const opLabel = c.op === 'added' ? '新增' : c.op === 'removed' ? '移除' : '变更'
              const opColor = c.op === 'added' ? '#26bbfd' : c.op === 'removed' ? '#ef4444' : '#ffbb03'
              return (
                <div key={c.tableName + c.key} className="text-xs border-b border-[#2A2A32]/50 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-[#5A5A62]">{c.key}</span>
                    <span className="font-mono text-[10px] px-1 rounded" style={{ backgroundColor: `${color}18`, color }}>{label}</span>
                    <span className="text-[10px] font-mono" style={{ color: opColor }}>{opLabel}</span>
                  </div>
                  {c.tableName === 'UsableItemChestTable' ? (
                    <ChestContentEntry entry={c.entry} op={c.op} locale={locale} />
                  ) : (
                    <ItemEntryRenderer entry={c.entry} op={c.op} locale={locale} />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function ChestContentEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const data = op === 'changed' ? (entry as any)?.newValue ?? entry : entry
  const rewardIds: string[] = data?.rewardIdList ?? []
  const [itemNames, setItemNames] = useState<Record<string, string>>({})
  const [itemI18n, setItemI18n] = useState<Record<string, string>>({})

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale))
      .then(d => setItemI18n(d)).catch(() => {})
  }, [locale])

  useEffect(() => {
    if (rewardIds.length === 0) return
    let cancelled = false
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable'))
      .then(raw => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const id of rewardIds) {
          const e = (raw as Record<string, any>)[id]
          if (e) map[id] = resolveI18n(e.name, itemI18n) || localeText(e.name, locale) || id
        }
        setItemNames(map)
      }).catch(() => {})
    return () => { cancelled = true }
  }, [rewardIds, locale, itemI18n])

  return (
    <div className="space-y-1">
      {op === 'changed' ? renderChangeEntry(entry, op, locale) : (
        <div className="text-[10px] text-[#8B8982]">
          <span className="text-[#5A5A62]">rewardIdList</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {rewardIds.map(id => (
              <span key={id} className="px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#B0ACA6] text-[10px]">
                {itemNames[id] || id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemEntryRenderer({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  if (op !== 'changed') return renderChangeEntry(entry, op, locale)
  const changed = (entry as any)?.changed ?? {}
  const obtainWayKeys = Object.keys(changed).filter(k => k.startsWith('obtainWayIds'))
  const otherKeys = Object.keys(changed).filter(k => !k.startsWith('obtainWayIds'))
  const filteredEntry = otherKeys.length > 0
    ? { ...(entry as any), changed: Object.fromEntries(otherKeys.map(k => [k, changed[k]])) }
    : { ...(entry as any), changed: {} }
  return (
    <div className="space-y-2">
      {obtainWayKeys.length > 0 && <ObtainWayEntry entry={entry} locale={locale} />}
      {otherKeys.length > 0 && renderChangeEntry(filteredEntry, op, locale)}
    </div>
  )
}

function ObtainWayEntry({ entry, locale }: { entry: any; locale: string }) {
  const changed = (entry as any)?.changed ?? {}
  const obtainWayKeys = Object.keys(changed).filter(k => k.startsWith('obtainWayIds'))
  const oldValue: string[] = (entry as any)?.oldValue?.obtainWayIds ?? []
  const newValue: string[] = (entry as any)?.newValue?.obtainWayIds ?? []
  const removed = oldValue.filter(id => !newValue.includes(id))
  const added = newValue.filter(id => !oldValue.includes(id))
  const unchanged = newValue.filter(id => oldValue.includes(id))

  const [wayNames, setWayNames] = useState<Record<string, string>>({})
  const [systemJumpI18n, setSystemJumpI18n] = useState<Record<string, string>>({})

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_SystemJumpTable`, () => fetchTableDictAll('SystemJumpTable', locale))
      .then(d => setSystemJumpI18n(d)).catch(() => {})
  }, [locale])

  const allWayIds = useMemo(() => [...new Set([...oldValue, ...newValue])], [oldValue, newValue])
  useEffect(() => {
    if (allWayIds.length === 0) return
    let cancelled = false
    getCachedData<Record<string, any>>('SystemJumpTable', () => fetchTableAll('SystemJumpTable'))
      .then(raw => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const wid of allWayIds) {
          const e = (raw as Record<string, any>)[wid]
          if (e) map[wid] = resolveI18n(e.desc, systemJumpI18n) || localeText(e.desc, locale) || wid
        }
        setWayNames(map)
      }).catch(() => {})
    return () => { cancelled = true }
  }, [allWayIds, locale, systemJumpI18n])

  const hasChanges = added.length > 0 || removed.length > 0 || unchanged.length > 0

  return (
    <div className="px-2 py-1 rounded bg-[#0F0F12]">
      <div className="text-[10px] text-[#8B8982] mb-1">获取方式</div>
      {obtainWayKeys.length > 0 && !hasChanges ? (
        <div className="text-[10px] text-[#5A5A62]">数组长度变更（{oldValue.length} → {newValue.length}）</div>
      ) : (
        <div className="space-y-1">
          {removed.length > 0 && (
            <div>
              <div className="text-[10px] text-[#ef4444] mb-0.5">移除</div>
              <div className="flex flex-wrap gap-1">
                {removed.map(wid => (
                  <span key={wid} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#ef4444] line-through">
                    {wayNames[wid] ? `${wayNames[wid]}（${wid}）` : wid}
                  </span>
                ))}
              </div>
            </div>
          )}
          {added.length > 0 && (
            <div>
              <div className="text-[10px] text-[#26bbfd] mb-0.5">新增</div>
              <div className="flex flex-wrap gap-1">
                {added.map(wid => (
                  <span key={wid} className="text-[10px] px-1.5 py-0.5 rounded bg-[#14321e] text-[#26bbfd]">
                    {wayNames[wid] ? `${wayNames[wid]}（${wid}）` : wid}
                  </span>
                ))}
              </div>
            </div>
          )}
          {unchanged.length > 0 && (
            <div>
              <div className="text-[10px] text-[#8B8982] mb-0.5">已存在</div>
              <div className="flex flex-wrap gap-1">
                {unchanged.map(wid => (
                  <span key={wid} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#B0ACA6]">
                    {wayNames[wid] ? `${wayNames[wid]}（${wid}）` : wid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddedItemDetail({ itemId, itemEntry, locale: _locale }: { itemId: string; itemEntry: any; locale: string }) {
  const [obtainWays, setObtainWays] = useState<{ wayId: string; desc: string }[]>([])
  const [systemJumpI18n, setSystemJumpI18n] = useState<Record<string, string>>({})

  const obtainWayIds: string[] = itemEntry?.obtainWayIds ?? []
  const outcomeItemIds: string[] = itemEntry?.outcomeItemIds ?? []

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${_locale}_SystemJumpTable`, () => fetchTableDictAll('SystemJumpTable', _locale))
      .then(d => setSystemJumpI18n(d)).catch(() => {})
  }, [_locale])

  useEffect(() => {
    if (obtainWayIds.length === 0) return
    let cancelled = false
    getCachedData<Record<string, any>>('SystemJumpTable', () => fetchTableAll('SystemJumpTable'))
      .then(raw => {
        if (cancelled) return
        const result: { wayId: string; desc: string }[] = []
        for (const wid of obtainWayIds) {
          const e = (raw as Record<string, any>)[wid]
          if (e) {
            result.push({
              wayId: wid,
              desc: resolveI18n(e.desc, systemJumpI18n) || localeText(e.desc, _locale) || '',
            })
          }
        }
        setObtainWays(result)
      }).catch(() => {})
    return () => { cancelled = true }
  }, [obtainWayIds, _locale, systemJumpI18n])

  return (
    <div className="space-y-3">
      {itemEntry?.decoDesc && (
        <details className="group">
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">物品描述</summary>
          <div className="mt-1 text-xs text-[#E8E6E3] leading-relaxed whitespace-pre-wrap">
            <RichText text={localeText(itemEntry.decoDesc, _locale) || ''} />
          </div>
        </details>
      )}
      {itemEntry?.desc && (
        <details className="group">
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">道具说明</summary>
          <div className="mt-1 text-xs text-[#E8E6E3] leading-relaxed whitespace-pre-wrap">
            <RichText text={localeText(itemEntry.desc, _locale) || ''} />
          </div>
        </details>
      )}
      {obtainWays.length > 0 && (
        <details className="group" open>
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">获取方式（{obtainWays.length}）</summary>
          <div className="mt-1 space-y-1">
            {obtainWays.map((w) => (
              <div key={w.wayId} className="px-2 py-1 rounded bg-[#0F0F12]">
                <div className="text-[10px] text-[#5A5A62] font-mono">{w.wayId}</div>
                {w.desc && <div className="text-xs text-[#B0ACA6] leading-relaxed"><RichText text={w.desc} /></div>}
              </div>
            ))}
          </div>
        </details>
      )}
      <details className="group" open>
        <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">基本信息</summary>
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs px-2">
          <dt className="text-[#5A5A62]">物品 ID</dt>
          <dd className="text-[#E8E6E3] font-mono">{itemId}</dd>
          <dt className="text-[#5A5A62]">稀有度</dt>
          <dd className="text-[#E8E6E3]">{itemEntry?.rarity ?? '-'}</dd>
          <dt className="text-[#5A5A62]">类型</dt>
          <dd className="text-[#E8E6E3]">{itemEntry?.type ?? '-'}</dd>
          {itemEntry?.maxStackCount != null && <>
            <dt className="text-[#5A5A62]">最大堆叠</dt>
            <dd className="text-[#E8E6E3]">{itemEntry.maxStackCount}</dd>
          </>}
          {itemEntry?.maxBackpackStackCount != null && <>
            <dt className="text-[#5A5A62]">背包堆叠</dt>
            <dd className="text-[#E8E6E3]">{itemEntry.maxBackpackStackCount}</dd>
          </>}
          {outcomeItemIds.length > 0 && <>
            <dt className="text-[#5A5A62]">产出物品</dt>
            <dd className="text-[#E8E6E3] font-mono text-[10px]">{outcomeItemIds.join(', ')}</dd>
          </>}
        </dl>
      </details>
    </div>
  )
}

interface Props {
  versionName: string
}

export default function ItemChangePanel({ versionName }: Props) {
  const { locale } = useLocale()
  const { data: items, loading, error } = useItemAggregatedDiff(versionName)

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-medium text-[#E8E6E3] mb-3">物品变动概览</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded border border-[#2A2A32] bg-[#1A1B23] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !items || items.length === 0) return null

  const totalChanges = items.reduce((s, o) => s + o.changes.length, 0)
  const withAdded = items.filter(o => o.changes.some(c => c.op === 'added')).length
  const withRemoved = items.filter(o => o.changes.some(c => c.op === 'removed')).length
  const withChanged = items.filter(o => o.changes.some(c => c.op === 'changed')).length

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-[#E8E6E3]">
          物品变动概览
          <span className="text-xs text-[#5A5A62] font-normal ml-2">
            {items.length} 件物品 · {totalChanges} 处变动
          </span>
        </h3>
        <div className="flex gap-2 text-[10px] text-[#5A5A62]">
          {withAdded > 0 && <span className="text-[#26bbfd]">新增 {withAdded}</span>}
          {withRemoved > 0 && <span className="text-[#ef4444]">移除 {withRemoved}</span>}
          {withChanged > 0 && <span className="text-[#ffbb03]">变更 {withChanged}</span>}
        </div>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <ItemCard key={item.itemId} item={item} locale={locale} />
        ))}
      </div>
    </div>
  )
}
