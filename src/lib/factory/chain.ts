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
  return stages.reduce(
    (ratio, s) => ratio * (s.inputQty > 0 ? s.outputQty / s.inputQty : 0),
    1,
  )
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
    if (data?.msPerRound) {
      const t = calcThroughput(data.msPerRound, data.volume ?? 1)
      if (t > max) max = t
    }
  }
  return max
}

export function calcTransportCount(rate: number, throughput: number): number {
  if (throughput <= 0) return 0
  return Math.ceil(rate / throughput)
}

/** 默认吞吐量：物流表缺失/加载失败时回退（FactoryGridBeltTable=30/min，FactoryLiquidPipeTable=120/min） */
const DEFAULT_BELT_THROUGHPUT = 30
const DEFAULT_PIPE_THROUGHPUT = 120

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

  const beltThroughput = (beltTable ? maxThroughput(beltTable, 'beltData') : 0) || DEFAULT_BELT_THROUGHPUT
  const pipeThroughput = (pipeTable ? maxThroughput(pipeTable, 'pipeData') : 0) || DEFAULT_PIPE_THROUGHPUT

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

  function isLiquid(itemId: string): boolean {
    return liquids?.has(itemId) ?? false
  }

  function transportOf(itemId: string): { isPipe: boolean; throughput: number } {
    const isPipe = isLiquid(itemId)
    return { isPipe, throughput: isPipe ? pipeThroughput : beltThroughput }
  }

  function pushEdge(from: string, to: string, itemId: string, rate: number, cycle?: { type: 'productive' | 'closed'; ratio: number }) {
    const { isPipe, throughput } = transportOf(itemId)
    allEdges.push({
      from,
      to,
      itemId,
      perMinute: rate,
      beltCount: calcTransportCount(rate, throughput),
      isPipe,
      ...(cycle ? { isCycle: true, cycleType: cycle.type, cycleRatio: cycle.ratio } : {}),
    })
  }

  /** 配方摘要：速率 = 主产出 actualPm × (数量 / 主产出数量)，随 actualPm 线性缩放 */
  function buildRecipeSummary(recipe: FactoryRecipe, itemId: string, actualPm: number) {
    const outcomeCount = recipe.outcomes.find(o => o.itemId === itemId)?.count ?? 1
    const scale = outcomeCount > 0 ? actualPm / outcomeCount : 0
    return {
      id: recipe.id,
      inputs: recipe.ingredients.map(ing => ({
        itemId: ing.itemId,
        count: ing.count,
        rate: ing.count * scale,
      })),
      outputs: recipe.outcomes.map(out => ({
        itemId: out.itemId,
        count: out.count,
        rate: out.count * scale,
      })),
      totalProgress: recipe.totalProgress,
    }
  }

  /**
   * 沿 DFS path 计算循环净产出比（R1/R2/R3）：
   * 对路径上每个循环物品 c，取其产出配方中「c 的产出数 / 下一循环物品的投入数」，
   * 只统计参与循环的物品，副产物隔离。
   */
  function cycleNetRatio(itemId: string, path: Set<string>): number {
    const pathArr = Array.from(path)
    const cycleItems = pathArr.slice(pathArr.indexOf(itemId))
    const stages: { inputQty: number; outputQty: number }[] = []
    for (let i = 0; i < cycleItems.length; i++) {
      const cycleItem = cycleItems[i]
      const nextItem = i + 1 < cycleItems.length ? cycleItems[i + 1] : itemId
      const recipe = resolveRecipe(cycleItem)
      if (!recipe) continue
      const output = recipe.outcomes.find(o => o.itemId === cycleItem)
      const input = recipe.ingredients.find(g => g.itemId === nextItem)
      if (output && input) {
        stages.push({ inputQty: input.count, outputQty: output.count })
      }
    }
    return calcCycleNetRatio(stages)
  }

  function expand(
    itemId: string,
    demandPm: number,
    path: Set<string>,
    parentKey: string,
  ): number {
    // R4 外部供给优先：有采集源的物品由源节点直接供给，不再展开机器配方
    const supplyCap = supplyCapByItem.get(itemId)
    if (supplyCap !== undefined) {
      const source = sourceByItem.get(itemId)
      const sourceKey = `source:${source?.machineId}:${itemId}`
      const actualPm = Math.min(demandPm, supplyCap)

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
          actualPm,
          supplyLimited: demandPm > supplyCap,
        })
      }

      pushEdge(sourceKey, parentKey, itemId, actualPm)
      return actualPm
    }

    const recipe = resolveRecipe(itemId)
    if (!recipe) return 0

    // 循环检测（R0-R5）：净产出比 > 1 为有效循环，≤ 1 为封闭回路
    if (path.has(itemId)) {
      const netRatio = cycleNetRatio(itemId, path)
      const machineKey = `machine:${recipe.machineId}:${recipe.id}`
      if (netRatio <= 1) {
        pushEdge(parentKey, machineKey, itemId, demandPm, { type: 'closed', ratio: netRatio })
        const machineNode = allNodes.get(machineKey)
        if (machineNode) machineNode.isClosedLoop = true
      } else {
        pushEdge(parentKey, machineKey, itemId, demandPm, { type: 'productive', ratio: netRatio })
      }
      return 0
    }

    const outcome = recipe.outcomes.find(o => o.itemId === itemId)
    const outcomeCount = outcome?.count ?? 1
    const theoryPm = perMinute(outcomeCount, recipe.totalProgress)
    // 机器可自由增台，不构成瓶颈：actualPm = demandPm
    const actualPm = demandPm
    const machineKey = `machine:${recipe.machineId}:${recipe.id}`

    // R6 循环深度限制：超过 10 层停止展开上游，节点标记为截断
    const truncated = path.size > 10

    const existing = allNodes.get(machineKey)
    if (existing) {
      existing.demandPm += demandPm
      existing.actualPm = existing.demandPm
      existing.machineCount = calcMachineCount(existing.actualPm, theoryPm)
      existing.recipe = buildRecipeSummary(recipe, itemId, existing.actualPm)
      if (truncated) existing.truncated = true
    } else {
      allNodes.set(machineKey, {
        key: machineKey,
        kind: 'machine',
        itemId,
        machineId: recipe.machineId,
        machineName: machines?.[recipe.machineId]?.name,
        machineIcon: machines?.[recipe.machineId]?.iconId,
        machineCount: calcMachineCount(actualPm, theoryPm),
        recipe: buildRecipeSummary(recipe, itemId, actualPm),
        demandPm,
        actualPm,
        theoryPm,
        ...(truncated ? { truncated: true } : {}),
      })
    }

    pushEdge(machineKey, parentKey, itemId, actualPm)

    if (truncated) return actualPm

    for (const mat of recipe.ingredients) {
      // §4.4 第 8 步：matDemand = actualPm × (mat.count / outcomeCount)，瓶颈按比例向下游传导
      const matDemand = outcomeCount > 0 ? actualPm * (mat.count / outcomeCount) : 0
      const newPath = new Set(path)
      newPath.add(itemId)
      expand(mat.itemId, matDemand, newPath, machineKey)
    }

    return actualPm
  }

  for (const target of targets) {
    if (!Number.isFinite(target.rate) || target.rate <= 0) continue

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

  // 边按 (from, to, itemId) 合并，perMinute 累加后重算物流数量
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

  return { nodes: Array.from(allNodes.values()), edges: Array.from(edgeMap.values()) }
}
