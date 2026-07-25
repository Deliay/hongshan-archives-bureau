import { describe, it, expect } from 'vitest'
import { adaptFactoryRecipe, adaptFactoryMachine, buildFactoryItemIndex, adaptFactorySources } from './recipes'

describe('adaptFactoryRecipe', () => {
  it('adapts raw recipe data', () => {
    const raw = {
      formulaId: 'test_formula',
      machineId: 'furnace',
      ingredients: [{ group: [{ id: 'iron_ore', count: 2 }] }],
      outcomes: [{ group: [{ id: 'iron_ingot', count: 1 }] }],
      totalProgress: 12000,
      sortId: 0,
    }
    const recipe = adaptFactoryRecipe(raw)
    expect(recipe.id).toBe('test_formula')
    expect(recipe.machineId).toBe('furnace')
    expect(recipe.ingredients).toHaveLength(1)
    expect(recipe.ingredients[0]).toEqual({ itemId: 'iron_ore', count: 2 })
    expect(recipe.outcomes).toHaveLength(1)
    expect(recipe.outcomes[0]).toEqual({ itemId: 'iron_ingot', count: 1 })
    expect(recipe.totalProgress).toBe(12000)
  })

  it('handles missing fields with defaults', () => {
    const raw = {}
    const recipe = adaptFactoryRecipe(raw)
    expect(recipe.id).toBe('')
    expect(recipe.machineId).toBe('')
    expect(recipe.ingredients).toHaveLength(0)
    expect(recipe.outcomes).toHaveLength(0)
    expect(recipe.totalProgress).toBe(0)
  })

  it('flattens first group from multi-group ingredients', () => {
    const raw = {
      formulaId: 'test',
      ingredients: [
        { group: [{ id: 'a', count: 1 }, { id: 'b', count: 2 }] },
        { group: [{ id: 'c', count: 3 }] },
      ],
    }
    const recipe = adaptFactoryRecipe(raw)
    expect(recipe.ingredients).toHaveLength(2)
    expect(recipe.ingredients[0].itemId).toBe('a')
    expect(recipe.ingredients[1].itemId).toBe('b')
  })
})

describe('adaptFactoryMachine', () => {
  it('adapts raw machine data', () => {
    const raw = {
      buildingId: 'furnace_01',
      name: { id: 12345, text: 'Furnace' },
      iconOnPanel: 'icon_furnace',
    }
    const machine = adaptFactoryMachine(raw, { '12345': '精炼炉' })
    expect(machine.id).toBe('furnace_01')
    expect(machine.name).toBe('精炼炉')
    expect(machine.iconId).toBe('icon_furnace')
  })

  it('falls back to text when i18n not found', () => {
    const raw = {
      buildingId: 'furnace_01',
      name: { id: 12345, text: 'Furnace' },
      iconOnPanel: 'icon_furnace',
    }
    const machine = adaptFactoryMachine(raw, {})
    expect(machine.name).toBe('Furnace')
  })
})

describe('buildFactoryItemIndex', () => {
  it('builds item index from income and outcome tables', () => {
    const incomeRaw = {
      iron_ore: { list: ['iron_ingot'] },
      coal: { list: ['steel_ingot', 'iron_ingot'] },
    }
    const outcomeRaw = {
      iron_ingot: { list: ['iron_ingot'] },
      steel_ingot: { list: ['steel_ingot'] },
    }
    const index = buildFactoryItemIndex(incomeRaw, outcomeRaw)
    expect(index.asIngredient['iron_ore']).toEqual(['iron_ingot'])
    expect(index.asIngredient['coal']).toEqual(['steel_ingot', 'iron_ingot'])
    expect(index.asOutcome['iron_ingot']).toEqual(['iron_ingot'])
    expect(index.asOutcome['steel_ingot']).toEqual(['steel_ingot'])
  })
})

describe('adaptFactorySources', () => {
  it('merges miner, gas miner, and pump sources', () => {
    const minerRaw = {
      mining_iron: { mineable: [{ miningItemId: 'iron_ore', produceRate: 1 }], msPerRound: 1000 },
    }
    const gasMinerRaw = {
      gas_pump: { mineable: [{ miningItemId: 'gas', produceRate: 2 }], msPerRound: 2000 },
    }
    const pumpRaw = {
      water_pump: { mineable: [{ miningItemId: 'water', produceRate: 3 }], msPerRound: 1500 },
    }
    const sources = adaptFactorySources(minerRaw, gasMinerRaw, pumpRaw)
    expect(sources).toHaveLength(3)
    expect(sources.find(s => s.itemId === 'iron_ore')?.machineId).toBe('mining_iron')
    expect(sources.find(s => s.itemId === 'gas')?.produceRate).toBe(2)
    expect(sources.find(s => s.itemId === 'water')?.msPerRound).toBe(1500)
  })

  it('handles empty inputs', () => {
    const sources = adaptFactorySources({}, {}, {})
    expect(sources).toHaveLength(0)
  })
})
