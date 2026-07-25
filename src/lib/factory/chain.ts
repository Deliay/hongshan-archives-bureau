import type { FactoryRecipe, FactoryItemIndex, FactorySource, ChainGraph, ChainNode, ChainEdge } from './types'

export function perMinute(count: number, totalProgress: number): number {
  return totalProgress > 0 ? (count * 60000) / totalProgress : 0
}

export function sourcePerMinute(produceRate: number, msPerRound: number): number {
  return msPerRound > 0 ? (produceRate * 60000) / msPerRound : 0
}

export function buildChainGraph(
  targets: string[],
  recipes: FactoryRecipe[],
  index: FactoryItemIndex,
  sources: FactorySource[],
  defaultCrafts: Record<string, string>,
  recipeOverride?: Record<string, string>,
): ChainGraph {
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  const sourceByItem = new Map<string, FactorySource>()
  for (const s of sources) {
    if (!sourceByItem.has(s.itemId)) sourceByItem.set(s.itemId, s)
  }

  const allNodes = new Map<string, ChainNode>()
  const allEdges: ChainEdge[] = []

  function resolveRecipe(itemId: string): FactoryRecipe | null {
    const overrideId = recipeOverride?.[itemId]
    if (overrideId && recipeById.has(overrideId)) return recipeById.get(overrideId)!
    const defaultId = defaultCrafts[itemId]
    if (defaultId && recipeById.has(defaultId)) return recipeById.get(defaultId)!
    const outcomeRecipes = index.asOutcome[itemId]
    if (outcomeRecipes?.length) {
      return outcomeRecipes[0]
    }
    return null
  }

  function expand(itemId: string, demandRate: number, path: Set<string>, targetKey: string) {
    const recipe = resolveRecipe(itemId)
    if (!recipe) {
      const source = sourceByItem.get(itemId)
      const nodeKey = source ? `source:${source.machineId}:${itemId}` : `leaf:${itemId}`
      if (!allNodes.has(nodeKey)) {
        if (source) {
          allNodes.set(nodeKey, {
            key: nodeKey,
            kind: 'source',
            itemId,
            machineId: source.machineId,
            perMinute: sourcePerMinute(source.produceRate, source.msPerRound),
          })
        } else {
          allNodes.set(nodeKey, { key: nodeKey, kind: 'item', itemId, perMinute: 0 })
        }
      }
      allEdges.push({ from: nodeKey, to: targetKey, perMinute: demandRate })
      return
    }

    const machineKey = `machine:${recipe.machineId}:${recipe.id}`
    if (!allNodes.has(machineKey)) {
      allNodes.set(machineKey, {
        key: machineKey,
        kind: 'machine',
        machineId: recipe.machineId,
        perMinute: 0,
      })
    }

    const machinePm = perMinute(recipe.outcomes.find(o => o.itemId === itemId)?.count ?? 1, recipe.totalProgress)
    const machineCount = machinePm > 0 ? demandRate / machinePm : 0

    allEdges.push({ from: machineKey, to: targetKey, perMinute: demandRate })

    for (const mat of recipe.ingredients) {
      const matDemand = perMinute(mat.count, recipe.totalProgress) * machineCount
      const matItemKey = `item:${mat.itemId}`
      if (!allNodes.has(matItemKey)) {
        allNodes.set(matItemKey, { key: matItemKey, kind: 'item', itemId: mat.itemId, perMinute: 0 })
      }

      if (path.has(mat.itemId)) {
        allEdges.push({ from: matItemKey, to: machineKey, perMinute: matDemand, isCycle: true })
        continue
      }

      allEdges.push({ from: matItemKey, to: machineKey, perMinute: matDemand })

      const newPath = new Set(path)
      newPath.add(mat.itemId)
      expand(mat.itemId, matDemand, newPath, matItemKey)
    }
  }

  for (const targetId of targets) {
    const targetKey = `item:${targetId}`
    if (!allNodes.has(targetKey)) {
      allNodes.set(targetKey, { key: targetKey, kind: 'item', itemId: targetId, perMinute: 0, isTarget: true })
    }
    const recipe = resolveRecipe(targetId)
    if (!recipe) continue
    const pm = perMinute(recipe.outcomes.find(o => o.itemId === targetId)?.count ?? 1, recipe.totalProgress)
    const path = new Set<string>([targetId])
    expand(targetId, pm, path, targetKey)
  }

  return { nodes: Array.from(allNodes.values()), edges: allEdges }
}
