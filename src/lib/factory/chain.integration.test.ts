/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { adaptFactoryRecipe, adaptFactorySources } from './recipes'
import { buildChainGraph } from './chain'
import { FACTORY_REGIONS } from './regions'
import type { FactoryRecipe, FactoryItemIndex } from './types'

/**
 * 真实数据集成回归：用 endfield-data 最新版本转储跑完整适配+求解，
 * 锁定「无封闭回路」与「扩容反应池共炉」的端到端行为。
 */
const DIR = 'endfield-data/initial_8764515-7_main_8764515-7'
const load = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}`, 'utf-8'))

function buildWithRealData(itemId: string, rate: number, regionId: string) {
  const craftRaw = load('FactoryMachineCraftTable.json')
  const recipes: FactoryRecipe[] = Object.values(craftRaw).map(v => adaptFactoryRecipe(v))
  const asIngredient: FactoryItemIndex['asIngredient'] = {}
  const asOutcome: FactoryItemIndex['asOutcome'] = {}
  for (const r of recipes) {
    for (const i of r.ingredients) (asIngredient[i.itemId] ??= []).push(r)
    for (const o of r.outcomes) (asOutcome[o.itemId] ??= []).push(r)
  }
  const sources = adaptFactorySources(
    load('FactoryMinerTable.json'),
    load('FactoryGasMinerTable.json'),
    load('FactoryFluidPumpInTable.json'),
  )
  const defaultCrafts = load('WikiDefaultCraftTable.json')
  const liquids = new Set(Object.keys(load('LiquidTable.json')))
  const regionCaps = FACTORY_REGIONS.find(r => r.id === regionId)?.caps
  return buildChainGraph(
    [{ itemId, rate }],
    recipes, { asIngredient, asOutcome }, sources, defaultCrafts,
    undefined, undefined, liquids, undefined, undefined, regionCaps,
  )
}

describe('真实数据集成回归', () => {
  it('气态赤铜（武陵）：赤铜矿+清水源头，无封闭回路', () => {
    const graph = buildWithRealData('item_gas_copper', 10, 'wuling')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds).toContain('transmuter_2')
    expect(machineIds).not.toContain('dismantler_1')
    expect(machineIds).not.toContain('filling_powder_mc_1')
    const sourceItems = graph.nodes.filter(n => n.kind === 'source').map(n => n.itemId)
    expect(sourceItems).toContain('item_copper_ore')
  })

  it('息壤聚合（武陵）：扩容反应池共炉且缓存区不溢出，无封闭回路', () => {
    const graph = buildWithRealData('item_xiranite_poly', 10, 'wuling')
    // 规划验证修复后不得残留灌装↔拆解零产出子图
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds).not.toContain('dismantler_1')
    expect(machineIds).not.toContain('filling_powder_mc_1')
    // 共炉合并：反应池节点缓存区 ≤ 8，且包含多条共炉配方
    const reactorNodes = graph.nodes.filter(n => n.machineId === 'mix_pool_2')
    expect(reactorNodes.length).toBeGreaterThan(0)
    for (const n of reactorNodes) {
      expect(n.slotsUsed).toBeLessThanOrEqual(8)
    }
    expect(reactorNodes.some(n => (n.recipes?.length ?? 0) >= 2)).toBe(true)
  })

  it('种植（酮化灌木）：有效循环 + 预填充标识，无封闭回路', () => {
    const graph = buildWithRealData('item_plant_bbflower_1', 10, 'wuling')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
    const seeder = graph.nodes.find(n => n.machineId === 'seedcollector_1')
    expect(seeder?.priming?.itemId).toBe('item_plant_bbflower_1')
  })
})
