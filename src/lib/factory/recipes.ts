import { resolveI18n } from '../adapter'
import type { FactoryRecipe, FactoryMachine, FactorySource, FactoryItemIndex } from './types'

function flattenGroup(group: { id: string; count: number }[][]): { itemId: string; count: number }[] {
  if (group.length === 0) return []
  // TODO: 多 group 语义待验证，当前取首 group
  return group[0].map(g => ({ itemId: g.id, count: g.count }))
}

export function adaptFactoryRecipe(raw: any): FactoryRecipe {
  return {
    id: raw.formulaId ?? raw.$key ?? '',
    machineId: raw.machineId ?? '',
    ingredients: flattenGroup(raw.ingredients ?? []),
    outcomes: flattenGroup(raw.outcomes ?? []),
    totalProgress: raw.totalProgress ?? 0,
    sortId: raw.sortId ?? 0,
  }
}

export function adaptFactoryMachine(raw: any, i18nMap?: Record<string, string>): FactoryMachine {
  return {
    id: raw.buildingId ?? raw.$key ?? '',
    name: resolveI18n(raw.name, i18nMap) || raw.buildingId || '',
    iconId: raw.iconOnPanel ?? '',
  }
}

export function buildFactoryItemIndex(
  incomeRaw: Record<string, any>,
  outcomeRaw: Record<string, any>,
): FactoryItemIndex {
  const asIngredient: Record<string, string[]> = {}
  const asOutcome: Record<string, string[]> = {}

  for (const [, entry] of Object.entries(incomeRaw)) {
    const list: string[] = entry?.list ?? []
    for (const formulaId of list) {
      if (!asIngredient[formulaId]) asIngredient[formulaId] = []
    }
  }
  for (const [itemId, entry] of Object.entries(incomeRaw)) {
    const list: string[] = entry?.list ?? []
    for (const formulaId of list) {
      if (!asIngredient[itemId]) asIngredient[itemId] = []
      asIngredient[itemId].push(formulaId)
    }
  }
  for (const [itemId, entry] of Object.entries(outcomeRaw)) {
    const list: string[] = entry?.list ?? []
    for (const formulaId of list) {
      if (!asOutcome[itemId]) asOutcome[itemId] = []
      asOutcome[itemId].push(formulaId)
    }
  }

  return { asIngredient, asOutcome }
}

export function adaptFactorySources(
  minerRaw: Record<string, any>,
  gasMinerRaw: Record<string, any>,
  pumpRaw: Record<string, any>,
): FactorySource[] {
  const sources: FactorySource[] = []

  for (const [machineId, entry] of Object.entries(minerRaw)) {
    for (const m of entry?.mineable ?? []) {
      sources.push({
        machineId,
        itemId: m.miningItemId ?? '',
        produceRate: m.produceRate ?? 0,
        msPerRound: entry.msPerRound ?? 1000,
      })
    }
  }
  for (const [machineId, entry] of Object.entries(gasMinerRaw)) {
    for (const m of entry?.mineable ?? []) {
      sources.push({
        machineId,
        itemId: m.miningItemId ?? '',
        produceRate: m.produceRate ?? 0,
        msPerRound: entry.msPerRound ?? 1000,
      })
    }
  }
  for (const [machineId, entry] of Object.entries(pumpRaw)) {
    for (const m of entry?.mineable ?? []) {
      sources.push({
        machineId,
        itemId: m.miningItemId ?? '',
        produceRate: m.produceRate ?? 0,
        msPerRound: entry.msPerRound ?? 1000,
      })
    }
  }

  return sources
}
