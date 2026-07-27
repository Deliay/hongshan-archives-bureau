import { describe, it, expect } from 'vitest'
import { adaptFactoryRecipe, adaptFactoryMachine, adaptFactorySources } from './recipes'

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

describe('adaptFactorySources', () => {
  it('merges miner, gas miner, and pump sources', () => {
    const minerRaw = {
      mining_iron: { mineable: [{ miningItemId: 'iron_ore', produceRate: 1 }], msPerRound: 1000 },
    }
    const gasMinerRaw = {
      gas_pump: { mineable: [{ miningItemId: 'gas', produceRate: 2 }], msPerRound: 2000 },
    }
    // FactoryFluidPumpInTable 真实结构：enableLiquidIds 列举可泵采液体（无 mineable/produceRate）
    const pumpRaw = {
      pump_1: { enableLiquidIds: ['item_liquid_water'], msPerRound: 1000 },
    }
    const sources = adaptFactorySources(minerRaw, gasMinerRaw, pumpRaw)
    expect(sources).toHaveLength(3)
    expect(sources.find(s => s.itemId === 'iron_ore')?.machineId).toBe('mining_iron')
    expect(sources.find(s => s.itemId === 'gas')?.produceRate).toBe(2)
    expect(sources.find(s => s.itemId === 'item_liquid_water')?.machineId).toBe('pump_1')
  })

  it('泵采液体白名单：仅酸/水，标记为无限采集（uncapped）', () => {
    const pumpRaw = {
      pump_1: { enableLiquidIds: ['item_liquid_water', 'item_liquid_sewage', 'item_liquid_copper'], msPerRound: 1000 },
      pump_2: { enableLiquidIds: ['item_liquid_water', 'item_liquid_acid'], msPerRound: 500 },
    }
    const sources = adaptFactorySources({}, {}, pumpRaw)
    // 污水/铜液不在白名单；水由两台泵提供，酸仅耐酸泵 pump_2
    expect(sources).toHaveLength(3)
    expect(sources.every(s => s.uncapped)).toBe(true)
    expect(sources.filter(s => s.itemId === 'item_liquid_water').map(s => s.machineId)).toEqual(['pump_1', 'pump_2'])
    expect(sources.find(s => s.itemId === 'item_liquid_acid')?.machineId).toBe('pump_2')
    expect(sources.some(s => s.itemId === 'item_liquid_sewage')).toBe(false)
  })

  it('handles empty inputs', () => {
    const sources = adaptFactorySources({}, {}, {})
    expect(sources).toHaveLength(0)
  })
})
