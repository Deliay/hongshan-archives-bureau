import { resolveI18n } from '../adapter'
import type { FactoryRecipe, FactoryMachine, FactorySource } from './types'

function flattenGroup(group: { group: { id: string; count: number }[] }[]): { itemId: string; count: number }[] {
  if (!Array.isArray(group) || group.length === 0) return []
  // 材料恒为单组（全表 0 个多材料组配方），组内多物品皆为必需
  const first = group[0]?.group
  if (!Array.isArray(first)) return []
  return first.map(g => ({ itemId: g.id, count: g.count }))
}

/** 产出语义与材料不同：多 group = 每组一个副产物（如 污水/惰性壤晶废液），需全部展开 */
function flattenOutcomeGroups(groups: { group: { id: string; count: number }[] }[]): { itemId: string; count: number }[] {
  if (!Array.isArray(groups)) return []
  const result: { itemId: string; count: number }[] = []
  for (const g of groups) {
    for (const item of g?.group ?? []) {
      result.push({ itemId: item.id, count: item.count })
    }
  }
  return result
}

export function adaptFactoryRecipe(raw: any): FactoryRecipe {
  return {
    id: raw.formulaId ?? raw.id ?? raw.$key ?? '',
    machineId: raw.machineId ?? '',
    ingredients: flattenGroup(raw.ingredients ?? []),
    outcomes: flattenOutcomeGroups(raw.outcomes ?? []),
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

/** 可泵采液体白名单（硬编码）：酸/清水支持无限来源采集，但链路中需放置对应水泵 */
export const PUMPABLE_LIQUIDS = new Set(['item_liquid_acid', 'item_liquid_water'])

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
  // FactoryFluidPumpInTable 结构与矿机表不同：用 enableLiquidIds 列举可泵采液体，
  // 无 produceRate（隐含每 msPerRound 1 单位），视为无限来源
  for (const [machineId, entry] of Object.entries(pumpRaw)) {
    const enableLiquidIds: string[] = Array.isArray(entry?.enableLiquidIds) ? entry.enableLiquidIds : []
    for (const itemId of enableLiquidIds) {
      if (!PUMPABLE_LIQUIDS.has(itemId)) continue
      sources.push({
        machineId,
        itemId,
        produceRate: 1,
        msPerRound: entry?.msPerRound ?? 1000,
        uncapped: true,
      })
    }
  }

  return sources
}
