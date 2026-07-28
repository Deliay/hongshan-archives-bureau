import type { FactoryRecipe, FactoryItemIndex, FactorySource, ChainGraph, ChainNode, ChainEdge, ChainTarget } from './types'

/**
 * 配方单台理论产出（个/min）。
 * FactoryMachineCraftTable 的 totalProgress 不是毫秒：全部数据版本均满足
 * totalProgress = progressRound × 6000，即 6000 进度单位 = 1 秒
 * （progressRound 字段即为制作秒数，如中容武陵电池 progressRound=10 → 10s/个）。
 * 因此单台理论产出 = count × 360000 / totalProgress。
 */
export function perMinute(count: number, totalProgress: number): number {
  return totalProgress > 0 ? (count * 360000) / totalProgress : 0
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

/**
 * 反应池缓存区（slot）上限。游戏结构化数据尚未解包该字段（经确认以常量维护），
 * 数值取自教学文案（I18nTextTable，6 个数据版本一致）：
 * - 「仅有5个缓存区的反应池无法同时进行这3个配方生产」→ 反应池 mix_pool_1 = 5
 * - 「扩容反应池拥有8个缓存区」→ 扩容反应池 mix_pool_2 = 8
 * slot 占用 = 共炉配方涉及的不同物质种数（产物也占缓存区，共享物质只算一次）。
 * 只有扩容反应池支持多配方共炉与炉内级联，普通反应池无此功能。
 */
export const EXPANDED_REACTOR_MACHINE_ID = 'mix_pool_2'
export const REACTOR_BUFFER_SLOTS: Record<string, number> = {
  mix_pool_1: 5,
  mix_pool_2: 8,
}

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
  regionCaps?: Record<string, number>,
): ChainGraph {
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  // 同物品多台采集机器时保留首个（基础机型）用于源节点展示
  const sourceByItem = new Map<string, FactorySource>()
  for (const s of sources) {
    if (!sourceByItem.has(s.itemId)) sourceByItem.set(s.itemId, s)
  }

  const supplyCapByItem = new Map<string, number>()
  const uncappedSourceItems = new Set<string>()
  for (const s of sources) {
    const cap = s.uncapped ? Number.POSITIVE_INFINITY : sourcePerMinute(s.produceRate, s.msPerRound)
    if (s.uncapped) uncappedSourceItems.add(s.itemId)
    supplyCapByItem.set(s.itemId, (supplyCapByItem.get(s.itemId) ?? 0) + cap)
  }
  // 区域模式：列出资源应用区域上限，未列出资源不可采集（上限 0）；液体泵采不受区域限制
  if (regionCaps) {
    for (const itemId of Array.from(supplyCapByItem.keys())) {
      if (uncappedSourceItems.has(itemId)) continue
      supplyCapByItem.set(itemId, regionCaps[itemId] ?? 0)
    }
  }
  /** 采集源全局消耗（多消费方共享区域/机台上限，先到先得） */
  const consumedByItem = new Map<string, number>()
  function remainingCap(itemId: string): number {
    const cap = supplyCapByItem.get(itemId)
    if (cap === undefined) return 0
    return Math.max(0, cap - (consumedByItem.get(itemId) ?? 0))
  }

  /**
   * 副产物复用：上一轮构建中各机器节点的非主产出（如壤晶合成副产污水）作为本轮
   * 的「虚拟供给」，需求优先从副产物抵扣，余量才走采集源/配方路线；含副产物材料
   * 的转化路线按副产物余量封顶（如惰性壤晶废液→提纯机→壤晶废液）。供给量取决于
   * 构建结果，故构建迭代至不动点（见文件底部驱动循环）。
   */
  let byproductProducers = new Map<string, { nodeKey: string; rate: number }[]>()
  let byproductCap = new Map<string, number>()
  /** 本轮构建中副产物供给已被消耗的量（多消费方先到先得） */
  const byproductConsumed = new Map<string, number>()
  function byproductRemaining(itemId: string): number {
    return Math.max(0, (byproductCap.get(itemId) ?? 0) - (byproductConsumed.get(itemId) ?? 0))
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

  /** 副产物复用迭代上限与收敛精度（几何收敛，24 轮足够 1e-6 精度） */
  const BYPRODUCT_MAX_ITER = 24
  const BYPRODUCT_EPS = 1e-6

  /** 规划阶段为物品选定的有序可行配方路线（消除封闭回路后的回溯结果，可多路线） */
  const assignment = new Map<string, string[]>()

  /** 被全局验证剔除的配方（itemId → 配方 id 集合）：这些路线参与封闭回路，不再候选 */
  const excludedRoutes = new Map<string, Set<string>>()

  /** 候选配方有序列表：用户指定 > Wiki 默认 > 配方表键序；用户指定为强制项不参与回退 */
  function candidateRecipes(itemId: string): FactoryRecipe[] {
    const excluded = excludedRoutes.get(itemId)
    const list: FactoryRecipe[] = []
    const seen = new Set<string>()
    const push = (id: string | undefined) => {
      if (!id || seen.has(id) || excluded?.has(id)) return
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
      const recipe = recipeById.get(assignment.get(cycleItem)?.[0] ?? '')
      if (!recipe) continue
      const output = recipe.outcomes.find(o => o.itemId === cycleItem)
      const input = recipe.ingredients.find(g => g.itemId === nextItem)
      if (output && input) stages.push({ inputQty: input.count, outputQty: output.count })
    }
    return calcCycleNetRatio(stages)
  }

  const PLAN_DEPTH_LIMIT = 12

  /** 规划结果：ok=可行（供当前 DFS 分支判断）；verified=可行性未借助深度短路（见下） */
  interface PlanResult {
    ok: boolean
    verified: boolean
  }
  const PLAN_OK: PlanResult = { ok: true, verified: true }
  const PLAN_FAIL: PlanResult = { ok: false, verified: true }
  /** 深度外放行：未展开校验，可行但「未验证」 */
  const PLAN_UNVERIFIED: PlanResult = { ok: true, verified: false }

  /**
   * 配方规划（带回溯的 DFS）：为每个物品收集全部可行配方路线，保证按序展开后不出现
   * 净产出比 ≤ 1 的封闭回路（如灌装机↔拆解机互喂的零产出自环）；有效循环（如采种/
   * 种植增产）允许。采集源物品同样收集路线（供「源达上限后超额转配方」使用），但源
   * 优先且不参与循环判定。无可行路线时：非源物品返回 false，构建阶段回退旧解析并保
   * 留封闭回路标记。
   *
   * 规划污染防护（验收 2.29）：
   * 1. 循环检查先于深度限制——path 中的物品必然已写入 assignment（本函数先
   *    assignment.set 再递归材料），planCycleRatio 无需继续深入即可判定；
   * 2. 深度短路只返回「可行但未验证」——未验证路线供当前分支判断但不写入全局
   *    assignment（未验证标记沿调用链上传）；否则深层分支的灌装↔拆解零产出环会
   *    藏在深度视界外通过校验，写入全局路线集后在其他分支借「已规划且不在当前
   *    路径」的信任通道合法化。单配方物品回退解析（默认 > 表键序）结果相同，
   *    丢弃其未验证路线不改变构建行为；
   * 3. 深层采集源物品可行性是事实（源不构成环，余量约束在构建阶段处理），不受
   *    深度限制影响，避免含深源成分的合法路线被误丢。
   * 规划阶段无法穷举所有成环组合（路线重排序/回退解析/源超额转配方只在构建期可见），
   * 残留的封闭回路由构建后修复循环兜底（见文件底部 BUILD_REPAIR）。
   */
  function planItem(itemId: string, path: string[]): PlanResult {
    // 采集源物品在环上可独立供给（源优先、超额才转配方），不构成必须依赖的环，
    // 与 findClosedPrimaryCycle 跳过源物品的语义对齐；避免环上下文的候选剔除污染
    // 其全局路线集（如污水在瓶罐分支上下文中丢掉精炼炉路线）
    if (path.includes(itemId) && supplyCapByItem.has(itemId)) return PLAN_OK
    if (assignment.has(itemId)) {
      if (!path.includes(itemId)) return PLAN_OK // 已规划且不在当前路径（只写入已验证路线，可信）
      return planCycleRatio(itemId, path) > 1 ? PLAN_OK : PLAN_FAIL // 循环：仅接受有效循环
    }
    // 深层采集源物品：可行性是事实（源不构成环，余量约束在构建阶段处理），已验证
    if (supplyCapByItem.has(itemId) && path.length > PLAN_DEPTH_LIMIT) return PLAN_OK
    if (path.length > PLAN_DEPTH_LIMIT) return PLAN_UNVERIFIED // 深度外交由 R6 截断处理
    const candidates = candidateRecipes(itemId)
    if (candidates.length === 0) return PLAN_OK // 无配方叶子
    const sourced = supplyCapByItem.has(itemId)
    const routes: { id: string; verified: boolean }[] = []
    for (const recipe of candidates) {
      // 让循环检查看到「已收集路线 + 当前候选」的组合
      assignment.set(itemId, [...routes.map(r => r.id), recipe.id])
      path.push(itemId)
      let ok = true
      let verified = true
      for (const ing of recipe.ingredients) {
        const r = planItem(ing.itemId, path)
        if (!r.ok) {
          ok = false
          break
        }
        verified &&= r.verified
      }
      path.pop()
      if (ok) routes.push({ id: recipe.id, verified })
    }
    // 只有全部成分都经完整校验的路线才写入全局路线集
    const verifiedRoutes = routes.filter(r => r.verified)
    if (verifiedRoutes.length > 0) {
      assignment.set(itemId, verifiedRoutes.map(r => r.id))
    } else {
      assignment.delete(itemId)
    }
    // 采集源物品无路线也可接受（纯源供给）；非源物品无路线则规划失败。
    // 有已验证路线写入 → 后续分支可信；仅未验证路线/无路线 → 标记未验证继续上传
    const ok = sourced || routes.length > 0
    return { ok, verified: verifiedRoutes.length > 0 || (sourced && routes.length === 0) }
  }


  /** 沿首选路线的依赖环净产出比 */
  function primaryCycleRatio(cycleItems: string[], startItem: string): number {
    const stages: { inputQty: number; outputQty: number }[] = []
    for (let i = 0; i < cycleItems.length; i++) {
      const cycleItem = cycleItems[i]
      const nextItem = i + 1 < cycleItems.length ? cycleItems[i + 1] : startItem
      const recipe = recipeById.get(assignment.get(cycleItem)?.[0] ?? '')
      if (!recipe) continue
      const output = recipe.outcomes.find(o => o.itemId === cycleItem)
      const input = recipe.ingredients.find(g => g.itemId === nextItem)
      if (output && input) stages.push({ inputQty: input.count, outputQty: output.count })
    }
    return calcCycleNetRatio(stages)
  }

  /** 沿首选路线全局检测净产出比 ≤ 1 的封闭回路（返回环上物品，无则 null） */
  function findClosedPrimaryCycle(): string[] | null {
    const visited = new Set<string>()
    const stack: string[] = []
    const inStack = new Set<string>()
    function dfs(itemId: string): string[] | null {
      if (visited.has(itemId)) return null
      if (inStack.has(itemId)) {
        const cycle = stack.slice(stack.indexOf(itemId))
        return primaryCycleRatio(cycle, itemId) <= 1 ? cycle : null
      }
      if (supplyCapByItem.has(itemId)) {
        visited.add(itemId)
        return null
      }
      const recipe = recipeById.get(assignment.get(itemId)?.[0] ?? '')
      if (!recipe) {
        visited.add(itemId)
        return null
      }
      inStack.add(itemId)
      stack.push(itemId)
      for (const ing of recipe.ingredients) {
        const found = dfs(ing.itemId)
        if (found) return found
      }
      stack.pop()
      inStack.delete(itemId)
      visited.add(itemId)
      return null
    }
    for (const itemId of assignment.keys()) {
      const found = dfs(itemId)
      if (found) return found
    }
    return null
  }

  /**
   * 规划验证与修复：各物品的路线是在不同 DFS 分支（不同上下文）中选定的，跨分支组合
   * 后可能残留封闭回路（如气态赫铜=拆解机 × 满赫铜罐=灌装机各自「可行」、组合后互喂）。
   * 沿首选路线全局检测，剔除环上物品的首选路线并重规划（候选中永久排除被剔路线）。
   */
  function verifyAndRepairAssignment(): void {
    for (let guard = 0; guard < 20; guard++) {
      const cycle = findClosedPrimaryCycle()
      if (!cycle) return
      let repaired = false
      for (const itemId of cycle) {
        const current = assignment.get(itemId)?.[0]
        if (!current) continue
        // 无替代候选的物品跳过（尝试环上下一物品）
        if (!candidateRecipes(itemId).some(r => r.id !== current)) continue
        const excluded = excludedRoutes.get(itemId) ?? new Set<string>()
        excluded.add(current)
        excludedRoutes.set(itemId, excluded)
        assignment.delete(itemId)
        if (planItem(itemId, []).ok && assignment.has(itemId)) {
          repaired = true
          break
        }
        // 重规划失败：恢复原首选路线，尝试环上下一物品
        assignment.set(itemId, [current])
      }
      // 环上物品均无替代路线：放弃修复，由构建阶段保留封闭回路标记
      if (!repaired) return
    }
  }

  /** 全量规划：清空路线集重跑 DFS + 首选路线校验修复（被剔除路线永久排除，故收敛） */
  function planAllTargets(): void {
    assignment.clear()
    for (const target of targets) {
      if (Number.isFinite(target.rate) && target.rate > 0) planItem(target.itemId, [])
    }
    verifyAndRepairAssignment()
  }

  planAllTargets()

  function resolveRecipe(itemId: string): FactoryRecipe | null {
    const routes = assignment.get(itemId)
    if (routes?.length && recipeById.has(routes[0])) return recipeById.get(routes[0])!
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

  /** 物品的可行配方路线（规划结果）；规划失败时回退单路线旧解析 */
  function assignedRoutes(itemId: string): FactoryRecipe[] {
    const routes = assignment.get(itemId)
    if (routes?.length) {
      return routes.map(id => recipeById.get(id)).filter((r): r is FactoryRecipe => !!r)
    }
    const r = resolveRecipe(itemId)
    return r ? [r] : []
  }

  /** 该副产物的生产路线中是否存在会同产 itemId 的配方（转化路线的自喂放大判定） */
  function coProduces(byproductItem: string, itemId: string): boolean {
    return (index.asOutcome[byproductItem] ?? []).some(r => r.outcomes.some(o => o.itemId === itemId))
  }

  /**
   * 路线天花板：直接材料中有采集上限的物品决定该路线最大可用速率（共享余量，先到先得）。
   * 转化路线的副产物材料（如提纯机吃惰性壤晶废液产壤晶废液）按副产物余量封顶——仅当
   * 生产该副产物的路线会同产本物品时（coProduces），防止「为转化而生产副产物」的自喂
   * 放大；其他副产物材料（如壤晶废液合成吃污水）不封顶，余量外的部分由配方路线补足。
   */
  function routeCeiling(recipe: FactoryRecipe, itemId: string): number {
    const outCount = recipe.outcomes.find(o => o.itemId === itemId)?.count ?? 1
    let ceiling = Number.POSITIVE_INFINITY
    for (const ing of recipe.ingredients) {
      if (supplyCapByItem.has(ing.itemId)) {
        const cap = remainingCap(ing.itemId)
        if (Number.isFinite(cap)) {
          ceiling = Math.min(ceiling, ing.count > 0 ? (cap * outCount) / ing.count : 0)
        }
      }
      const bpRemain = byproductRemaining(ing.itemId)
      if (bpRemain > 0 && coProduces(ing.itemId, itemId)) {
        ceiling = Math.min(ceiling, ing.count > 0 ? (bpRemain * outCount) / ing.count : 0)
      }
    }
    return ceiling
  }

  /** 路线排序：受采集上限约束的路线优先（先用满天然供给），天花板低者更先；不受限路线保持原序 */
  function orderRoutesByCeiling(routes: FactoryRecipe[], itemId: string): FactoryRecipe[] {
    return routes
      .map((recipe, idx) => ({ recipe, idx, ceiling: routeCeiling(recipe, itemId) }))
      .sort((a, b) => {
        const fa = Number.isFinite(a.ceiling)
        const fb = Number.isFinite(b.ceiling)
        if (fa !== fb) return fa ? -1 : 1
        if (fa && fb) return a.ceiling - b.ceiling
        // 同为不受限路线时：扩容反应池优先（共炉省台数），普通反应池最后
        const rank = (m: string) => (m === EXPANDED_REACTOR_MACHINE_ID ? 0 : m === 'mix_pool_1' ? 2 : 1)
        const dr = rank(a.recipe.machineId) - rank(b.recipe.machineId)
        if (dr !== 0) return dr
        return a.idx - b.idx
      })
      .map(x => x.recipe)
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

  /** 循环检测处理（R0-R5）：净产出比 > 1 为有效循环，≤ 1 为封闭回路 */
  function handleCycle(itemId: string, demandPm: number, path: Set<string>, parentKey: string, recipe: FactoryRecipe): void {
    if (settling) return // 结算阶段的补展开遇到循环直接跳过，由主结算统一处理
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
  }

  /**
   * 副产物抵扣：从上一轮的生产节点列表依次为当前需求供给（多消费方先到先得），
   * 边从副产物生产节点直接连到消费方（同一反应池合并后自动转为炉内级联）。
   * 未收敛的中间轮次生产者节点可能尚未创建，边先挂上，轮末统一清理悬空边。
   */
  function allocateByproduct(itemId: string, demandPm: number, parentKey: string): number {
    const producers = byproductProducers.get(itemId)
    if (!producers?.length || demandPm <= 0) return 0
    let skip = byproductConsumed.get(itemId) ?? 0
    let allocated = 0
    for (const p of producers) {
      if (allocated >= demandPm) break
      if (skip >= p.rate) { skip -= p.rate; continue }
      const avail = p.rate - skip
      skip = 0
      const take = Math.min(avail, demandPm - allocated)
      if (take <= 0) continue
      pushEdge(p.nodeKey, parentKey, itemId, take)
      allocated += take
    }
    if (allocated > 0) byproductConsumed.set(itemId, (byproductConsumed.get(itemId) ?? 0) + allocated)
    return allocated
  }

  function expand(
    itemId: string,
    demandPm: number,
    path: Set<string>,
    parentKey: string,
  ): number {
    // 副产物复用优先：链路内其他节点的副产物先抵扣需求，余量才走采集源/配方路线
    const byproduct = allocateByproduct(itemId, demandPm, parentKey)
    if (byproduct > 0) {
      demandPm -= byproduct
      if (demandPm <= 0) return byproduct
    }
    // R4 外部供给优先：采集源按全局余量分配；达区域/机台上限后，超额部分改走配方路线
    const supplyCap = supplyCapByItem.get(itemId)
    if (supplyCap !== undefined) {
      const allocated = Math.min(demandPm, remainingCap(itemId))
      consumedByItem.set(itemId, (consumedByItem.get(itemId) ?? 0) + allocated)
      const excess = demandPm - allocated
      const routes = assignedRoutes(itemId)

      // 分配为 0 且存在配方路线时源节点不展示（需求全部走配方）；无路线时保留节点呈现缺口
      if (allocated > 0 || routes.length === 0) {
        const source = sourceByItem.get(itemId)
        const sourceKey = `source:${source?.machineId}:${itemId}`
        const existing = allNodes.get(sourceKey)
        if (existing) {
          existing.demandPm += demandPm
          existing.actualPm += allocated
          existing.supplyLimited = existing.demandPm > existing.actualPm
        } else {
          allNodes.set(sourceKey, {
            key: sourceKey,
            kind: 'source',
            itemId,
            machineId: source?.machineId,
            machineName: machines?.[source?.machineId ?? '']?.name,
            machineIcon: machines?.[source?.machineId ?? '']?.iconId,
            demandPm,
            actualPm: allocated,
            supplyLimited: excess > 0,
          })
        }
        if (allocated > 0) pushEdge(sourceKey, parentKey, itemId, allocated)
      }

      if (excess <= 0 || routes.length === 0) {
        if (excess > 0 && allocated === 0) {
          // 区域不可采集且无配方路线：标记消费方机器供应受限
          const parentNode = allNodes.get(parentKey)
          if (parentNode?.kind === 'machine') parentNode.supplyLimited = true
        }
        return allocated
      }
      if (path.has(itemId)) {
        // 源已耗尽且处于循环路径：超额部分按循环规则处理
        const recipe = resolveRecipe(itemId)
        if (recipe) handleCycle(itemId, excess, path, parentKey, recipe)
        return allocated
      }
      expandRoutes(itemId, excess, path, parentKey, routes)
      return allocated
    }

    const recipe = resolveRecipe(itemId)
    if (!recipe) return 0

    // 循环检测（R0-R5）
    if (path.has(itemId)) {
      handleCycle(itemId, demandPm, path, parentKey, recipe)
      return 0
    }

    return expandRoutes(itemId, demandPm, path, parentKey, assignedRoutes(itemId))
  }

  /** 多路线分配：受采集上限约束的路线优先用满至天花板，剩余需求依次落到后续路线 */
  function expandRoutes(itemId: string, demandPm: number, path: Set<string>, parentKey: string, routes: FactoryRecipe[]): number {
    const overrideForced = recipeOverride?.[itemId] !== undefined
    const ordered = overrideForced ? routes : orderRoutesByCeiling(routes, itemId)
    let remaining = demandPm
    let supplied = 0
    for (const recipe of ordered) {
      if (remaining <= 0) break
      const ceiling = overrideForced ? Number.POSITIVE_INFINITY : routeCeiling(recipe, itemId)
      const take = Math.min(remaining, ceiling)
      if (take <= 0) continue
      supplied += expandRoute(recipe, itemId, take, path, parentKey)
      remaining -= take
    }
    if (remaining > 0 && ordered.length > 0) {
      // 所有路线均达采集上限仍有缺口：压给末条路线，上游采集源将以供应受限呈现
      supplied += expandRoute(ordered[ordered.length - 1], itemId, remaining, path, parentKey)
    }
    return supplied
  }

  function expandRoute(recipe: FactoryRecipe, itemId: string, demandPm: number, path: Set<string>, parentKey: string): number {
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

  /** 单轮构建：重置构建状态，从目标展开全图并结算有效循环，最后清理悬空边 */
  function buildOnce(): void {
    allNodes.clear()
    allEdges.length = 0
    producerKeyByItem.clear()
    externalPm.clear()
    productiveLoops.clear()
    consumedByItem.clear()
    byproductConsumed.clear()
    settling = false

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
    settleProductiveLoops()

    // 清理悬空边：未收敛的中间轮次可能从上轮已消失/未创建的节点引出副产物边
    for (let i = allEdges.length - 1; i >= 0; i--) {
      if (!allNodes.has(allEdges[i].from) || !allNodes.has(allEdges[i].to)) allEdges.splice(i, 1)
    }
  }

  function settleProductiveLoops(): void {
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
    // 预填充标识：循环消费方启动前需预填循环基准物品（如采种机需预填作物）
    const lastStage = loop.stages[loop.stages.length - 1]
    const consumerNode = lastStage ? allNodes.get(loop.consumerKey) : undefined
    if (consumerNode && lastStage) {
      consumerNode.priming = { itemId: loop.itemId, count: lastStage.nextInCount }
    }
  }
  }

  /** 汇总本轮构建的副产物供给：各机器节点非主产出的速率（outputs 速率已按 actualPm 缩放） */
  function collectByproducts(): {
    caps: Map<string, number>
    producers: Map<string, { nodeKey: string; rate: number }[]>
  } {
    const caps = new Map<string, number>()
    const producers = new Map<string, { nodeKey: string; rate: number }[]>()
    for (const node of allNodes.values()) {
      if (node.kind !== 'machine' || !node.recipe) continue
      for (const out of node.recipe.outputs) {
        if (out.itemId === node.itemId || out.rate <= 0) continue
        caps.set(out.itemId, (caps.get(out.itemId) ?? 0) + out.rate)
        const list = producers.get(out.itemId) ?? []
        list.push({ nodeKey: node.key, rate: out.rate })
        producers.set(out.itemId, list)
      }
    }
    return { caps, producers }
  }

  function byproductCapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
    if (a.size !== b.size) return false
    for (const [k, v] of a) {
      const w = b.get(k)
      if (w === undefined || Math.abs(v - w) > BYPRODUCT_EPS) return false
    }
    return true
  }

  /**
   * 构建后封闭回路修复（验收 2.29 兜底）：规划阶段无法穷举所有成环组合——路线重排序
   * （orderRoutesByCeiling）、无路线集物品的回退解析（resolveRecipe）、采集源达上限后的
   * 超额转配方都只在构建期可见，可能组合出规划时未见的零净值封闭回路（如灌装↔拆解、
   * 气体↔液体↔粉末转化互喂）。每轮构建后检测封闭回路边：剔除回边消费方物品的当前
   * 路线（无替代路线则剔除生产方路线）并重规划重建；每轮永久排除 ≥1 条配方，必然收敛。
   * 无可行替代时保留封闭回路标记呈现（与原行为一致）。
   */
  const BUILD_REPAIR_MAX_ATTEMPTS = 20
  for (let attempt = 0; ; attempt++) {
    // 副产物复用不动点迭代：本轮构建使用上轮的副产物供给，产出新的供给；供给量收敛
    // （或达迭代上限）即定稿。无多产出配方的链路首轮供给为空，与初始一致，一轮即出。
    for (let iter = 0; ; iter++) {
      const usedCaps = byproductCap
      buildOnce()
      const { caps, producers } = collectByproducts()
      byproductProducers = producers
      byproductCap = caps
      if (iter >= BYPRODUCT_MAX_ITER || byproductCapsEqual(caps, usedCaps)) break
    }

    const closedEdges = allEdges.filter(e => e.cycleType === 'closed')
    if (closedEdges.length === 0 || attempt >= BUILD_REPAIR_MAX_ATTEMPTS) break

    let excludedAny = false
    const exclude = (itemId: string, recipeId: string): boolean => {
      const excluded = excludedRoutes.get(itemId) ?? new Set<string>()
      if (excluded.has(recipeId)) return false
      excluded.add(recipeId)
      excludedRoutes.set(itemId, excluded)
      return true
    }
    for (const e of closedEdges) {
      const consumer = allNodes.get(e.from)
      const producer = allNodes.get(e.to)
      // 优先剔除回边消费方（环内吃循环物品的一方）的当前路线；其无替代路线时
      // 剔除生产方（被循环消费物品）的当前路线
      if (
        consumer?.kind === 'machine' &&
        consumer.recipe &&
        candidateRecipes(consumer.itemId).some(r => r.id !== consumer.recipe!.id)
      ) {
        excludedAny = exclude(consumer.itemId, consumer.recipe.id) || excludedAny
      } else if (
        producer?.kind === 'machine' &&
        producer.recipe &&
        candidateRecipes(producer.itemId).some(r => r.id !== producer.recipe!.id)
      ) {
        excludedAny = exclude(producer.itemId, producer.recipe.id) || excludedAny
      }
    }
    if (!excludedAny) break
    planAllTargets()
  }

  /** 配方组涉及的不同物质集合（投入 ∪ 产出；产物也占缓存区） */
  function reactorSubstances(nodes: ChainNode[]): Set<string> {
    const items = new Set<string>()
    for (const n of nodes) {
      for (const i of n.recipe?.inputs ?? []) items.add(i.itemId)
      for (const o of n.recipe?.outputs ?? []) items.add(o.itemId)
    }
    return items
  }

  /**
   * 扩容反应池多配方共炉：全图 mix_pool_2 机器节点按缓存区上限（不同物质 ≤ slots）
   * 贪心装箱合并（节点创建顺序 ≈ 链路顺序，相连配方相邻，天然共炉）。同一反应池内
   * 配方产物可直接作为下一配方原料（炉内级联），内部物流边取消；台数 = 各配方产线
   * 数最大值（每台反应池可同时跑桶内整套配方且不溢出缓存区）。普通反应池无此功能。
   */
  function mergeReactorGroups(): void {
    const slotsTotal = REACTOR_BUFFER_SLOTS[EXPANDED_REACTOR_MACHINE_ID]
    if (!slotsTotal) return
    const poolNodes = Array.from(allNodes.values()).filter(
      n => n.kind === 'machine' && n.machineId === EXPANDED_REACTOR_MACHINE_ID && n.recipe,
    )
    if (poolNodes.length === 0) return

    if (poolNodes.length === 1) {
      const only = poolNodes[0]
      only.slotsUsed = reactorSubstances([only]).size
      only.slotsTotal = slotsTotal
      return
    }

    const buckets: ChainNode[][] = []
    let current: ChainNode[] = []
    let currentItems = new Set<string>()
    for (const node of poolNodes) {
      const items = reactorSubstances([node])
      if (current.length > 0 && new Set([...currentItems, ...items]).size > slotsTotal) {
        buckets.push(current)
        current = []
        currentItems = new Set()
      }
      current.push(node)
      currentItems = new Set([...currentItems, ...items])
    }
    if (current.length > 0) buckets.push(current)

    const keyMap = new Map<string, string>()
    for (const bucket of buckets) {
      const substances = reactorSubstances(bucket)
      if (bucket.length === 1) {
        const only = bucket[0]
        only.slotsUsed = substances.size
        only.slotsTotal = slotsTotal
        continue
      }
      const mergedKey = `reactor:${bucket.map(n => n.key).join('+')}`
      const first = bucket[0]
      allNodes.set(mergedKey, {
        key: mergedKey,
        kind: 'machine',
        itemId: first.itemId,
        machineId: EXPANDED_REACTOR_MACHINE_ID,
        machineName: first.machineName,
        machineIcon: first.machineIcon,
        machineCount: Math.max(...bucket.map(n => n.machineCount ?? 1)),
        recipes: bucket.map(n => ({
          id: n.recipe!.id,
          inputs: n.recipe!.inputs,
          outputs: n.recipe!.outputs,
          totalProgress: n.recipe!.totalProgress,
          actualPm: n.actualPm,
          lines: n.machineCount ?? 1,
        })),
        slotsUsed: substances.size,
        slotsTotal,
        demandPm: 0,
        actualPm: 0,
      })
      for (const n of bucket) {
        keyMap.set(n.key, mergedKey)
        allNodes.delete(n.key)
      }
    }

    if (keyMap.size === 0) return
    // 重写边：成员节点 key → 合并节点 key；炉内级联边（两端同节点）取消
    for (let i = allEdges.length - 1; i >= 0; i--) {
      const e = allEdges[i]
      e.from = keyMap.get(e.from) ?? e.from
      e.to = keyMap.get(e.to) ?? e.to
      if (e.from === e.to) allEdges.splice(i, 1)
    }
  }

  mergeReactorGroups()

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
