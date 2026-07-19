import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll, fetchI18nText } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'
import { useI18n } from '../../i18n'
import SubDescList from './SubDescList'

interface SubDescEntry {
  name: string
  value: string
}

interface SkillLevelData {
  level: number
  skillName: string
  skillNameId: string
  description: string
  descriptionId: string
  iconId: string
  blackboard: Record<string, number>
  subDescs: SubDescEntry[]
}

interface SkillReferenceCardProps {
  skillId: string
  showLevelSlider?: boolean
  defaultLevel?: number
  defaultPatchIndex?: number
  className?: string
  skillGroupName?: string
}

async function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  return getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale))
}

export default function SkillReferenceCard({
  skillId,
  showLevelSlider = false,
  defaultLevel,
  defaultPatchIndex,
  className,
  skillGroupName,
}: SkillReferenceCardProps) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const [patches, setPatches] = useState<SkillLevelData[]>([])
  const [level, setLevel] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [patchRaw, patchI18n] = await Promise.all([
          getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')),
          getTableI18nDict('SkillPatchTable', locale),
        ])
        if (cancelled) return

        const bundle = patchRaw[skillId]?.SkillPatchDataBundle ?? []
        const missingIds = new Set<string>()
        const tryResolve = (id?: string | number) => {
          if (id === undefined || id === null || id === '') return ''
          const key = String(id)
          const fromTable = patchI18n[key]
          if (fromTable) return fromTable
          missingIds.add(key)
          return ''
        }

        const parsed = bundle.map((p: any) => {
          const bb: Record<string, number> = {}
          for (const b of (p.blackboard ?? [])) bb[b.key] = b.value ?? 0
          const subDescs: SubDescEntry[] = (p.subDescDataList ?? []).map((sd: any) => ({
            name: tryResolve(sd.name?.id),
            value: String(sd.desc ?? ''),
          }))
          return {
            level: p.level,
            skillName: tryResolve(p.skillName?.id),
            skillNameId: String(p.skillName?.id ?? ''),
            description: tryResolve(p.description?.id),
            descriptionId: String(p.description?.id ?? ''),
            iconId: p.iconId ?? '',
            blackboard: bb,
            subDescs,
          }
        })

        if (missingIds.size > 0) {
          const globalTexts = await Promise.all(
            Array.from(missingIds).map(async (id) => ({ id, text: await fetchI18nText(locale, id) }))
          )
          const globalMap = Object.fromEntries(globalTexts.filter(t => t.text).map(t => [t.id, t.text]))
          for (const p of parsed) {
            if (!p.skillName && p.skillNameId && p.skillNameId !== '0') p.skillName = globalMap[p.skillNameId] || p.skillNameId
            if (!p.description && p.descriptionId && p.descriptionId !== '0') p.description = globalMap[p.descriptionId] || p.descriptionId
          }
        }

        if (cancelled) return
        setPatches(parsed)

        if (parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => a.level - b.level)
          const target = (defaultPatchIndex !== undefined ? bundle[defaultPatchIndex]?.level : undefined) ?? defaultLevel ?? sorted[sorted.length - 1].level
          const found = sorted.find(p => p.level === target)
          setLevel(found ? found.level : sorted[sorted.length - 1].level)
        }
      } catch {
        // 加载失败时静默降级，组件返回 null
      }
    }
    load()
    return () => { cancelled = true }
  }, [skillId, locale, defaultLevel, defaultPatchIndex])

  if (patches.length === 0 || level === null) return null

  const sorted = [...patches].sort((a, b) => a.level - b.level)
  const current = patches.find(p => p.level === level) ?? sorted[sorted.length - 1]

  return (
    <div className={`p-2 rounded bg-archive-ink border border-archive-border ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        {current.iconId && (
          <img
            src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${current.iconId}.png`}
            alt=""
            className="w-6 h-6 object-contain bg-archive-file rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-xs font-medium text-archive-ivory">{current.skillName || skillGroupName || skillId}</span>
        <span className="text-[10px] text-archive-lead font-mono ml-auto">{t('common.level', { level: current.level })}</span>
      </div>
      {current.description && (
        <div className="mt-1 text-xs text-archive-ivory leading-relaxed">
          <RichText text={formatBlackboard(current.description, current.blackboard)} />
        </div>
      )}
      <SubDescList entries={current.subDescs} />
      {showLevelSlider && sorted.length > 1 && (
        <div className="mt-2">
          <input
            type="range"
            min={sorted[0].level}
            max={sorted[sorted.length - 1].level}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
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
}
