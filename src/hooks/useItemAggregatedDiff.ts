import { useMemo } from 'react'
import { useTableDiff } from './useUpdateDiff'
import type { ChangedEntry } from '../lib/types-diff'

export interface ItemChange {
  itemId: string
  name: Record<string, string> | null
  rarity: number | null
  type: number | null
  iconId: string | null
  changes: {
    tableName: string
    op: 'added' | 'removed' | 'changed'
    key: string
    entry: any
  }[]
}

const ITEM_ID_TABLES = ['ItemTable', 'UsableItemChestTable'] as const

function isItemIdKey(_key: string, tableName: string): boolean {
  if ((ITEM_ID_TABLES as readonly string[]).includes(tableName)) return true
  return false
}

export function useItemAggregatedDiff(versionName: string) {
  const itemDiff = useTableDiff(versionName, 'ItemTable.json')
  const chestDiff = useTableDiff(versionName, 'UsableItemChestTable.json')

  const loading = itemDiff.loading || chestDiff.loading
  const error = itemDiff.error ?? chestDiff.error

  const data = useMemo(() => {
    const allDiffs = [
      { name: 'ItemTable', diff: itemDiff.data },
      { name: 'UsableItemChestTable', diff: chestDiff.data },
    ]
    if (allDiffs.some(d => !d.diff)) return null

    const itemIdSet = new Set<string>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      for (const entries of [diff.entries.added, diff.entries.removed, diff.entries.changed]) {
        for (const key of Object.keys(entries)) {
          if (isItemIdKey(key, name)) itemIdSet.add(key)
        }
      }
    }

    const changes = new Map<string, ItemChange>()

    function collectEntries(
      dict: Record<string, any>,
      op: 'added' | 'removed' | 'changed',
      tableName: string,
    ) {
      for (const [key, entry] of Object.entries(dict)) {
        if (!itemIdSet.has(key)) continue

        let change = changes.get(key)
        if (!change) {
          change = { itemId: key, name: null, rarity: null, type: null, iconId: null, changes: [] }
          changes.set(key, change)
        }
        change.changes.push({ tableName, op, key, entry })

        if (tableName === 'ItemTable') {
          const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
          if (!change.name) change.name = e.name ?? null
          if (change.rarity === null) change.rarity = e.rarity ?? null
          if (change.type === null) change.type = e.type ?? null
          if (!change.iconId) change.iconId = e.iconId ?? null
        }
      }
    }

    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      collectEntries(diff.entries.added, 'added', name)
      collectEntries(diff.entries.removed, 'removed', name)
      collectEntries(diff.entries.changed, 'changed', name)
    }

    return Array.from(changes.values())
  }, [itemDiff.data, chestDiff.data])

  return { data, loading, error }
}
