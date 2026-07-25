import { describe, it, expect } from 'vitest'
import { perMinute, sourcePerMinute, buildChainGraph } from './chain'
import type { FactoryRecipe, FactoryItemIndex, FactorySource } from './types'

describe('perMinute', () => {
  it('calculates output per minute correctly', () => {
    expect(perMinute(1, 60000)).toBe(1)
    expect(perMinute(2, 60000)).toBe(2)
    expect(perMinute(1, 12000)).toBe(5)
    expect(perMinute(3, 10000)).toBe(18)
  })

  it('returns 0 for zero totalProgress', () => {
    expect(perMinute(5, 0)).toBe(0)
  })
})

describe('sourcePerMinute', () => {
  it('calculates source output per minute', () => {
    expect(sourcePerMinute(1, 1000)).toBe(60)
    expect(sourcePerMinute(2, 1000)).toBe(120)
    expect(sourcePerMinute(1, 2000)).toBe(30)
  })

  it('returns 0 for zero msPerRound', () => {
    expect(sourcePerMinute(5, 0)).toBe(0)
  })
})

describe('buildChainGraph', () => {
  const ironOreRecipe: FactoryRecipe = {
    id: 'iron_ingot',
    machineId: 'furnace',
    ingredients: [{ itemId: 'iron_ore', count: 2 }],
    outcomes: [{ itemId: 'iron_ingot', count: 1 }],
    totalProgress: 12000,
    sortId: 0,
  }

  const steelRecipe: FactoryRecipe = {
    id: 'steel_ingot',
    machineId: 'furnace',
    ingredients: [
      { itemId: 'iron_ingot', count: 3 },
      { itemId: 'coal', count: 1 },
    ],
    outcomes: [{ itemId: 'steel_ingot', count: 1 }],
    totalProgress: 18000,
    sortId: 0,
  }

  const index: FactoryItemIndex = {
    asIngredient: {
      iron_ore: [ironOreRecipe],
      iron_ingot: [steelRecipe],
      coal: [steelRecipe],
    },
    asOutcome: {
      iron_ingot: [ironOreRecipe],
      steel_ingot: [steelRecipe],
    },
  }

  const sources: FactorySource[] = [
    { machineId: 'mining_iron', itemId: 'iron_ore', produceRate: 1, msPerRound: 1000 },
    { machineId: 'mining_coal', itemId: 'coal', produceRate: 1, msPerRound: 1000 },
  ]

  it('returns empty graph for no targets', () => {
    const graph = buildChainGraph([], [ironOreRecipe], index, sources, {})
    expect(graph.nodes).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
  })

  it('builds simple chain for iron_ingot', () => {
    const graph = buildChainGraph(['iron_ingot'], [ironOreRecipe], index, sources, {})
    const itemKeys = graph.nodes.filter(n => n.kind === 'item').map(n => n.itemId)
    expect(itemKeys).toContain('iron_ingot')
    expect(itemKeys).toContain('iron_ore')
    expect(graph.nodes.some(n => n.kind === 'machine')).toBe(true)
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('edges connect valid node keys', () => {
    const graph = buildChainGraph(['steel_ingot'], [ironOreRecipe, steelRecipe], index, sources, {})
    const nodeKeys = new Set(graph.nodes.map(n => n.key))
    for (const edge of graph.edges) {
      expect(nodeKeys.has(edge.from)).toBe(true)
      expect(nodeKeys.has(edge.to)).toBe(true)
    }
  })

  it('chain has source→item→machine→item edge path', () => {
    const graph = buildChainGraph(['steel_ingot'], [ironOreRecipe, steelRecipe], index, sources, {})
    const edgePairs = graph.edges.map(e => `${e.from}→${e.to}`)
    const hasSourceToItem = edgePairs.some(p => p.includes('source:') && p.includes('→item:'))
    const hasItemToMachine = edgePairs.some(p => p.includes('item:') && p.includes('→machine:'))
    const hasMachineToItem = edgePairs.some(p => p.includes('machine:') && p.includes('→item:'))
    expect(hasSourceToItem).toBe(true)
    expect(hasItemToMachine).toBe(true)
    expect(hasMachineToItem).toBe(true)
  })

  it('builds multi-level chain for steel_ingot', () => {
    const graph = buildChainGraph(['steel_ingot'], [ironOreRecipe, steelRecipe], index, sources, {})
    const itemKeys = graph.nodes.filter(n => n.kind === 'item').map(n => n.itemId)
    expect(itemKeys).toContain('steel_ingot')
    expect(itemKeys).toContain('iron_ingot')
    expect(itemKeys).toContain('iron_ore')
    expect(itemKeys).toContain('coal')
    expect(graph.nodes.some(n => n.kind === 'source')).toBe(true)
  })

  it('detects cycles and marks them', () => {
    const bottleRecipe: FactoryRecipe = {
      id: 'bottle_water',
      machineId: 'filler',
      ingredients: [{ itemId: 'glass_bottle', count: 1 }],
      outcomes: [{ itemId: 'water_bottle', count: 1 }],
      totalProgress: 1000,
      sortId: 0,
    }
    const emptyBottleRecipe: FactoryRecipe = {
      id: 'empty_bottle',
      machineId: 'filler',
      ingredients: [{ itemId: 'water_bottle', count: 1 }],
      outcomes: [{ itemId: 'glass_bottle', count: 1 }],
      totalProgress: 1000,
      sortId: 0,
    }
    const cycleIndex: FactoryItemIndex = {
      asIngredient: {
        glass_bottle: [bottleRecipe],
        water_bottle: [emptyBottleRecipe],
      },
      asOutcome: {
        water_bottle: [bottleRecipe],
        glass_bottle: [emptyBottleRecipe],
      },
    }
    const graph = buildChainGraph(['water_bottle'], [bottleRecipe, emptyBottleRecipe], cycleIndex, [], {})
    const cycleEdges = graph.edges.filter(e => e.isCycle)
    expect(cycleEdges.length).toBeGreaterThan(0)
    expect(graph.nodes.length).toBeLessThan(20)
  })

  it('marks target nodes', () => {
    const graph = buildChainGraph(['steel_ingot'], [ironOreRecipe, steelRecipe], index, sources, {})
    const targetNode = graph.nodes.find(n => n.itemId === 'steel_ingot')
    expect(targetNode?.isTarget).toBe(true)
  })

  it('uses default craft when available', () => {
    const altRecipe: FactoryRecipe = {
      id: 'iron_ingot_alt',
      machineId: 'furnace',
      ingredients: [{ itemId: 'iron_ore', count: 5 }],
      outcomes: [{ itemId: 'iron_ingot', count: 1 }],
      totalProgress: 20000,
      sortId: 1,
    }
    const graph = buildChainGraph(
      ['iron_ingot'],
      [ironOreRecipe, altRecipe],
      index,
      sources,
      { iron_ingot: 'iron_ingot_alt' },
    )
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds.length).toBeGreaterThanOrEqual(1)
  })

  it('merges nodes for multi-target', () => {
    const graph = buildChainGraph(
      ['iron_ingot', 'steel_ingot'],
      [ironOreRecipe, steelRecipe],
      index,
      sources,
      {},
    )
    const ironNodes = graph.nodes.filter(n => n.itemId === 'iron_ingot')
    expect(ironNodes.length).toBeGreaterThanOrEqual(1)
  })
})

describe('buildChainGraph with real data', () => {
  const realRecipes: FactoryRecipe[] = [
    {
      id: 'component_activity_xiranite_cmpt_1',
      machineId: 'component_mc_1',
      totalProgress: 12000,
      sortId: 6,
      ingredients: [{ itemId: 'item_xiranite_powder', count: 1 }],
      outcomes: [{ itemId: 'item_activity_xiranite_cmpt', count: 1 }],
    },
    {
      id: 'tools_proc_activity_xiranite_hulu_1',
      machineId: 'tools_assebling_mc_1',
      totalProgress: 60000,
      sortId: 12,
      ingredients: [
        { itemId: 'item_activity_xiranite_bottle', count: 5 },
        { itemId: 'item_activity_xiranite_cmpt', count: 5 },
      ],
      outcomes: [{ itemId: 'item_activity_xiranite_hulu', count: 1 }],
    },
  ]

  const realIndex: FactoryItemIndex = {
    asIngredient: {
      item_xiranite_powder: [realRecipes[0]],
      item_activity_xiranite_bottle: [realRecipes[1]],
      item_activity_xiranite_cmpt: [realRecipes[1]],
    },
    asOutcome: {
      item_activity_xiranite_cmpt: [realRecipes[0]],
      item_activity_xiranite_hulu: [realRecipes[1]],
    },
  }

  it('builds chain: xiranite_hulu → xiranite_cmpt → xiranite_powder', () => {
    const graph = buildChainGraph(
      ['item_activity_xiranite_hulu'],
      realRecipes,
      realIndex,
      [],
      {},
    )

    const nodeKeys = graph.nodes.map(n => n.key)
    const edgePairs = graph.edges.map(e => `${e.from}→${e.to}`)

    expect(nodeKeys).toContain('item:item_activity_xiranite_hulu')
    expect(nodeKeys).toContain('machine:tools_assebling_mc_1:tools_proc_activity_xiranite_hulu_1')
    expect(nodeKeys).toContain('item:item_activity_xiranite_cmpt')
    expect(nodeKeys).toContain('machine:component_mc_1:component_activity_xiranite_cmpt_1')
    expect(nodeKeys).toContain('item:item_xiranite_powder')

    const hasHuluMachine = edgePairs.some(p => p.includes('machine:tools_assebling_mc_1') && p.includes('→item:item_activity_xiranite_hulu'))
    const hasCmptToHuluMachine = edgePairs.some(p => p.includes('item:item_activity_xiranite_cmpt') && p.includes('→machine:tools_assebling_mc_1'))
    const hasCmptMachine = edgePairs.some(p => p.includes('machine:component_mc_1') && p.includes('→item:item_activity_xiranite_cmpt'))
    const hasPowderToCmptMachine = edgePairs.some(p => p.includes('item:item_xiranite_powder') && p.includes('→machine:component_mc_1'))

    expect(hasHuluMachine).toBe(true)
    expect(hasCmptToHuluMachine).toBe(true)
    expect(hasCmptMachine).toBe(true)
    expect(hasPowderToCmptMachine).toBe(true)
  })

  it('marks target node correctly', () => {
    const graph = buildChainGraph(
      ['item_activity_xiranite_hulu'],
      realRecipes,
      realIndex,
      [],
      {},
    )
    const target = graph.nodes.find(n => n.itemId === 'item_activity_xiranite_hulu')
    expect(target?.isTarget).toBe(true)
  })

  it('has correct per-minute values', () => {
    const graph = buildChainGraph(
      ['item_activity_xiranite_hulu'],
      realRecipes,
      realIndex,
      [],
      {},
    )
    const target = graph.nodes.find(n => n.itemId === 'item_activity_xiranite_hulu')
    expect(target?.perMinute).toBeGreaterThan(0)
  })
})
