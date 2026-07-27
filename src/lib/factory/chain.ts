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

/** 循环路径上的一级：物品、生产配方、节点与投入/产出数量 */
interface CycleStage {
  nodeKey: string
  recipe: FactoryRecipe
  itemId: string
  outCount: number
  nextItemId: string
  nextInCount: number
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
  // 同物品多台采集机器时保留首个（基础机型）用于源节点展示
  const sourceByItem = new Map<string, FactorySource>()
  for (const s of sources) {
    if (!sourceByItem.has(s.itemId)) sourceByItem.set(s.itemId, s)
  }

  const supplyCapByItem = new Map<string, number>()
  for (const s of sources) {
    const cap = s.uncapped ? Number.POSITIVE_INFINITY : sourcePerMinute(s.produceRate, s.msPerRound)
    supplyCapByItem.set(s.itemId, (supplyCapByItem.get(s.itemId) ?? 0) + cap)
  }

  const beltThroughput = (beltTable ? maxThroughput(beltTable, 'beltData') : 0) || DEFAULT_BELT_THROUGHPUT
  const pipeThroughput = (pipeTable ? maxThroughput(pipeTable, 'pipeData') : 0) || DEFAULT_PIPE_THROUGHPUT

  const allNodes = new Map<string, ChainNode>()
  const allEdges: ChainEdge[] = []
  /** 物品 → 生产它的机器节点 key（构建期） */
  const producerKeyByItem = new Map<string, string>()
  /** 机器节点 key → 构建期累计外部需求（不含有效循环回流量，供产能结算） */
  const externalPm = new Map<string, number>()
  /** 有效循环记录：构建结束后统一结算，避免多目标合并时重复放大 */
  interface ProductiveLoop {
    itemId: string
    ratio: number
    stages: CycleStage[]
    consumerKey: string
    producerKey: string
  }
  const productiveLoops = new Map<string, ProductiveLoop>()
  let settling = false

  /** 规划阶段为物品选定的配方（消除封闭回路后的回溯结果） */
  const assignment = new Map<string, string>()

  /** 候选配方有序列表：用户指定 > Wiki 默认 > 配方表键序；用户指定为强制项不参与回退 */
  function candidateRecipes(itemId: string): FactoryRecipe[] {
    const list: FactoryRecipe[] = []
    const seen = new Set<string>()
    const push = (id: string | undefined) => {
      if (!id || seen.has(id)) return
      const r = recipeById.get(id)
      if (r) {
        seen.add(id)
        list.push(r)
      }
    }
    const overrideId = recipeOverride?.[itemId]
    if (overrideId) {
      push(overrideId)
      return list
    }
    push(defaultCrafts[itemId])
    for (const r of index.asOutcome[itemId] ?? []) push(r.id)
    return list
  }

  /** 规划阶段循环净产出比：沿 path 切片用已选定配方累乘（与 cycleNetRatio 同规则） */
  function planCycleRatio(itemId: string, path: string[]): number {
    const cycleItems = path.slice(path.indexOf(itemId))
    const stages: { inputQty: number; outputQty: number }[] = []
    for (let i = 0; i < cycleItems.length; i++) {
      const cycleItem = cycleItems[i]
      const nextItem = i + 1 < cycleItems.length ? cycleItems[i + 1] : itemId
      const recipe = recipeById.get(assignment.get(cycleItem) ?? '')
      if (!recipe) continue
      const output = recipe.outcomes.find(o => o.itemId === cycleItem)
      const input = recipe.ingredients.find(g => g.itemId === nextItem)
      if (output && input) stages.push({ inputQty: input.count, outputQty: output.count })
    }
    return calcCycleNetRatio(stages)
  }

  const PLAN_DEPTH_LIMIT = 12

  /**
   * 配方规划（带回溯的 DFS）：为每个物品选定配方，保证展开后不出现净产出比 ≤ 1 的
   * 封闭回路（如灌装机↔拆解机互喂的零产出自环）；有效循环（如采种/种植增产）允许。
   * 无可行配方时返回 false，构建阶段回退旧解析并保留封闭回路标记。
   */
  function planItem(itemId: string, path: string[]): boolean {
    if (supplyCapByItem.has(itemId)) return true // R4 外部供给优先，无需配方
    if (path.length > PLAN_DEPTH_LIMIT) return true // 深度外交由 R6 截断处理
    if (assignment.has(itemId)) {
      if (!path.includes(itemId)) return true // 已规划且不在当前路径
      return planCycleRatio(itemId, path) > 1 // 循环：仅接受有效循环
    }
    const candidates = candidateRecipes(itemId)
    if (candidates.length === 0) return true // 无配方叶子
    for (const recipe of candidates) {
      assignment.set(itemId, recipe.id)
      path.push(itemId)
      let ok = true
      for (const ing of recipe.ingredients) {
        if (!planItem(ing.itemId, path)) {
          ok = false
          break
        }
      }
      path.pop()
      if (ok) return true
      assignment.delete(itemId)
    }
    return false
  }

  for (const target of targets) {
    if (Number.isFinite(target.rate) && target.rate > 0) planItem(target.itemId, [])
  }

