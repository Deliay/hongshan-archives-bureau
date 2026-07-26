import type { FactoryRecipe, FactoryItemIndex, FactorySource, ChainGraph, ChainNode, ChainEdge, ChainTarget } from './types'

export function perMinute(count: number, totalProgress: number): number {
  return totalProgress > 0 ? (count * 60000) / totalProgress : 0
}

export function sourcePerMinute(produceRate: number, msPerRound: number): number {
  return msPerRound > 0 ? (produceRate * 60000) / msPerRound : 0
}

export function calcCycleNetRatio(
  stages: { inputQty: number; outputQty: number }[],
): number {
  return stages.reduce((ratio, s) => ratio * (s.outputQty / s.inputQty), 1)
}

export function calcMachineCount(actualPm: number, theoryPm: number): number {
  if (theoryPm <= 0) return 0
  return Math.ceil(actualPm / theoryPm)
}

export function calcThroughput(msPerRound: number, volume: number = 1): number {
  return msPerRound > 0 ? (volume * 60000) / msPerRound : 0
}

export function maxThroughput(
  transportTable: Record<string, any>,
  dataKey: 'beltData' | 'pipeData',
): number {
  let max = 0
  for (const entry of Object.values(transportTable)) {
    const data = entry[dataKey]
    if (data?.msPerRound && data?.volume) {
      const t = calcThroughput(data.msPerRound, data.volume)
      if (t > max) max = t
    }
  }
  return max
}

export function calcTransportCount(rate: number, throughput: number): number {
  if (throughput <= 0) return 0
  return Math.ceil(rate / throughput)
}

