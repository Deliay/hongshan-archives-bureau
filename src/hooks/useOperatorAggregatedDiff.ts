import { useMemo } from 'react'
import { useTableDiff } from './useUpdateDiff'
import type { ChangedEntry } from '../lib/types-diff'

export interface OperatorChange {
  charId: string
  name: Record<string, string> | null
  profession: number | null
  rarity: number | null
  charTypeId: string | null
  charBattleTagIds: string[] | null
  mainAttrType: number | null
  subAttrType: number | null
  changes: {
    tableName: string
    op: 'added' | 'removed' | 'changed'
    key: string
    entry: any
  }[]
}

const CHAR_ID_TABLES = ['CharacterTable', 'CharGrowthTable', 'SpaceshipCharSkillTable'] as const

function extractCharId(key: string, tableName: string): string | null {
  if (tableName === 'SpaceshipSkillTable') {
    const m = key.match(/chr_\d+_[a-zA-Z]+/)
    return m ? m[0] : null
  }
  if (tableName === 'SkillPatchTable') {
    const m = key.match(/chr_\d+_[a-zA-Z]+/)
    return m ? m[0] : null
  }
  if (key.startsWith('chr_')) {
    const parts = key.split('_')
    if (parts.length >= 3) return parts.slice(0, 3).join('_')
  }
  return null
}

function collectEntries(
  dict: Record<string, any>,
  op: 'added' | 'removed' | 'changed',
  tableName: string,
  charIdSet: Set<string>,
  changes: Map<string, OperatorChange>,
) {
  for (const [key, entry] of Object.entries(dict)) {
    let charId: string | null = null
    if ((CHAR_ID_TABLES as readonly string[]).includes(tableName)) {
      charId = key
    } else {
      charId = extractCharId(key, tableName)
    }
    if (!charId || !charIdSet.has(charId)) continue

    let change = changes.get(charId)
    if (!change) {
      change = { charId, name: null, profession: null, rarity: null, charTypeId: null, charBattleTagIds: null, mainAttrType: null, subAttrType: null, changes: [] }
      changes.set(charId, change)
    }
    change.changes.push({ tableName, op, key, entry })

    if (tableName === 'CharacterTable') {
      const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
      if (!change.name) change.name = e.name ?? null
      if (change.profession === null) change.profession = e.profession ?? null
      if (change.rarity === null) change.rarity = e.rarity ?? null
      if (!change.charTypeId) change.charTypeId = e.charTypeId ?? null
      if (!change.charBattleTagIds) change.charBattleTagIds = e.charBattleTagIds ?? null
      if (change.mainAttrType === null) change.mainAttrType = e.mainAttrType ?? null
      if (change.subAttrType === null) change.subAttrType = e.subAttrType ?? null
    }
  }
}

export function useOperatorAggregatedDiff(versionName: string) {
  const charDiff = useTableDiff(versionName, 'CharacterTable.json')
  const growthDiff = useTableDiff(versionName, 'CharGrowthTable.json')
  const skillPatchDiff = useTableDiff(versionName, 'SkillPatchTable.json')
  const potentialDiff = useTableDiff(versionName, 'PotentialTalentEffectTable.json')
  const spaceshipSkillDiff = useTableDiff(versionName, 'SpaceshipSkillTable.json')
  const spaceshipCharSkillDiff = useTableDiff(versionName, 'SpaceshipCharSkillTable.json')

  const loading = charDiff.loading || growthDiff.loading || skillPatchDiff.loading ||
    potentialDiff.loading || spaceshipSkillDiff.loading || spaceshipCharSkillDiff.loading
  const error = charDiff.error ?? growthDiff.error ?? skillPatchDiff.error ??
    potentialDiff.error ?? spaceshipSkillDiff.error ?? spaceshipCharSkillDiff.error

  const data = useMemo(() => {
    const allDiffs = [
      { name: 'CharacterTable', diff: charDiff.data },
      { name: 'CharGrowthTable', diff: growthDiff.data },
      { name: 'SkillPatchTable', diff: skillPatchDiff.data },
      { name: 'SpaceshipSkillTable', diff: spaceshipSkillDiff.data },
      { name: 'SpaceshipCharSkillTable', diff: spaceshipCharSkillDiff.data },
      { name: 'PotentialTalentEffectTable', diff: potentialDiff.data },
    ]
    if (allDiffs.some(d => !d.diff)) return null

    const charIdSet = new Set<string>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      for (const entries of [diff.entries.added, diff.entries.removed]) {
        for (const key of Object.keys(entries)) {
          if ((CHAR_ID_TABLES as readonly string[]).includes(name)) {
            charIdSet.add(key)
          } else {
            const cid = extractCharId(key, name)
            if (cid) charIdSet.add(cid)
          }
        }
      }
      for (const key of Object.keys(diff.entries.changed)) {
        if ((CHAR_ID_TABLES as readonly string[]).includes(name)) {
          charIdSet.add(key)
        } else {
          const cid = extractCharId(key, name)
          if (cid) charIdSet.add(cid)
        }
      }
    }

    const changes = new Map<string, OperatorChange>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      collectEntries(diff.entries.added, 'added', name, charIdSet, changes)
      collectEntries(diff.entries.removed, 'removed', name, charIdSet, changes)
      collectEntries(diff.entries.changed, 'changed', name, charIdSet, changes)
    }

    return Array.from(changes.values())
  }, [charDiff.data, growthDiff.data, skillPatchDiff.data, potentialDiff.data, spaceshipSkillDiff.data, spaceshipCharSkillDiff.data])

  return { data, loading, error }
}
