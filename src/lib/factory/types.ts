export interface RecipeItemQty {
  itemId: string
  count: number
}

export interface FactoryRecipe {
  id: string
  machineId: string
  ingredients: RecipeItemQty[]
  outcomes: RecipeItemQty[]
  totalProgress: number
  sortId: number
}

export interface FactoryMachine {
  id: string
  name: string
  iconId: string
}

export interface FactorySource {
  machineId: string
  itemId: string
  produceRate: number
  msPerRound: number
  /** 无限采集（如水泵抽酸/水）：不封顶、不标记 supplyLimited */
  uncapped?: boolean
}

export interface FactoryItemIndex {
  asIngredient: Record<string, FactoryRecipe[]>
  asOutcome: Record<string, FactoryRecipe[]>
}

export interface ChainTarget {
  itemId: string
  rate: number
}

/** 扩容反应池共炉配方行：同一反应池内级联运行的一条配方 */
export interface ReactorRecipeLine {
  id: string
  inputs: { itemId: string; count: number; rate: number }[]
  outputs: { itemId: string; count: number; rate: number }[]
  totalProgress: number
  /** 该配方实际产速（/min） */
  actualPm: number
  /** 该配方需要的产线数（ceil(actualPm / 单线理论产速)） */
  lines: number
}

export interface ChainNode {
  key: string
  kind: 'machine' | 'source' | 'target'
  itemId: string
  machineId?: string
  machineName?: string
  machineIcon?: string
  machineCount?: number
  recipe?: {
    id: string
    inputs: { itemId: string; count: number; rate: number }[]
    outputs: { itemId: string; count: number; rate: number }[]
    totalProgress: number
  }
  /** 扩容反应池：共炉运行的多条配方（存在时优先于 recipe 渲染） */
  recipes?: ReactorRecipeLine[]
  /** 缓存区占用/上限（不同物质种数，产物也占缓存区，共享物质只算一次） */
  slotsUsed?: number
  slotsTotal?: number
  demandPm: number
  actualPm: number
  theoryPm?: number
  supplyLimited?: boolean
  isClosedLoop?: boolean
  truncated?: boolean
  /** 有效循环的预填充提示：循环消费方启动前需预填的物品与数量（如采种机需预填作物） */
  priming?: { itemId: string; count: number }
}

export interface ChainEdge {
  from: string
  to: string
  itemId: string
  perMinute: number
  beltCount: number
  isPipe: boolean
  isCycle?: boolean
  cycleType?: 'productive' | 'closed'
  cycleRatio?: number
}

export interface ChainGraph {
  nodes: ChainNode[]
  edges: ChainEdge[]
}
