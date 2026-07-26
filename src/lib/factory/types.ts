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
}

export interface FactoryItemIndex {
  asIngredient: Record<string, FactoryRecipe[]>
  asOutcome: Record<string, FactoryRecipe[]>
}

export interface ChainTarget {
  itemId: string
  rate: number
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
  demandPm: number
  actualPm: number
  theoryPm?: number
  supplyLimited?: boolean
  isClosedLoop?: boolean
  truncated?: boolean
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
