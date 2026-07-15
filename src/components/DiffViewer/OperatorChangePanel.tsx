import { useState, useEffect } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useOperatorAggregatedDiff } from '../../hooks/useOperatorAggregatedDiff'
import type { OperatorChange } from '../../hooks/useOperatorAggregatedDiff'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'

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

function localeText(obj: unknown, locale: string): string {
  if (!obj || typeof obj !== 'object') return String(obj ?? '')
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

function renderValue(v: unknown, locale: string): string {
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
  if (tableName === 'SkillPatchTable') return <SkillEntry entry={entry} op={op} />
  if (tableName === 'PotentialTalentEffectTable') return <PotentialEntry entry={entry} op={op} locale={locale} />
  if (tableName === 'SpaceshipSkillTable') return <SpaceshipEntry entry={entry} op={op} />
  return renderChangeEntry(entry, op, locale)
}

function renderChangeEntry(entry: any, op: string, locale: string) {
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
                    <span className="text-[#ef4444]">旧 {renderValue(change.oldValue, locale)}</span>
                    <span className="text-[#26bbfd]">新 {renderValue(change.newValue, locale)}</span>
                  </div>
                </div>
              )
            }
            return (
              <div key={path} className="text-[10px]">
                <span className="text-[#5A5A62] font-mono">{path}</span>
                {Object.entries(change.changedLocales).map(([loc, val]) => {
                  const v = val as { oldText: string; newText: string }
                  return (
                    <div key={loc} className="flex gap-2 mt-0.5">
                      <span className="text-[#C9A96E]">{loc}</span>
                      <span className="text-[#ef4444]">"{v.oldText}"</span>
                      <span className="text-[#5A5A62]">→</span>
                      <span className="text-[#26bbfd]">"{v.newText}"</span>
                    </div>
                  )
                })}
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

function useFullCharData(charId: string): Record<string, any> | null {
  const [data, setData] = useState<Record<string, any> | null>(null)
  useEffect(() => {
    let cancelled = false
    getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')).then((raw) => {
      if (!cancelled) setData(raw[charId] ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [charId])
  return data
}

interface LookupMaps {
  professions: Record<number, string>
  elements: Record<string, string>
  battleTags: Record<string, string>
  attributes: Record<number, string>
}

function useLookupMaps(): LookupMaps | null {
  const [maps, setMaps] = useState<LookupMaps | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('CharProfessionTable', () => fetchTableAll('CharProfessionTable')).catch(() => ({})),
      getCachedData<Record<string, string>>('I18nDict_CN_CharProfessionTable', () => fetchTableDictAll('CharProfessionTable', 'CN')).catch(() => ({})),
      getCachedData<Record<string, any>>('CharTypeTable', () => fetchTableAll('CharTypeTable')).catch(() => ({})),
      getCachedData<Record<string, string>>('I18nDict_CN_CharTypeTable', () => fetchTableDictAll('CharTypeTable', 'CN')).catch(() => ({})),
      getCachedData<Record<string, any>>('CharBattleTagTable', () => fetchTableAll('CharBattleTagTable')).catch(() => ({})),
      getCachedData<Record<string, string>>('I18nDict_CN_CharBattleTagTable', () => fetchTableDictAll('CharBattleTagTable', 'CN')).catch(() => ({})),
      getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')).catch(() => ({})),
      getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')).catch(() => ({})),
      getCachedData<Record<string, string>>('I18nDict_CN_AttributeShowConfigTable', () => fetchTableDictAll('AttributeShowConfigTable', 'CN')).catch(() => ({})),
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
  }, [])
  return maps
}

function OperatorCard({ op, locale }: { op: OperatorChange; locale: string }) {
  const [expanded, setExpanded] = useState(false)
  const isAdded = op.changes.some(c => c.op === 'added' && c.tableName === 'CharacterTable')
  const maps = useLookupMaps()

  const fullData = useFullCharData(op.charId)

  const name = localeText(op.name, locale) || (fullData ? localeText(fullData.name, locale) : '') || op.charId
  const rarity = op.rarity ?? fullData?.rarity ?? 0
  const professionVal = op.profession ?? fullData?.profession
  const charTypeId = op.charTypeId ?? fullData?.charTypeId ?? ''
  const tags: string[] = fullData?.charBattleTagIds ?? []
  const mainAttrType: number = fullData?.mainAttrType ?? 0
  const subAttrType: number = fullData?.subAttrType ?? 0

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
            <AddedOperatorDetail charId={op.charId} entry={addedEntry.entry} name={name} rarity={rarity} />
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

function AddedOperatorDetail({ charId, entry, name, rarity }: { charId: string; entry: any; name: string; rarity: number }) {
  const maps = useLookupMaps()

  const profId: number = entry?.profession ?? 0
  const charType: string = entry?.charTypeId ?? ''
  const mainAttrType: number = entry?.mainAttrType ?? 0
  const subAttrType: number = entry?.subAttrType ?? 0
  const tags: string[] = entry?.charBattleTagIds ?? []
  const professionName = maps?.professions[profId] ?? (profId > 0 ? `职业${profId}` : '')
  const elementName = maps?.elements[charType] ?? charType
  const mainAttrName = maps?.attributes[mainAttrType] ?? (mainAttrType > 0 ? `属性${mainAttrType}` : '')
  const subAttrName = maps?.attributes[subAttrType] ?? (subAttrType > 0 ? `属性${subAttrType}` : '')

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`}
          alt="" className="w-16 h-16 object-cover bg-[#0F0F12] rounded border border-[#2A2A32]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-[#E8E6E3]">{name}</div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8B8982]">
            {professionName && <span>{professionName}</span>}
            {elementName && <><span>·</span><span>{elementName}</span></>}
            <span>·</span>
            <StarRating level={rarity} />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((t, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{maps?.battleTags[t] || t}</span>
              ))}
            </div>
          )}
          {(mainAttrName || subAttrName) && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#B0ACA6]">
              {mainAttrName && <span>主能力 {mainAttrName}</span>}
              {subAttrName && <span>副能力 {subAttrName}</span>}
            </div>
          )}
        </div>
      </div>

      <SkillPreview charId={charId} />

      {entry?.profileRecord && entry.profileRecord.length > 0 && (
        <details className="group">
          <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">
            档案记录（{entry.profileRecord.length}）
          </summary>
          <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
            {entry.profileRecord.map((r: any) => (
              <div key={r.id} className="px-2 py-1 rounded bg-[#0F0F12]">
                <div className="text-[10px] text-[#8B8982]">{localeText(r.recordTitle, 'CN')}</div>
                <div className="text-xs text-[#E8E6E3] mt-0.5 whitespace-pre-wrap line-clamp-3">
                  {localeText(r.recordDesc, 'CN')}
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
                  <div className="text-[10px] text-[#8B8982]">{localeText(v.voiceTitle, 'CN')}</div>
                  <div className="text-xs text-[#E8E6E3]">{localeText(v.voiceDesc, 'CN')}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function SkillPreview({ charId }: { charId: string }) {
  const [skillGroups, setSkillGroups] = useState<{ name: string; type: number }[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [growthRaw, growthI18n] = await Promise.all([
        getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')).catch(() => ({})),
        getCachedData<Record<string, string>>('I18nDict_CN_CharGrowthTable', () => fetchTableDictAll('CharGrowthTable', 'CN')).catch(() => ({}) as Record<string, string>),
      ])
      if (cancelled) return
      const growth = (growthRaw as Record<string, any>)[charId]
      const result: { name: string; type: number }[] = []
      if (growth?.skillGroupMap) {
        for (const g of Object.values<any>(growth.skillGroupMap)) {
          result.push({
            name: resolveI18n(g.name, growthI18n as Record<string, string>) || g.skillGroupId || '',
            type: g.skillGroupType ?? 0,
          })
        }
      }
      setSkillGroups(result)
    }
    load()
    return () => { cancelled = true }
  }, [charId])
  if (skillGroups.length === 0) return null
  return (
    <details className="group" open>
      <summary className="text-xs text-[#8B8982] cursor-pointer hover:text-[#C9A96E] transition-colors">技能（{skillGroups.length}）</summary>
      <div className="mt-1 space-y-1">
        {skillGroups.map((s, i) => (
          <div key={i} className="px-2 py-1 rounded bg-[#0F0F12] text-xs text-[#E8E6E3]">{s.name}</div>
        ))}
      </div>
    </details>
  )
}

let _skillI18n: Record<string, string> | null = null
async function getSkillPatchI18n(): Promise<Record<string, string>> {
  if (!_skillI18n) {
    _skillI18n = await getCachedData<Record<string, string>>('I18nDict_CN_SkillPatchTable', () => fetchTableDictAll('SkillPatchTable', 'CN')).catch(() => ({}))
  }
  return _skillI18n
}

function SkillEntry({ entry, op }: { entry: any; op: string }) {
  const [i18n, setI18n] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => { getSkillPatchI18n().then(d => { setI18n(d); setLoading(false) }) }, [])
  if (loading) return <div className="text-[10px] text-[#5A5A62]">加载技能…</div>

  if (op === 'changed') {
    const e = entry as { changed?: Record<string, any> }
    if (e.changed) return renderChangeEntry(entry, op, 'CN')
    return <div className="text-[10px] text-[#5A5A62]">无技能变更</div>
  }

  const bundle = entry?.SkillPatchDataBundle
  if (!bundle?.length) return <div className="text-[10px] text-[#5A5A62]">无技能数据</div>
  const first = bundle[0]
  const name = resolveI18n(first.skillName, i18n) || first.skillId || ''
  const desc = resolveI18n(first.description, i18n) || ''
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

function SpaceshipEntry({ entry, op }: { entry: any; op: string }) {
  const [i18n, setI18n] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getCachedData<Record<string, string>>('I18nDict_CN_SpaceshipSkillTable', () => fetchTableDictAll('SpaceshipSkillTable', 'CN'))
      .then(d => { setI18n(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  if (loading) return <div className="text-[10px] text-[#5A5A62]">加载基建技能…</div>
  if (op === 'changed') return renderChangeEntry(entry, op, 'CN')
  const name = resolveI18n(entry?.name, i18n) || ''
  const desc = resolveI18n(entry?.desc, i18n) || ''
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
