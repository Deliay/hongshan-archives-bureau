import { useState } from 'react'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE } from '../../lib/adapter'
import { useOperatorAggregatedDiff } from '../../hooks/useOperatorAggregatedDiff'
import type { OperatorChange } from '../../hooks/useOperatorAggregatedDiff'

const RARITY_COLORS = ['#6b7280', '#6b7280', '#6b7280', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

const PROFESSION_NAMES: Record<number, string> = {
  1: '先锋', 2: '近卫', 3: '重装', 4: '狙击',
  5: '术士', 6: '辅助', 7: '特种', 8: '医疗',
}

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
  const color = RARITY_COLORS[level] || '#6b7280'
  return (
    <span className="inline-flex gap-0.5 text-xs" style={{ color }}>
      {'✦'.repeat(Math.min(level, 7))}
    </span>
  )
}

function ChangeBadge({ label, color, count }: { label: string; color: string; count: number }) {
  if (count === 0) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label}
      <span className="opacity-60">×{count}</span>
    </span>
  )
}

function OperatorCard({ op, locale }: { op: OperatorChange; locale: string }) {
  const [expanded, setExpanded] = useState(false)
  const name = localeText(op.name, locale) || op.charId
  const rarity = op.rarity ?? 0
  const profession = op.profession
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

  return (
    <div className="border border-[#2A2A32] rounded bg-[#1A1B23] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#22222C] transition-colors"
      >
        <div className="w-12 h-12 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0">
          <img
            src={portraitUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-sm font-medium text-[#E8E6E3]">{name}</span>
              <span className="text-[10px] text-[#5A5A62] font-mono ml-2">{op.charId}</span>
            </div>
            <StarRating level={rarity} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {profession !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">
                {PROFESSION_NAMES[profession!] || `职业${profession}`}
              </span>
            )}
            {op.charTypeId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">
                {op.charTypeId}
              </span>
            )}
            <span className="text-[10px] text-[#5A5A62]">
              {changeCategories.added > 0 && <span className="text-[#26bbfd] mr-1">+{changeCategories.added}</span>}
              {changeCategories.removed > 0 && <span className="text-[#ef4444] mr-1">-{changeCategories.removed}</span>}
              {changeCategories.changed > 0 && <span className="text-[#ffbb03]">~{changeCategories.changed}</span>}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(tableCounts).map(([table, info]) => (
              <ChangeBadge
                key={table}
                label={TABLE_LABELS[table] || table}
                color={TABLE_COLORS[table] || '#8B8982'}
                count={info.count}
              />
            ))}
          </div>
        </div>
        <span className={`text-[#5A5A62] text-xs mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#2A2A32] p-3 space-y-2">
          {op.changes.map((c) => {
            const label = TABLE_LABELS[c.tableName] || c.tableName
            const color = TABLE_COLORS[c.tableName] || '#8B8982'
            const opLabel = c.op === 'added' ? '新增' : c.op === 'removed' ? '移除' : '变更'
            const opColor = c.op === 'added' ? '#26bbfd' : c.op === 'removed' ? '#ef4444' : '#ffbb03'
            const e = c.entry
            const value = c.op === 'changed' ? (e as any).newValue ?? (e as any).oldValue : e
            const detail = typeof value === 'object' ? JSON.stringify(value).slice(0, 120) : String(value)
            return (
              <div key={c.tableName + c.key} className="text-xs border-b border-[#2A2A32]/50 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#5A5A62]">{c.key}</span>
                  <span className="font-mono text-[10px] px-1 rounded" style={{ backgroundColor: `${color}18`, color }}>{label}</span>
                  <span className="text-[10px] font-mono" style={{ color: opColor }}>{opLabel}</span>
                </div>
                <div className="text-[#8B8982] mt-0.5 truncate">{detail}</div>
              </div>
            )
          })}
        </div>
      )}
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
