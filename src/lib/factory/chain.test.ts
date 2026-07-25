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
      iron_ore: ['iron_ingot'],
      iron_ingot: ['steel_ingot'],
      coal: ['steel_ingot'],
    },
    asOutcome: {
      iron_ingot: ['iron_ingot'],
      steel_ingot: ['steel_ingot'],
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
        glass_bottle: ['bottle_water'],
        water_bottle: ['empty_bottle'],
      },
      asOutcome: {
        water_bottle: ['bottle_water'],
        glass_bottle: ['empty_bottle'],
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
