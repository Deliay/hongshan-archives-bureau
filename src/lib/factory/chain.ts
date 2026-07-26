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
  machines?: Record<string, { name: string; iconId: string }>,
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
      const m = machines?.[recipe.machineId]
      allNodes.set(machineKey, {
        key: machineKey,
        kind: 'machine',
        machineId: recipe.machineId,
        machineName: m?.name ?? '',
        machineIcon: m?.iconId ?? '',
        machineCount: 0,
        perMinute: 0,
      })
    }

    const machinePm = perMinute(recipe.outcomes.find(o => o.itemId === itemId)?.count ?? 1, recipe.totalProgress)
    const machineCount = machinePm > 0 ? demandRate / machinePm : 0
    // 同一机器节点可能被多条路径/多个目标共享，累计所需台数
    allNodes.get(machineKey)!.machineCount = (allNodes.get(machineKey)!.machineCount ?? 0) + machineCount

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
    const recipe = resolveRecipe(targetId)
    const pm = recipe ? perMinute(recipe.outcomes.find(o => o.itemId === targetId)?.count ?? 1, recipe.totalProgress) : 0
    if (!allNodes.has(targetKey)) {
      allNodes.set(targetKey, { key: targetKey, kind: 'item', itemId: targetId, perMinute: pm, isTarget: true })
    } else {
      const node = allNodes.get(targetKey)!
      node.perMinute = pm
      node.isTarget = true
    }
    if (!recipe) continue
    const path = new Set<string>([targetId])
    expand(targetId, pm, path, targetKey)
  }

  // 共享子图（多个目标或钻石路径依赖同一中间物品）会产生 from/to 完全相同的
  // 重复边，这里按 from→to 合并：perMinute 累加（语义上即合计产能需求），isCycle 保留。
  const edgeMap = new Map<string, ChainEdge>()
  for (const edge of allEdges) {
    const key = `${edge.from}→${edge.to}`
    const existing = edgeMap.get(key)
    if (existing) {
      existing.perMinute += edge.perMinute
      existing.isCycle = existing.isCycle || edge.isCycle
    } else {
      edgeMap.set(key, { ...edge })
    }
  }

  return { nodes: Array.from(allNodes.values()), edges: Array.from(edgeMap.values()) }
}