export function buildChainGraph(
  targets: ChainTarget[],
  recipes: FactoryRecipe[],
  index: FactoryItemIndex,
  sources: FactorySource[],
  defaultCrafts: Record<string, string>,
  recipeOverride?: Record<string, string>,
  machines?: Record<string, { name: string; iconId: string }>,
  liquids?: Set<string>,
  beltTable?: Record<string, any>,
  pipeTable?: Record<string, any>,
): ChainGraph {
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  const sourceByItem = new Map<string, FactorySource>()
  for (const s of sources) {
    sourceByItem.set(s.itemId, s)
  }

  const supplyCapByItem = new Map<string, number>()
  for (const s of sources) {
    const cap = sourcePerMinute(s.produceRate, s.msPerRound)
    supplyCapByItem.set(s.itemId, (supplyCapByItem.get(s.itemId) ?? 0) + cap)
  }

  const beltThroughput = beltTable ? maxThroughput(beltTable, 'beltData') : 30
  const pipeThroughput = pipeTable ? maxThroughput(pipeTable, 'pipeData') : 120

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

  function expand(
    itemId: string,
    demandPm: number,
    path: Set<string>,
    parentKey: string,
  ): number {
    const supplyCap = supplyCapByItem.get(itemId)

    if (supplyCap !== undefined && supplyCap < Infinity) {
      const source = sourceByItem.get(itemId)
      const sourceKey = `source:${source?.machineId}:${itemId}`

      const existing = allNodes.get(sourceKey)
      if (existing) {
        existing.demandPm += demandPm
        existing.actualPm = Math.min(existing.demandPm, supplyCap)
        existing.supplyLimited = existing.demandPm > supplyCap
      } else {
        allNodes.set(sourceKey, {
          key: sourceKey,
          kind: 'source',
          itemId,
          machineId: source?.machineId,
          machineName: machines?.[source?.machineId ?? '']?.name,
          machineIcon: machines?.[source?.machineId ?? '']?.iconId,
          demandPm,
          actualPm: Math.min(demandPm, supplyCap),
          supplyLimited: demandPm > supplyCap,
        })
      }

      const isPipe = liquids?.has(itemId) ?? false
      const throughput = isPipe ? pipeThroughput : beltThroughput
      allEdges.push({
        from: sourceKey,
        to: parentKey,
        itemId,
        perMinute: Math.min(demandPm, supplyCap),
        beltCount: calcTransportCount(Math.min(demandPm, supplyCap), throughput),
        isPipe,
      })

      return Math.min(demandPm, supplyCap)
    }

    const recipe = resolveRecipe(itemId)
    if (!recipe) return 0

    if (path.has(itemId)) {
      const cycleStages: { inputQty: number; outputQty: number }[] = []
      const pathArr = Array.from(path)
      const cycleStart = pathArr.indexOf(itemId)
      for (let i = cycleStart; i < pathArr.length; i++) {
        const cycleItem = pathArr[i]
        const cycleRecipe = resolveRecipe(cycleItem)
        if (cycleRecipe && cycleRecipe.ingredients.length > 0 && cycleRecipe.outcomes.length > 0) {
          cycleStages.push({
            inputQty: cycleRecipe.ingredients[0].count,
            outputQty: cycleRecipe.outcomes[0].count,
          })
        }
      }

      const netRatio = calcCycleNetRatio(cycleStages)

      if (netRatio <= 1) {
        const isPipe = liquids?.has(itemId) ?? false
        const throughput = isPipe ? pipeThroughput : beltThroughput
        allEdges.push({
          from: parentKey,
          to: `machine:${recipe.machineId}:${recipe.id}`,
          itemId,
          perMinute: demandPm,
          beltCount: calcTransportCount(demandPm, throughput),
          isPipe,
          isCycle: true,
          cycleType: 'closed',
          cycleRatio: netRatio,
        })
        return 0
      }

      const isPipe = liquids?.has(itemId) ?? false
      const throughput = isPipe ? pipeThroughput : beltThroughput
      allEdges.push({
        from: parentKey,
        to: `machine:${recipe.machineId}:${recipe.id}`,
        itemId,
        perMinute: demandPm,
        beltCount: calcTransportCount(demandPm, throughput),
        isPipe,
        isCycle: true,
        cycleType: 'productive',
        cycleRatio: netRatio,
      })
    }

    if (path.size > 10) return 0

    const outcome = recipe.outcomes.find(o => o.itemId === itemId)
    const theoryPm = perMinute(outcome?.count ?? 1, recipe.totalProgress)
    const actualPm = Math.min(demandPm, supplyCap ?? Infinity)
    const machineCount = calcMachineCount(actualPm, theoryPm)

    const machineKey = `machine:${recipe.machineId}:${recipe.id}`
    const existing = allNodes.get(machineKey)
    if (existing) {
      existing.demandPm += demandPm
      existing.actualPm = Math.min(existing.demandPm, supplyCap ?? Infinity)
      existing.machineCount = calcMachineCount(existing.actualPm, theoryPm)
      existing.supplyLimited = existing.demandPm > (supplyCap ?? Infinity)
    } else {
      allNodes.set(machineKey, {
        key: machineKey,
        kind: 'machine',
        itemId,
        machineId: recipe.machineId,
        machineName: machines?.[recipe.machineId]?.name,
        machineIcon: machines?.[recipe.machineId]?.iconId,
        machineCount,
        recipe: {
          id: recipe.id,
          inputs: recipe.ingredients.map(ing => ({
            itemId: ing.itemId,
            count: ing.count,
            rate: perMinute(ing.count, recipe.totalProgress) * machineCount,
          })),
          outputs: recipe.outcomes.map(out => ({
            itemId: out.itemId,
            count: out.count,
            rate: perMinute(out.count, recipe.totalProgress) * machineCount,
          })),
          totalProgress: recipe.totalProgress,
        },
        demandPm,
        actualPm,
        theoryPm,
        supplyLimited: demandPm > (supplyCap ?? Infinity),
      })
    }

    if (!path.has(itemId)) {
      const isPipe = liquids?.has(itemId) ?? false
      const throughput = isPipe ? pipeThroughput : beltThroughput
      allEdges.push({
        from: machineKey,
        to: parentKey,
        itemId,
        perMinute: actualPm,
        beltCount: calcTransportCount(actualPm, throughput),
        isPipe,
      })
    }

    for (const mat of recipe.ingredients) {
      const matDemand = perMinute(mat.count, recipe.totalProgress) * machineCount
      const newPath = new Set(path)
      newPath.add(itemId)
      expand(mat.itemId, matDemand, newPath, machineKey)
    }

    return actualPm
  }

  for (const target of targets) {
    if (target.rate <= 0) continue

    const targetKey = `target:${target.itemId}`
    const recipe = resolveRecipe(target.itemId)
    const outcome = recipe?.outcomes.find(o => o.itemId === target.itemId)
    const theoryPm = recipe ? perMinute(outcome?.count ?? 1, recipe.totalProgress) : 0

    allNodes.set(targetKey, {
      key: targetKey,
      kind: 'target',
      itemId: target.itemId,
      demandPm: target.rate,
      actualPm: target.rate,
      theoryPm,
    })

    if (!recipe) continue
    const path = new Set<string>()
    expand(target.itemId, target.rate, path, targetKey)
  }

  const nodeMap = new Map<string, ChainNode>()
  for (const node of allNodes.values()) {
    const existing = nodeMap.get(node.key)
    if (existing) {
      existing.demandPm += node.demandPm
      existing.actualPm = Math.min(existing.demandPm, supplyCapByItem.get(node.itemId) ?? Infinity)
      if (existing.kind === 'machine' && existing.theoryPm) {
        existing.machineCount = calcMachineCount(existing.actualPm, existing.theoryPm)
      }
      existing.supplyLimited = existing.demandPm > (supplyCapByItem.get(node.itemId) ?? Infinity)
    } else {
      nodeMap.set(node.key, { ...node })
    }
  }

  const edgeMap = new Map<string, ChainEdge>()
  for (const edge of allEdges) {
    const key = `${edge.from}→${edge.to}→${edge.itemId}`
    const existing = edgeMap.get(key)
    if (existing) {
      existing.perMinute += edge.perMinute
      existing.beltCount = calcTransportCount(existing.perMinute, existing.isPipe ? pipeThroughput : beltThroughput)
      existing.isCycle = existing.isCycle || edge.isCycle
      if (edge.cycleType) existing.cycleType = edge.cycleType
      if (edge.cycleRatio) existing.cycleRatio = edge.cycleRatio
    } else {
      edgeMap.set(key, { ...edge })
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges: Array.from(edgeMap.values()) }
}
