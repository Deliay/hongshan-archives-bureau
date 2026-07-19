import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll } from '../../lib/api'
import SkillReferenceCard from '../skills/SkillReferenceCard'

interface WeaponSkillPanelProps {
  weaponId?: string
  skillIds?: string[]
  showLevelSlider?: boolean
}

export default function WeaponSkillPanel({ weaponId, skillIds: propSkillIds, showLevelSlider = false }: WeaponSkillPanelProps) {
  const [resolvedSkillIds, setResolvedSkillIds] = useState<string[] | null>(null)
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
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [weaponId, propSkillIds])

  if (loading) return null
  const skillIds = resolvedSkillIds ?? propSkillIds ?? []
  if (skillIds.length === 0) return null

  return (
    <div className="space-y-2">
      {skillIds.map(skillId => (
        <SkillReferenceCard
          key={skillId}
          skillId={skillId}
          showLevelSlider={showLevelSlider}
        />
      ))}
    </div>
  )
}
