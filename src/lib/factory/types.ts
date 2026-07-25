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
  asIngredient: Record<string, string[]>
  asOutcome: Record<string, string[]>
}

export interface ChainNode {
  key: string
  kind: 'item' | 'machine' | 'source'
  itemId?: string
  machineId?: string
  perMinute: number
  isTarget?: boolean
}

export interface ChainEdge {
  from: string
  to: string
  perMinute: number
  isCycle?: boolean
}

export interface ChainGraph {
  nodes: ChainNode[]
  edges: ChainEdge[]
}
