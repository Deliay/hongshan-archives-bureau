import { useMemo } from 'react'
import { useTableDiff } from './useUpdateDiff'
import type { ChangedEntry } from '../lib/types-diff'

export interface WeaponChange {
  weaponId: string
  name: Record<string, string> | null
  rarity: number | null
  weaponType: number | null
  iconId: string | null
  changes: {
    tableName: string
    op: 'added' | 'removed' | 'changed'
    key: string
    entry: any
  }[]
}

const WEAPON_ID_TABLES = ['WeaponBasicTable', 'ItemTable'] as const

const WP_RE = /wpn_[a-z]+_\d{4}/

function extractWeaponId(key: string, tableName: string): string | null {
  if ((WEAPON_ID_TABLES as readonly string[]).includes(tableName)) {
    return key.startsWith('wpn_') ? key : null
  }
  if (tableName === 'SkillPatchTable') {
    const m = key.match(WP_RE)
    return m ? m[0] : null
  }
  return null
}

function collectEntries(
  dict: Record<string, any>,
  op: 'added' | 'removed' | 'changed',
  tableName: string,
  weaponIdSet: Set<string>,
  changes: Map<string, WeaponChange>,
) {
  for (const [key, entry] of Object.entries(dict)) {
    const weaponId = extractWeaponId(key, tableName)
    if (!weaponId || !weaponIdSet.has(weaponId)) continue

    let change = changes.get(weaponId)
    if (!change) {
      change = { weaponId, name: null, rarity: null, weaponType: null, iconId: null, changes: [] }
      changes.set(weaponId, change)
    }
    change.changes.push({ tableName, op, key, entry })

    if (tableName === 'ItemTable') {
      const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
      if (!change.name) change.name = e.name ?? null
      if (!change.iconId) change.iconId = e.iconId ?? null
    }
    if (tableName === 'WeaponBasicTable') {
      const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
      if (change.rarity === null) change.rarity = e.rarity ?? null
      if (change.weaponType === null) change.weaponType = e.weaponType ?? null
    }
  }
}

export function useWeaponAggregatedDiff(versionName: string) {
  const weaponBasicDiff = useTableDiff(versionName, 'WeaponBasicTable.json')
  const itemDiff = useTableDiff(versionName, 'ItemTable.json')
  const skillPatchDiff = useTableDiff(versionName, 'SkillPatchTable.json')

  const loading = weaponBasicDiff.loading || itemDiff.loading || skillPatchDiff.loading
  const error = weaponBasicDiff.error ?? itemDiff.error ?? skillPatchDiff.error

  const data = useMemo(() => {
    const allDiffs = [
      { name: 'WeaponBasicTable', diff: weaponBasicDiff.data },
      { name: 'ItemTable', diff: itemDiff.data },
      { name: 'SkillPatchTable', diff: skillPatchDiff.data },
    ]
    if (allDiffs.some(d => !d.diff)) return null

    const weaponIdSet = new Set<string>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      for (const entries of [diff.entries.added, diff.entries.removed, diff.entries.changed]) {
        for (const key of Object.keys(entries)) {
          const wid = extractWeaponId(key, name)
          if (wid) weaponIdSet.add(wid)
        }
      }
    }

    const changes = new Map<string, WeaponChange>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      collectEntries(diff.entries.added, 'added', name, weaponIdSet, changes)
      collectEntries(diff.entries.removed, 'removed', name, weaponIdSet, changes)
      collectEntries(diff.entries.changed, 'changed', name, weaponIdSet, changes)
    }

    return Array.from(changes.values())
  }, [weaponBasicDiff.data, itemDiff.data, skillPatchDiff.data])

  return { data, loading, error }
}