  function resolveRecipe(itemId: string): FactoryRecipe | null {
    const assignedId = assignment.get(itemId)
    if (assignedId && recipeById.has(assignedId)) return recipeById.get(assignedId)!
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

  /** 循环分析：净产出比 + 各级配方/节点明细（供有效循环产能结算，R1/R2/R3 副产物隔离） */
  function analyzeCycle(itemId: string, path: Set<string>, producerKey: string): { ratio: number; stages: CycleStage[] } {
    const pathArr = Array.from(path)
    const cycleItems = pathArr.slice(pathArr.indexOf(itemId))
    const stages: CycleStage[] = []
    const qtyStages: { inputQty: number; outputQty: number }[] = []
    for (let i = 0; i < cycleItems.length; i++) {
      const cycleItem = cycleItems[i]
      const nextItem = i + 1 < cycleItems.length ? cycleItems[i + 1] : itemId
      const recipe = resolveRecipe(cycleItem)
      if (!recipe) return { ratio: 1, stages: [] }
      const output = recipe.outcomes.find(o => o.itemId === cycleItem)
      const input = recipe.ingredients.find(g => g.itemId === nextItem)
      const nodeKey = i === 0 ? producerKey : producerKeyByItem.get(cycleItem)
      if (!output || !input || !nodeKey) return { ratio: 1, stages: [] }
      qtyStages.push({ inputQty: input.count, outputQty: output.count })
      stages.push({ nodeKey, recipe, itemId: cycleItem, outCount: output.count, nextItemId: nextItem, nextInCount: input.count })
    }
    return { ratio: calcCycleNetRatio(qtyStages), stages }
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
      if (settling) return 0 // 结算阶段的补展开遇到循环直接跳过，由主结算统一处理
      const machineKey = `machine:${recipe.machineId}:${recipe.id}`
      const { ratio, stages } = analyzeCycle(itemId, path, machineKey)
      if (ratio <= 1) {
        pushEdge(parentKey, machineKey, itemId, demandPm, { type: 'closed', ratio })
        const machineNode = allNodes.get(machineKey)
        if (machineNode) machineNode.isClosedLoop = true
      } else if (stages.length > 0) {
        // 有效循环（如采种 1→2 配合种植增产）：记录，构建结束后统一结算回流量
        productiveLoops.set(`${parentKey}→${machineKey}:${itemId}`, {
          itemId,
          ratio,
          stages,
          consumerKey: parentKey,
          producerKey: machineKey,
        })
      } else {
        pushEdge(parentKey, machineKey, itemId, demandPm, { type: 'productive', ratio })
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
      externalPm.set(machineKey, existing.demandPm)
    } else {
      producerKeyByItem.set(itemId, machineKey)
      externalPm.set(machineKey, demandPm)
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

  // 有效循环产能结算（种植/采种增产）：稳态下循环机器总产 = 外部需求 × netRatio/(netRatio-1)，
  // 回流量 = 总产 - 外部需求。构建期 expand 在循环点直接返回（回流未入账），此处统一补齐：
  // 机器台数/配方速率按结算总产刷新，循环边与非循环材料（如种植用水）按增量补展开。
  settling = true
  for (const loop of productiveLoops.values()) {
    const r = loop.ratio
    if (r <= 1) continue
    // 各级外部需求 E_i：构建期累计需求扣除紧邻环内上游机器的流入
    const externals: number[] = []
    const gross: number[] = []
    for (let i = 0; i < loop.stages.length; i++) {
      const st = loop.stages[i]
      const ext = externalPm.get(st.nodeKey) ?? 0
      let e = ext
      if (i > 0) {
        const prev = loop.stages[i - 1]
        const inflow = prev.outCount > 0 ? ((externalPm.get(prev.nodeKey) ?? 0) * prev.nextInCount) / prev.outCount : 0
        e = Math.max(0, ext - inflow)
      }
      externals.push(e)
      if (i === 0) {
        gross.push((e * r) / (r - 1))
      } else {
        const prev = loop.stages[i - 1]
        const inflow = prev.outCount > 0 ? (gross[i - 1] * prev.nextInCount) / prev.outCount : 0
        gross.push(e + inflow)
      }
    }
    const loopItems = new Set(loop.stages.map(s => s.itemId))
    for (let i = 0; i < loop.stages.length; i++) {
      const st = loop.stages[i]
      const node = allNodes.get(st.nodeKey)
      if (!node) continue
      const delta = gross[i] - (externalPm.get(st.nodeKey) ?? 0)
      node.demandPm = gross[i]
      node.actualPm = gross[i]
      node.machineCount = calcMachineCount(gross[i], node.theoryPm ?? 0)
      node.recipe = buildRecipeSummary(st.recipe, st.itemId, gross[i])
      if (delta <= 0) continue
      // 环内物品流边增量：M_i → M_{i-1}（循环基准物品的回流反馈边在最后统一打）
      if (i > 0) pushEdge(st.nodeKey, loop.stages[i - 1].nodeKey, st.itemId, delta)
      // 非循环材料按增量补展开（如种植机额外消耗的清水）
      for (const ing of st.recipe.ingredients) {
        if (loopItems.has(ing.itemId)) continue
        const rate = st.outCount > 0 ? (delta * ing.count) / st.outCount : 0
        if (rate > 0) expand(ing.itemId, rate, new Set(loopItems), st.nodeKey)
      }
    }
    // 循环反馈边（反向：消费方 → 生产方），速率为稳态回流量
    const feedback = gross[0] - externals[0]
    if (feedback > 0) {
      pushEdge(loop.consumerKey, loop.producerKey, loop.itemId, feedback, { type: 'productive', ratio: r })
    }
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
