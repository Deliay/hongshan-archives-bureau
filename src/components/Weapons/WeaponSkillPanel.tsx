import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll, fetchI18nText } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'
import { useI18n } from '../../i18n'

interface SkillData {
  level: number
  skillName: string
  skillNameId: string
  description: string
  descriptionId: string
  iconId: string
  blackboard: Record<string, number>
}

interface WeaponSkillPanelProps {
  weaponId?: string
  skillIds?: string[]
  showLevelSlider?: boolean
}

async function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  return getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale))
}

export default function WeaponSkillPanel({ weaponId, skillIds: propSkillIds, showLevelSlider = false }: WeaponSkillPanelProps) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const [resolvedSkillIds, setResolvedSkillIds] = useState<string[] | null>(null)
  const [skillPatches, setSkillPatches] = useState<Record<string, SkillData[]>>({})
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!propSkillIds && !weaponId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        let ids: string[]
        if (propSkillIds) {
          ids = propSkillIds
        } else {
          const wpRaw = await getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable'))
          if (cancelled) return
          ids = wpRaw[weaponId!]?.weaponSkillList ?? []
        }
        if (cancelled) return
        setResolvedSkillIds(ids)

        const [patchRaw, patchI18n] = await Promise.all([
          getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')),
          getTableI18nDict('SkillPatchTable', locale),
        ])
        if (cancelled) return

        // SkillPatchTable 的 table-specific i18n dict 经常缺失技能名称与描述，
        // 这些文本实际存储在全局 i18n 中，按 id 单独获取作为回退。
        const missingIds = new Set<string>()
        const tryResolve = (id?: string | number) => {
          if (id === undefined || id === null || id === '') return ''
          const key = String(id)
          const fromTable = patchI18n[key]
          if (fromTable) return fromTable
          missingIds.add(key)
          return ''
        }

        const result: Record<string, SkillData[]> = {}
        const defaultLevels: Record<string, number> = {}
        for (const skillId of ids) {
          const bundle = patchRaw[skillId]?.SkillPatchDataBundle
          if (bundle?.length) {
            result[skillId] = bundle.map((p: any) => {
              const bb: Record<string, number> = {}
              for (const b of (p.blackboard ?? [])) {
                bb[b.key] = b.value ?? 0
              }
              return {
                level: p.level,
                skillName: tryResolve(p.skillName?.id),
                skillNameId: String(p.skillName?.id ?? ''),
                description: tryResolve(p.description?.id),
                descriptionId: String(p.description?.id ?? ''),
                iconId: p.iconId ?? '',
                blackboard: bb,
              }
            })
            defaultLevels[skillId] = showLevelSlider ? result[skillId].length : 0
          }
        }

        if (missingIds.size > 0) {
          const globalTexts = await Promise.all(
            Array.from(missingIds).map(async (id) => ({ id, text: await fetchI18nText(locale, id) }))
          )
          const globalMap = Object.fromEntries(globalTexts.filter(t => t.text).map(t => [t.id, t.text]))
          for (const patches of Object.values(result)) {
            for (const p of patches) {
              if (!p.skillName && p.skillNameId) p.skillName = globalMap[p.skillNameId] || p.skillNameId
              if (!p.description && p.descriptionId) p.description = globalMap[p.descriptionId] || p.descriptionId
            }
          }
        }

        setSkillPatches(result)
        setLevels(defaultLevels)
        setLoading(false)
      } catch (err) {
        console.error('WeaponSkillPanel load error', err)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [locale, weaponId, propSkillIds, showLevelSlider])

  if (loading) return null
  const skillIds = resolvedSkillIds ?? propSkillIds ?? []
  if (skillIds.length === 0 || Object.keys(skillPatches).length === 0) return null

  return (
    <div className="space-y-2">
      {skillIds.map((skillId) => {
        const patches = skillPatches[skillId]
        if (!patches?.length) return null
        const sorted = [...patches].sort((a, b) => a.level - b.level)
        const level = showLevelSlider ? (levels[skillId] ?? sorted[sorted.length - 1].level) : sorted[sorted.length - 1].level
        const current = patches.find(p => p.level === level) ?? sorted[sorted.length - 1]
        return (
          <div key={skillId} className="p-2 rounded bg-archive-ink border border-archive-border">
            <div className="flex items-center gap-2">
              {current.iconId && (
                <img
                  src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${current.iconId}.png`}
                  alt=""
                  className="w-6 h-6 object-contain bg-archive-file rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <span className="text-xs font-medium text-archive-ivory">{current.skillName || skillId}</span>
              <span className="text-[10px] text-archive-lead font-mono ml-auto">{t('common.level', { level: current.level })}</span>
            </div>
            {current.description && (
              <div className="mt-1 text-xs text-archive-ivory leading-relaxed">
                <RichText text={formatBlackboard(current.description, current.blackboard)} />
              </div>
            )}
            {showLevelSlider && sorted.length > 1 && (
              <div className="mt-2">
                <input
                  type="range"
                  min={sorted[0].level}
                  max={sorted[sorted.length - 1].level}
                  value={level}
                  onChange={(e) => setLevels(m => ({ ...m, [skillId]: Number(e.target.value) }))}
                  className="w-full h-1 rounded-full appearance-none bg-archive-border accent-archive-gold cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-archive-lead mt-1">
                  <span>{t('common.level', { level: sorted[0].level })}</span>
                  <span>{t('common.level', { level: sorted[sorted.length - 1].level })}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
