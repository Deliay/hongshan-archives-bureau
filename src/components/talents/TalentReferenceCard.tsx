import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll, fetchI18nText } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'
import { buildTalentNodeIndex } from '../../lib/search'
import type { TalentNodeRef } from '../../lib/types'

interface TalentReferenceCardProps {
  talentEffectId: string
  className?: string
}

async function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  return getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale))
}

export default function TalentReferenceCard({ talentEffectId, className }: TalentReferenceCardProps) {
  const { locale } = useLocale()
  const [talentNode, setTalentNode] = useState<TalentNodeRef | null>(null)
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const nodeIndex = await buildTalentNodeIndex(locale)
        if (cancelled) return

        const node = nodeIndex[talentEffectId]
        if (!node) {
          setLoading(false)
          return
        }
        setTalentNode(node)

        const [talentRaw, talentI18n] = await Promise.all([
          getCachedData<Record<string, any>>('PotentialTalentEffectTable', () => fetchTableAll('PotentialTalentEffectTable')),
          getTableI18nDict('PotentialTalentEffectTable', locale),
        ])
        if (cancelled) return

        const talentData = talentRaw[talentEffectId]
        const descId = talentData?.desc?.id
        const descFromDict = descId != null ? talentI18n[String(descId)] : ''
        const descFromGlobal = descFromDict || (descId != null ? await fetchI18nText(locale, String(descId)) : '')

        const blackboards: Record<string, number> = {}
        for (const dl of (talentData?.dataList ?? [])) {
          for (const b of (dl.attachSkill?.blackboard ?? [])) blackboards[b.key] = b.value ?? 0
          for (const b of (dl.attachBuff?.blackboard ?? [])) blackboards[b.key] = b.value ?? 0
        }

        if (cancelled) return
        setDescription(descFromGlobal ? formatBlackboard(descFromGlobal, blackboards) : '')

        const nameId = node.nameRef?.id
        const nameFromDict = nameId != null ? talentI18n[String(nameId)] : ''
        const nameFromGlobal = nameFromDict || (nameId != null ? await fetchI18nText(locale, String(nameId)) : '')
        if (!cancelled) setName(nameFromGlobal || '')
        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [talentEffectId, locale])

  if (loading || !talentNode) return null

  return (
    <div className={`p-2 rounded bg-archive-ink border border-archive-border ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        {talentNode.iconId && (
          <img
            src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${talentNode.iconId}.png`}
            alt=""
            className="w-6 h-6 object-contain bg-archive-file rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-xs font-medium text-archive-ivory">{name || talentEffectId}</span>
        <span className="text-[10px] text-archive-gold font-mono ml-auto">Lv.{talentNode.level}</span>
      </div>
      {description && (
        <div className="mt-1 text-xs text-archive-ivory leading-relaxed">
          <RichText text={description} />
        </div>
      )}
    </div>
  )
}
