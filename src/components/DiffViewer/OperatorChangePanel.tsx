import { useState, useEffect } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useOperatorAggregatedDiff } from '../../hooks/useOperatorAggregatedDiff'
import type { OperatorChange } from '../../hooks/useOperatorAggregatedDiff'
import type { ChangedEntry } from '../../lib/types-diff'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'
import { RichTextDiff } from './RichTextDiff'

const RARITY_COLORS = ['#6b7280', '#6b7280', '#6b7280', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

const TABLE_LABELS: Record<string, string> = {
  CharacterTable: '档案',
  CharGrowthTable: '成长',
  SkillPatchTable: '技能',
  PotentialTalentEffectTable: '潜能天赋',
  SpaceshipSkillTable: '基建技能',
  SpaceshipCharSkillTable: '基建关联',
}

const TABLE_COLORS: Record<string, string> = {
  CharacterTable: '#26bbfd',
  CharGrowthTable: '#9452fa',
  SkillPatchTable: '#ffbb03',
  PotentialTalentEffectTable: '#ef5a00',
  SpaceshipSkillTable: '#22c55e',
  SpaceshipCharSkillTable: '#06b6d4',
}

function getFieldContext(path: string, newValue: any, locale: string): string {
  const match = path.match(/^(profileVoice|profileRecord)\[(\d+)]\./)
  if (!match) return ''
  const [, field, idxStr] = match
  const idx = Number(idxStr)
  const newEntry = newValue?.[field]?.[idx]
  if (field === 'profileVoice') {
    const title = newEntry ? localeText(newEntry.voiceTitle, locale) || '' : ''
    const desc = newEntry ? localeText(newEntry.voiceDesc, locale) || '' : ''
    let result = `#${idx}`
    if (title) result += ` ${title}`
    if (desc) result += ` — ${desc}`
    return result
  }
  if (field === 'profileRecord') {
    const title = newEntry ? localeText(newEntry.recordTitle, locale) || '' : ''
    return title ? `[${idx}] ${title}` : ''
  }
  return ''
}

function localeText(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return ''
  const dict = obj as Record<string, string>
  return dict[locale] || dict.CN || ''
}

function StarRating({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5 text-xs" style={{ color: RARITY_COLORS[level] || '#6b7280' }}>
      {'✦'.repeat(Math.min(level, 7))}
    </span>
  )
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

function formatDiffValue(path: string, v: unknown, locale: string, entry?: any): string {
  if (path.endsWith('unlockType') && typeof v === 'number') {
    if (v === 0) return '初始解锁'
    if (v === 2) return '精英阶段'
    if (v === 4) return '信赖值'
    return ''
  }
  if (path.endsWith('unlockValue') && typeof v === 'number') {
    const m = path.match(/^(profileVoice|profileRecord)\[(\d+)]\./)
    if (m && entry) {
      const [, field, idx] = m
      const unlockType = entry[field]?.[Number(idx)]?.unlockType ?? 0
      if (unlockType === 0) return '初始解锁'
      if (unlockType === 2) return `精英阶段 ${v}`
      if (unlockType === 4) return `信赖值 ${v}`
    }
  }
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

function renderTableEntry(change: { tableName: string; op: string; key: string; entry: any }, locale: string) {
  const { tableName, op, entry } = change
  if (tableName === 'SkillPatchTable') return <SkillEntry entry={entry} op={op} locale={locale} />
  if (tableName === 'PotentialTalentEffectTable') return <PotentialEntry entry={entry} op={op} locale={locale} />
  if (tableName === 'SpaceshipSkillTable') return <SpaceshipEntry entry={entry} op={op} locale={locale} />
  return renderChangeEntry(entry, op, locale)
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
            const context = getFieldContext(path, e.newValue, locale)
            if (change.type === 'value') {
              return (
                <div key={path} className="text-[10px]">
                  <span className="text-[#5A5A62] font-mono">{path}</span>
                  {context && <span className="ml-2 text-[#8B8982]">{context}</span>}
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[#ef4444]">旧 {formatDiffValue(path, change.oldValue, locale, e.newValue)}</span>
                    <span className="text-[#26bbfd]">新 {formatDiffValue(path, change.newValue, locale, e.newValue)}</span>
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

function renderObj(obj: any, indent = ''): string {
  if (obj === null || obj === undefined) return indent + '（空）'
  if (Array.isArray(obj)) {
    if (obj.length === 0) return indent + '[]'
    return obj.map((v, i) => `${indent}[${i}]: ${renderObj(v, indent + '  ')}`).join('\n')
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

interface LookupMaps {
  professions: Record<number, string>
  elements: Record<string, string>
  battleTags: Record<string, string>
  attributes: Record<number, string>
}

function useLookupMaps(locale: string): LookupMaps | null {
  const [maps, setMaps] = useState<LookupMaps | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('CharProfessionTable', () => fetchTableAll('CharProfessionTable')).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_CharProfessionTable`, () => fetchTableDictAll('CharProfessionTable', locale)).catch(() => ({})),
      getCachedData<Record<string, any>>('CharTypeTable', () => fetchTableAll('CharTypeTable')).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_CharTypeTable`, () => fetchTableDictAll('CharTypeTable', locale)).catch(() => ({})),
      getCachedData<Record<string, any>>('CharBattleTagTable', () => fetchTableAll('CharBattleTagTable')).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_CharBattleTagTable`, () => fetchTableDictAll('CharBattleTagTable', locale)).catch(() => ({})),
      getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')).catch(() => ({})),
      getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')).catch(() => ({})),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', locale)).catch(() => ({})),
    ]).then(([profRaw, profI18n, elemRaw, elemI18n, tagRaw, tagI18n, attrMetaVal, attrShowVal, attrI18nVal]) => {
      if (cancelled) return
      const professions: Record<number, string> = {}
      for (const [, v] of Object.entries<any>(profRaw)) {
        professions[Number(v.profession ?? v.$key ?? 0)] = resolveI18n(v.name, profI18n as Record<string, string>) || `职业${v.profession}`
      }
      const elements: Record<string, string> = {}
      for (const [k, v] of Object.entries<any>(elemRaw)) {
        elements[k] = resolveI18n(v.name, elemI18n as Record<string, string>) || k
      }
      const battleTags: Record<string, string> = {}
      for (const [k, v] of Object.entries<any>(tagRaw)) {
        battleTags[k] = resolveI18n(v, tagI18n as Record<string, string>) || k
      }
      const attributes: Record<number, string> = {}
      for (const [k, v] of Object.entries<any>(attrMetaVal)) {
        const configItem = (attrShowVal as Record<string, any>)[k]?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        attributes[Number(k)] = (nameId && (attrI18nVal as Record<string, string>)[nameId]) || v.iconName?.replace('icon_attribute_', '') || `属性${k}`
      }
      setMaps({ professions, elements, battleTags, attributes })
    })
    return () => { cancelled = true }
  }, [locale])
  return maps
}

function OperatorCard({ op, locale }: { op: OperatorChange; locale: string }) {
  const [expanded, setExpanded] = useState(false)
  const isAdded = op.changes.some(c => c.op === 'added' && c.tableName === 'CharacterTable')
  const maps = useLookupMaps(locale)
  const [fallbackCharData, setFallbackCharData] = useState<Record<string, any> | null>(null)
  const [charI18n, setCharI18n] = useState<Record<string, string>>({})

  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_CharacterTable`, () => fetchTableDictAll('CharacterTable', locale))
      .then(d => setCharI18n(d)).catch(() => {})
  }, [locale])

  useEffect(() => {
    const hasCharEntry = op.changes.some(c =>
      c.tableName === 'CharacterTable'
    )
    if (hasCharEntry) return
    getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable'))
      .then(raw => setFallbackCharData(raw[op.charId] ?? null))
      .catch(() => {})
  }, [op.charId, op.changes])

  const charEntry = (() => {
    const c = op.changes.find(c => c.tableName === 'CharacterTable')
    if (!c) return null
    return c.op === 'changed' ? (c.entry as ChangedEntry).newValue : c.entry
  })()

  const name = localeText(op.name, locale)
    || localeText(charEntry?.name, locale)
    || (fallbackCharData?.name ? resolveI18n(fallbackCharData.name, charI18n) : null)
    || op.charId
  const rarity = op.rarity ?? charEntry?.rarity ?? fallbackCharData?.rarity ?? 0
  const professionVal = op.profession ?? charEntry?.profession ?? fallbackCharData?.profession
  const charTypeId = op.charTypeId ?? charEntry?.charTypeId ?? fallbackCharData?.charTypeId ?? ''
  const tags: string[] = op.charBattleTagIds ?? charEntry?.charBattleTagIds ?? fallbackCharData?.charBattleTagIds ?? []
  const mainAttrType: number = op.mainAttrType ?? charEntry?.mainAttrType ?? fallbackCharData?.mainAttrType ?? 0
  const subAttrType: number = op.subAttrType ?? charEntry?.subAttrType ?? fallbackCharData?.subAttrType ?? 0

  const professionName = maps?.professions[professionVal ?? -1] ?? (professionVal !== undefined ? `职业${professionVal}` : '')
  const elementName = maps?.elements[charTypeId] ?? charTypeId
  const mainAttrName = maps?.attributes[mainAttrType] ?? (mainAttrType > 0 ? `属性${mainAttrType}` : '')
  const subAttrName = maps?.attributes[subAttrType] ?? (subAttrType > 0 ? `属性${subAttrType}` : '')

  const portraitUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${op.charId}.png`

  const tableCounts: Record<string, { op: string; count: number }> = {}
  for (const c of op.changes) {
    if (!tableCounts[c.tableName]) {
      tableCounts[c.tableName] = { op: c.op, count: 0 }
    }
    tableCounts[c.tableName].count++
  }

  const changeCategories = {
    added: op.changes.filter(c => c.op === 'added').length,
    removed: op.changes.filter(c => c.op === 'removed').length,
    changed: op.changes.filter(c => c.op === 'changed').length,
  }

  const addedEntry = op.changes.find(c => c.op === 'added' && c.tableName === 'CharacterTable')

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
          <img src={portraitUrl} alt={name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate flex items-center gap-1.5">
              {isAdded && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#26bbfd] text-white font-bold shrink-0">新增</span>}
              <span className="text-sm font-medium text-[#E8E6E3]">{name}</span>
              <span className="text-[10px] text-[#5A5A62] font-mono">{op.charId}</span>
            </div>
            <StarRating level={rarity} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {professionName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{professionName}</span>
            )}
            {elementName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{elementName}</span>}
            {tags.length > 0 && tags.map((t, i) => (
              <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-[#2A2A32] text-[#5A5A62]">{maps?.battleTags[t] || t}</span>
            ))}
            <span className="text-[10px] text-[#5A5A62]">
              {changeCategories.added > 0 && <span className="text-[#26bbfd] mr-1">+{changeCategories.added}</span>}
              {changeCategories.removed > 0 && <span className="text-[#ef4444] mr-1">-{changeCategories.removed}</span>}
              {changeCategories.changed > 0 && <span className="text-[#ffbb03]">~{changeCategories.changed}</span>}
            </span>
          </div>
          {(mainAttrName || subAttrName) && (
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#B0ACA6]">
              {mainAttrName && <span>主能力 {mainAttrName}</span>}
              {subAttrName && <span>副能力 {subAttrName}</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(tableCounts).map(([table, info]) => (
              <ChangeBadge key={table} label={TABLE_LABELS[table] || table}
                color={TABLE_COLORS[table] || '#8B8982'} count={info.count} />
            ))}
          </div>
        </div>
        <span className={`text-[#5A5A62] text-xs mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-[#2A2A32] p-3 space-y-3">
          {isAdded && addedEntry ? (
            <AddedOperatorDetail charId={op.charId} entry={addedEntry.entry} locale={locale} />
          ) : (
            op.changes.map((c) => {
              const label = TABLE_LABELS[c.tableName] || c.tableName
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

function renderUnlockInfo(unlockType: number, unlockValue: number): string {
  if (unlockType === 0) return ''
  if (unlockType === 2) return `精英阶段 ${unlockValue}`
  if (unlockType === 4) return `信赖值 ${unlockValue}`
  return `解锁类型${unlockType}·值${unlockValue}`
}

function AddedOperatorDetail({ charId, entry, locale }: { charId: string; entry: any; locale: string }) {
  return (
    <div className="space-y-3">
      <SkillPreview charId={charId} locale={locale} />
      <SpaceshipSkillPreview charId={charId} locale={locale} />

      {entry?.profileRecord && entry.profileRecord.length > 0 && (
        <details className="group">
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">
            档案记录（{entry.profileRecord.length}）
          </summary>
          <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
            {entry.profileRecord.map((r: any) => (
              <div key={r.id} className="px-2 py-1 rounded bg-[#0F0F12]">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-[#8B8982]">{localeText(r.recordTitle, locale)}</div>
                  {renderUnlockInfo(r.unlockType, r.unlockValue) && (
                    <span className="text-[9px] text-[#5A5A62]">{renderUnlockInfo(r.unlockType, r.unlockValue)}</span>
                  )}
                </div>
                <div className="text-xs text-[#E8E6E3] mt-0.5 whitespace-pre-wrap line-clamp-3">
                  <RichText text={localeText(r.recordDesc, locale)} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {entry?.profileVoice && entry.profileVoice.length > 0 && (
        <details className="group">
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">
            语音记录（{entry.profileVoice.length}）
          </summary>
          <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
            {entry.profileVoice.map((v: any) => (
              <div key={v.id} className="flex items-start gap-2 px-2 py-1 rounded bg-[#0F0F12]">
                <span className="text-[10px] text-[#5A5A62] font-mono shrink-0 mt-0.5">#{v.voiceIndex}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-[#8B8982]">{localeText(v.voiceTitle, locale)}</div>
                    {renderUnlockInfo(v.unlockType, v.unlockValue) && (
                      <span className="text-[9px] text-[#5A5A62]">{renderUnlockInfo(v.unlockType, v.unlockValue)}</span>
                    )}
                  </div>
                  <div className="text-xs text-[#E8E6E3]"><RichText text={localeText(v.voiceDesc, locale)} /></div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function SkillPreview({ charId, locale }: { charId: string; locale: string }) {
  const [data, setData] = useState<{ name: string; icon: string; desc: string; type: number }[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [growthRaw, growthI18n, patchRaw, patchI18n] = await Promise.all([
        getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_CharGrowthTable`, () => fetchTableDictAll('CharGrowthTable', locale)).catch(() => ({}) as Record<string, string>),
        getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return
      const growth = (growthRaw as Record<string, any>)[charId]
      const result: { name: string; icon: string; desc: string; type: number }[] = []
      if (growth?.skillGroupMap) {
        for (const g of Object.values<any>(growth.skillGroupMap)) {
          const groupName = resolveI18n(g.name, growthI18n as Record<string, string>) || g.skillGroupId || ''
          const groupIcon = g.icon || ''
          let groupDesc = resolveI18n(g.desc, growthI18n as Record<string, string>) || ''
          const skillId = g.skillIdList?.[0]
          if (skillId) {
            const entry = (patchRaw as Record<string, any>)[skillId]
            const bundle = entry?.SkillPatchDataBundle
            if (bundle?.length) {
              const first = bundle[0]
              const pDesc = resolveI18n(first.description, patchI18n as Record<string, string>) || groupDesc
              const bb: Record<string, number> = {}
              for (const b of (first.blackboard ?? [])) bb[b.key] = b.value
              groupDesc = Object.keys(bb).length > 0 ? formatBlackboard(pDesc, bb) : pDesc
            }
          }
          result.push({ name: groupName, icon: groupIcon, desc: groupDesc, type: g.skillGroupType ?? 0 })
        }
      }
      setData(result)
    }
    load()
    return () => { cancelled = true }
  }, [charId, locale])
  if (data.length === 0) return null
  return (
    <details className="group" open>
      <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">技能（{data.length}）</summary>
      <div className="mt-1 space-y-2">
        {data.map((s, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-[#0F0F12]">
            <div className="flex items-center gap-2">
              {s.icon && (
                <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${s.icon}.png`} alt=""
                  className="w-6 h-6 object-contain bg-[#1A1B23] rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <div className="text-xs text-[#E8E6E3] font-medium">{s.name}</div>
            </div>
            {s.desc && <div className="text-[10px] text-[#B0ACA6] leading-relaxed mt-1"><RichText text={s.desc} /></div>}
          </div>
        ))}
      </div>
    </details>
  )
}

function SpaceshipSkillPreview({ charId, locale }: { charId: string; locale: string }) {
  const [data, setData] = useState<{ name: string; desc: string; icon: string; roomType: number }[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [charSkillRaw, skillRaw, skillI18n] = await Promise.all([
        getCachedData<Record<string, any>>('SpaceshipCharSkillTable', () => fetchTableAll('SpaceshipCharSkillTable')).catch(() => ({})),
        getCachedData<Record<string, any>>('SpaceshipSkillTable', () => fetchTableAll('SpaceshipSkillTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SpaceshipSkillTable`, () => fetchTableDictAll('SpaceshipSkillTable', locale)).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return
      const charSkills = (charSkillRaw as Record<string, any>)[charId] as { skillList?: { skillId: string }[] } | undefined
      const result: { name: string; desc: string; icon: string; roomType: number }[] = []
      if (charSkills?.skillList) {
        for (const item of charSkills.skillList) {
          const skill = (skillRaw as Record<string, any>)[item.skillId]
          if (skill) {
            result.push({
              name: resolveI18n(skill.name, skillI18n as Record<string, string>) || item.skillId,
              desc: resolveI18n(skill.desc, skillI18n as Record<string, string>) || '',
              icon: skill.icon || '',
              roomType: skill.roomType ?? 0,
            })
          }
        }
      }
      setData(result)
    }
    load()
    return () => { cancelled = true }
  }, [charId, locale])
  if (data.length === 0) return null
  return (
    <details className="group" open>
      <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">基建技能（{data.length}）</summary>
      <div className="mt-1 space-y-2">
        {data.map((s, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-[#0F0F12]">
            <div className="flex items-center gap-2">
              {s.icon && (
                <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/spaceship/spaceshipskillicon/${s.icon}.png`} alt=""
                  className="w-6 h-6 object-contain bg-[#1A1B23] rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <div className="text-xs text-[#E8E6E3] font-medium">{s.name}</div>
              {s.roomType > 0 && <span className="text-[9px] text-[#5A5A62]">房间{s.roomType}</span>}
            </div>
            {s.desc && <div className="text-[10px] text-[#B0ACA6] leading-relaxed mt-1"><RichText text={s.desc} /></div>}
          </div>
        ))}
      </div>
    </details>
  )
}

let _skillI18n: Map<string, Record<string, string>> | null = null
async function getSkillPatchI18n(locale: string): Promise<Record<string, string>> {
  if (!_skillI18n) _skillI18n = new Map()
  let cached = _skillI18n.get(locale)
  if (!cached) {
    cached = await getCachedData<Record<string, string>>(`I18nDict_${locale}_SkillPatchTable`, () => fetchTableDictAll('SkillPatchTable', locale)).catch(() => ({}))
    _skillI18n.set(locale, cached)
  }
  return cached
}

function SkillEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const [i18n, setI18n] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => { getSkillPatchI18n(locale).then(d => { setI18n(d); setLoading(false) }) }, [locale])
  if (loading) return <div className="text-[10px] text-[#5A5A62]">加载技能…</div>

  if (op === 'changed') {
    const e = entry as { changed?: Record<string, any>; newValue?: Record<string, any> }
    if (e.changed) {
      const bundle = e.newValue?.SkillPatchDataBundle
      let formatter: ((text: string) => string) | undefined
      if (bundle?.length) {
        const bb: Record<string, number> = {}
        for (const b of (bundle[0].blackboard ?? [])) bb[b.key] = b.value
        if (Object.keys(bb).length > 0) formatter = (text: string) => formatBlackboard(text, bb)
      }
      return renderChangeEntry(entry, op, locale, formatter)
    }
    return <div className="text-[10px] text-[#5A5A62]">无技能变更</div>
  }

  const bundle = entry?.SkillPatchDataBundle
  if (!bundle?.length) return <div className="text-[10px] text-[#5A5A62]">无技能数据</div>
  const first = bundle[0]
  const name = localeText(first.skillName, locale) || resolveI18n(first.skillName, i18n) || first.skillId || ''
  const desc = localeText(first.description, locale) || resolveI18n(first.description, i18n) || ''
  const bb: Record<string, number> = {}
  for (const b of (first.blackboard ?? [])) bb[b.key] = b.value
  const formattedDesc = Object.keys(bb).length > 0 ? formatBlackboard(desc, bb) : desc
  return (
    <div className="text-xs">
      {name && <div className="text-[#E8E6E3] font-medium mb-1">{name}</div>}
      {formattedDesc && <div className="text-[#B0ACA6] leading-relaxed"><RichText text={formattedDesc} /></div>}
      <div className="text-[10px] text-[#5A5A62] mt-1">Lv.{first.level} · {bundle.length} 级</div>
    </div>
  )
}

function PotentialEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  if (op === 'changed') return renderChangeEntry(entry, op, locale)
  return <div className="text-[#8B8982] text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{renderObj(entry)}</div>
}

function SpaceshipEntry({ entry, op, locale }: { entry: any; op: string; locale: string }) {
  const [i18n, setI18n] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getCachedData<Record<string, string>>(`I18nDict_${locale}_SpaceshipSkillTable`, () => fetchTableDictAll('SpaceshipSkillTable', locale))
      .then(d => { setI18n(d); setLoading(false) }).catch(() => setLoading(false))
  }, [locale])
  if (loading) return <div className="text-[10px] text-[#5A5A62]">加载基建技能…</div>
  if (op === 'changed') return renderChangeEntry(entry, op, locale)
  const name = localeText(entry?.name, locale) || resolveI18n(entry?.name, i18n) || ''
  const desc = localeText(entry?.desc, locale) || resolveI18n(entry?.desc, i18n) || ''
  return (
    <div className="text-xs">
      {name && <div className="text-[#E8E6E3] font-medium mb-1">{name}</div>}
      {desc && <div className="text-[#B0ACA6] leading-relaxed"><RichText text={desc} /></div>}
      {entry.effectType !== undefined && <div className="text-[10px] text-[#5A5A62] mt-1">效果类型 {entry.effectType}</div>}
    </div>
  )
}

interface Props {
  versionName: string
}

export default function OperatorChangePanel({ versionName }: Props) {
  const { locale } = useLocale()
  const { data: operators, loading, error } = useOperatorAggregatedDiff(versionName)

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-medium text-[#E8E6E3] mb-3">干员变动概览</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded border border-[#2A2A32] bg-[#1A1B23] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !operators || operators.length === 0) return null

  const totalChanges = operators.reduce((s, o) => s + o.changes.length, 0)
  const withAdded = operators.filter(o => o.changes.some(c => c.op === 'added')).length
  const withRemoved = operators.filter(o => o.changes.some(c => c.op === 'removed')).length
  const withChanged = operators.filter(o => o.changes.some(c => c.op === 'changed')).length

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-[#E8E6E3]">
          干员变动概览
          <span className="text-xs text-[#5A5A62] font-normal ml-2">
            {operators.length} 名干员 · {totalChanges} 处变动
          </span>
        </h3>
        <div className="flex gap-2 text-[10px] text-[#5A5A62]">
          {withAdded > 0 && <span className="text-[#26bbfd]">新增 {withAdded}</span>}
          {withRemoved > 0 && <span className="text-[#ef4444]">移除 {withRemoved}</span>}
          {withChanged > 0 && <span className="text-[#ffbb03]">变更 {withChanged}</span>}
        </div>
      </div>

      <div className="space-y-2">
        {operators.map(op => (
          <OperatorCard key={op.charId} op={op} locale={locale} />
        ))}
      </div>
    </div>
  )
}
