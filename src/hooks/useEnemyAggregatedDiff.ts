import { useMemo } from 'react'
import { useTableDiff } from './useUpdateDiff'
import type { ChangedEntry } from '../lib/types-diff'

export interface EnemyChange {
  templateId: string
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

const ENEMY_ID_TABLES = ['EnemyTemplateDisplayInfoTable', 'EnemyAttributeTemplateTable'] as const

function getTemplateId(entry: any, tableName: string): string | null {
  if ((ENEMY_ID_TABLES as readonly string[]).includes(tableName)) return null
  if (tableName === 'EnemyTable') {
    if (!entry || typeof entry !== 'object') return null
    if ('templateId' in entry && typeof entry.templateId === 'string') return entry.templateId
    if ('newValue' in entry && entry.newValue?.templateId) return entry.newValue.templateId
    if ('oldValue' in entry && entry.oldValue?.templateId) return entry.oldValue.templateId
  }
  return null
}

function extractEnemyId(key: string, tableName: string, entry: any): string | null {
  if ((ENEMY_ID_TABLES as readonly string[]).includes(tableName)) {
    return key
  }
  return getTemplateId(entry, tableName)
}

function collectEntries(
  dict: Record<string, any>,
  op: 'added' | 'removed' | 'changed',
  tableName: string,
  enemyIdSet: Set<string>,
  changes: Map<string, EnemyChange>,
) {
  for (const [key, entry] of Object.entries(dict)) {
    const templateId = extractEnemyId(key, tableName, entry)
    if (!templateId || !enemyIdSet.has(templateId)) continue

    let change = changes.get(templateId)
    if (!change) {
      change = { templateId, name: null, nickname: null, displayType: null, tags: null, changes: [] }
      changes.set(templateId, change)
    }
    change.changes.push({ tableName, op, key, entry })

    if (tableName === 'EnemyTemplateDisplayInfoTable') {
      const e = op === 'changed' ? (entry as ChangedEntry).newValue : entry
      if (!change.name) change.name = e.name ?? null
      if (!change.nickname) change.nickname = e.nickname ?? null
      if (change.displayType === null) change.displayType = e.displayType ?? null
      if (!change.tags) change.tags = e.tags ?? null
    }
  }
}

export function useEnemyAggregatedDiff(versionName: string) {
  const displayDiff = useTableDiff(versionName, 'EnemyTemplateDisplayInfoTable.json')
  const enemyDiff = useTableDiff(versionName, 'EnemyTable.json')
  const attrDiff = useTableDiff(versionName, 'EnemyAttributeTemplateTable.json')

  const loading = displayDiff.loading || enemyDiff.loading || attrDiff.loading
  const error = displayDiff.error ?? enemyDiff.error ?? attrDiff.error

  const data = useMemo(() => {
    const allDiffs = [
      { name: 'EnemyTemplateDisplayInfoTable', diff: displayDiff.data },
      { name: 'EnemyTable', diff: enemyDiff.data },
      { name: 'EnemyAttributeTemplateTable', diff: attrDiff.data },
    ]
    if (allDiffs.some(d => !d.diff)) return null

    const enemyIdSet = new Set<string>()
    for (const { name, diff } of allDiffs) {
      if (!diff) continue
      for (const entries of [diff.entries.added, diff.entries.removed, diff.entries.changed]) {
        for (const [key, entry] of Object.entries(entries)) {
          const eid = extractEnemyId(key, name, entry)
          if (eid) enemyIdSet.add(eid)
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
  }, [displayDiff.data, enemyDiff.data, attrDiff.data])

  return { data, loading, error }
}
