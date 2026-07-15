import { useMemo } from 'react'
import { useTableDiff } from './useUpdateDiff'
import type { ChangedEntry } from '../lib/types-diff'

export interface EnemyChange {
  enemyId: string
  name: Record<string, string> | null
  nickname: Record<string, string> | null
  displayType: number | null
  tags: string[] | null
  changes: {
    tableName: string
    op: 'added' | 'removed' | 'changed'
    key: string
    entry: any
  }[]
}

function getEntryTemplateId(entry: any): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  if ('newValue' in entry && entry.newValue?.templateId) return entry.newValue.templateId
  if ('templateId' in entry && typeof entry.templateId === 'string') return entry.templateId
  return undefined
}

function resolveGroupKey(key: string, entry: any, tableName: string): string {
  if (tableName === 'EnemyTemplateDisplayInfoTable' || tableName === 'EnemyAttributeTemplateTable') return key
  const tpl = getEntryTemplateId(entry)
  if (tpl && tpl !== key) return tpl
  return key
}

function collectEntries(
  dict: Record<string, any>,
  op: 'added' | 'removed' | 'changed',
  tableName: string,
  enemyIdSet: Set<string>,
  changes: Map<string, EnemyChange>,
) {
  for (const [key, entry] of Object.entries(dict)) {
    const groupId = resolveGroupKey(key, entry, tableName)
    if (!groupId || !enemyIdSet.has(groupId)) continue

    let change = changes.get(groupId)
    if (!change) {
      change = { enemyId: groupId, name: null, nickname: null, displayType: null, tags: null, changes: [] }
      changes.set(groupId, change)
    }
    change.changes.push({ tableName, op, key, entry })

    if (tableName === 'EnemyTemplateDisplayInfoTable' || tableName === 'EnemyDisplayInfoTable') {
      const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
      if (!change.name) change.name = e.name ?? null
      if (!change.nickname) change.nickname = e.nickname ?? null
      if (change.displayType === null) change.displayType = e.displayType ?? null
      if (!change.tags) change.tags = e.tags ?? null
    }
  }
}

export function useEnemyAggregatedDiff(versionName: string) {
  const templateDisplayDiff = useTableDiff(versionName, 'EnemyTemplateDisplayInfoTable.json')
  const displayDiff = useTableDiff(versionName, 'EnemyDisplayInfoTable.json')
  const enemyDiff = useTableDiff(versionName, 'EnemyTable.json')
  const attrDiff = useTableDiff(versionName, 'EnemyAttributeTemplateTable.json')

  const loading = templateDisplayDiff.loading || displayDiff.loading || enemyDiff.loading || attrDiff.loading
  const error = templateDisplayDiff.error ?? displayDiff.error ?? enemyDiff.error ?? attrDiff.error

  const data = useMemo(() => {
    const allDiffs = [
      { name: 'EnemyTemplateDisplayInfoTable', diff: templateDisplayDiff.data },
      { name: 'EnemyDisplayInfoTable', diff: displayDiff.data },
      { name: 'EnemyTable', diff: enemyDiff.data },
      { name: 'EnemyAttributeTemplateTable', diff: attrDiff.data },
    ]
    if (allDiffs.some(d => !d.diff)) return null

    const enemyIdSet = new Set<string>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      for (const entries of [diff.entries.added, diff.entries.removed, diff.entries.changed]) {
        for (const [key, entry] of Object.entries(entries)) {
          const groupId = resolveGroupKey(key, entry, name)
          if (groupId) {
            enemyIdSet.add(groupId)
            // Also add all unique key references so they stay in the set
            enemyIdSet.add(key)
          }
        }
      }
    }

    const changes = new Map<string, EnemyChange>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      collectEntries(diff.entries.added, 'added', name, enemyIdSet, changes)
      collectEntries(diff.entries.removed, 'removed', name, enemyIdSet, changes)
      collectEntries(diff.entries.changed, 'changed', name, enemyIdSet, changes)
    }

    return Array.from(changes.values())
  }, [templateDisplayDiff.data, displayDiff.data, enemyDiff.data, attrDiff.data])

  return { data, loading, error }
}
