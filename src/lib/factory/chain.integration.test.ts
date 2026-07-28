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

  it('中容武陵电池 6/min：封装机 10s/个 → 正好 1 台', () => {
    // tools_proc_battery_5_1：totalProgress=60000（progressRound=10 → 10s/个），单台 6/min
    const graph = buildWithRealData('item_proc_battery_5', 6, 'wuling')
    const packer = graph.nodes.find(n => n.machineId === 'tools_assebling_mc_1')
    expect(packer).toBeDefined()
    expect(packer?.theoryPm).toBe(6)
    expect(packer?.machineCount).toBe(1)
  })

  it('中容武陵电池 6/min：副产物复用（污水回用+惰性废液提纯），赤铜矿仅需 18/min', () => {
    const graph = buildWithRealData('item_proc_battery_5', 6, 'wuling')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
    // 壤晶合成（pool_xiranite_poly_2）副产污水 30/min 回用于壤晶废液合成；
    // 惰性壤晶废液经提纯机回收（4→1 壤晶废液，12/min），壤晶废液池仅需 48/min；
    // 污水净外部需求 48-30=18/min → 精炼炉副产（赤铜矿+清水→赤铜块+污水）
    const copperOre = graph.nodes.find(n => n.kind === 'source' && n.itemId === 'item_copper_ore')
    expect(copperOre?.actualPm).toBeCloseTo(18, 3)
    const furnace = graph.nodes.find(n => n.machineId === 'furnance_1' && n.itemId === 'item_liquid_sewage')
    expect(furnace?.actualPm).toBeCloseTo(18, 3)
    const purifier = graph.nodes.find(n => n.machineId === 'liquid_purifier_1')
    expect(purifier?.actualPm).toBeCloseTo(12, 3)
    // 不再出现为产污水而跑赫铜块路线的赤铜链（池内赤铜/提纯赤铜/赤铜粉末）
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds.filter(m => m === 'liquid_purifier_1')).toHaveLength(1)
    expect(graph.nodes.some(n => n.itemId === 'item_liquid_copper_enr')).toBe(false)
    expect(graph.nodes.some(n => n.itemId === 'item_liquid_copper')).toBe(false)
    // 污水回用边转为炉内级联：外部污水边仅精炼炉 → 反应池 18/min
    const sewageEdges = graph.edges.filter(e => e.itemId === 'item_liquid_sewage')
    expect(sewageEdges).toHaveLength(1)
    expect(sewageEdges[0].perMinute).toBeCloseTo(18, 3)
  })

  it('种植（酮化灌木）：有效循环 + 预填充标识，无封闭回路', () => {
    const graph = buildWithRealData('item_plant_bbflower_1', 10, 'wuling')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
    const seeder = graph.nodes.find(n => n.machineId === 'seedcollector_1')
    expect(seeder?.priming?.itemId).toBe('item_plant_bbflower_1')
  })
})
