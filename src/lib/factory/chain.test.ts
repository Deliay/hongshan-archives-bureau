import { describe, it, expect } from 'vitest'
import {
  perMinute,
  sourcePerMinute,
  buildChainGraph,
  calcCycleNetRatio,
  calcMachineCount,
  calcThroughput,
  maxThroughput,
  calcTransportCount,
} from './chain'
import type { FactoryRecipe, FactoryItemIndex, FactorySource, ChainTarget } from './types'

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
    const targets: ChainTarget[] = [{ itemId: 'iron_ingot', rate: 1 }]
    const graph = buildChainGraph(targets, [ironOreRecipe], index, sources, {})
    const targetNodes = graph.nodes.filter(n => n.kind === 'target')
    expect(targetNodes.some(n => n.itemId === 'iron_ingot')).toBe(true)
    expect(graph.nodes.some(n => n.kind === 'machine')).toBe(true)
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('edges connect valid node keys', () => {
    const targets: ChainTarget[] = [{ itemId: 'steel_ingot', rate: 1 }]
    const graph = buildChainGraph(targets, [ironOreRecipe, steelRecipe], index, sources, {})
    const nodeKeys = new Set(graph.nodes.map(n => n.key))
    for (const edge of graph.edges) {
      expect(nodeKeys.has(edge.from)).toBe(true)
      expect(nodeKeys.has(edge.to)).toBe(true)
    }
  })

  it('chain has source→machine→target edge path', () => {
    const targets: ChainTarget[] = [{ itemId: 'steel_ingot', rate: 1 }]
    const graph = buildChainGraph(targets, [ironOreRecipe, steelRecipe], index, sources, {})
    const edgePairs = graph.edges.map(e => `${e.from}→${e.to}`)
    const hasSourceToMachine = edgePairs.some(p => p.includes('source:') && p.includes('→machine:'))
    const hasMachineToTarget = edgePairs.some(p => p.includes('machine:') && p.includes('→target:'))
    expect(hasSourceToMachine).toBe(true)
    expect(hasMachineToTarget).toBe(true)
  })

  it('builds multi-level chain for steel_ingot', () => {
    const targets: ChainTarget[] = [{ itemId: 'steel_ingot', rate: 1 }]
    const graph = buildChainGraph(targets, [ironOreRecipe, steelRecipe], index, sources, {})
    const machineNodes = graph.nodes.filter(n => n.kind === 'machine')
    expect(machineNodes.length).toBeGreaterThanOrEqual(2)
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
    const targets: ChainTarget[] = [{ itemId: 'water_bottle', rate: 1 }]
    const graph = buildChainGraph(targets, [bottleRecipe, emptyBottleRecipe], cycleIndex, [], {})
    const cycleEdges = graph.edges.filter(e => e.isCycle)
    expect(cycleEdges.length).toBeGreaterThan(0)
    expect(graph.nodes.length).toBeLessThan(20)
  })

  it('marks target nodes', () => {
    const targets: ChainTarget[] = [{ itemId: 'steel_ingot', rate: 1 }]
    const graph = buildChainGraph(targets, [ironOreRecipe, steelRecipe], index, sources, {})
    const targetNode = graph.nodes.find(n => n.itemId === 'steel_ingot' && n.kind === 'target')
    expect(targetNode).toBeDefined()
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
    const targets: ChainTarget[] = [{ itemId: 'iron_ingot', rate: 1 }]
    const graph = buildChainGraph(
      targets,
      [ironOreRecipe, altRecipe],
      index,
      sources,
      { iron_ingot: 'iron_ingot_alt' },
    )
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds.length).toBeGreaterThanOrEqual(1)
  })

  it('merges nodes for multi-target', () => {
    const targets: ChainTarget[] = [
      { itemId: 'iron_ingot', rate: 1 },
      { itemId: 'steel_ingot', rate: 1 },
    ]
    const graph = buildChainGraph(
      targets,
      [ironOreRecipe, steelRecipe],
      index,
      sources,
      {},
    )
    const ironMachines = graph.nodes.filter(n => n.kind === 'machine' && n.itemId === 'iron_ingot')
    expect(ironMachines.length).toBeGreaterThanOrEqual(1)
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
    const targets: ChainTarget[] = [{ itemId: 'item_activity_xiranite_hulu', rate: 1 }]
    const graph = buildChainGraph(
      targets,
      realRecipes,
      realIndex,
      [],
      {},
    )

    const nodeKeys = graph.nodes.map(n => n.key)
    const edgePairs = graph.edges.map(e => `${e.from}→${e.to}`)

    expect(nodeKeys).toContain('target:item_activity_xiranite_hulu')
    expect(nodeKeys).toContain('machine:tools_assebling_mc_1:tools_proc_activity_xiranite_hulu_1')
    expect(nodeKeys).toContain('machine:component_mc_1:component_activity_xiranite_cmpt_1')

    const hasHuluMachine = edgePairs.some(p => p.includes('machine:tools_assebling_mc_1') && p.includes('→target:item_activity_xiranite_hulu'))
    const hasCmptMachine = edgePairs.some(p => p.includes('machine:component_mc_1') && p.includes('→machine:tools_assebling_mc_1'))

    expect(hasHuluMachine).toBe(true)
    expect(hasCmptMachine).toBe(true)
  })

  it('marks target node correctly', () => {
    const targets: ChainTarget[] = [{ itemId: 'item_activity_xiranite_hulu', rate: 1 }]
    const graph = buildChainGraph(
      targets,
      realRecipes,
      realIndex,
      [],
      {},
    )
    const target = graph.nodes.find(n => n.itemId === 'item_activity_xiranite_hulu' && n.kind === 'target')
    expect(target).toBeDefined()
  })

  it('has correct actualPm values', () => {
    const targets: ChainTarget[] = [{ itemId: 'item_activity_xiranite_hulu', rate: 1 }]
    const graph = buildChainGraph(
      targets,
      realRecipes,
      realIndex,
      [],
      {},
    )
    const target = graph.nodes.find(n => n.itemId === 'item_activity_xiranite_hulu' && n.kind === 'target')
    expect(target?.actualPm).toBeGreaterThan(0)
  })
})


describe('calcCycleNetRatio', () => {
  it('multiplies stage ratios', () => {
    expect(calcCycleNetRatio([
      { inputQty: 1, outputQty: 2 },
      { inputQty: 1, outputQty: 1 },
    ])).toBe(2)
  })

  it('returns 1 for balanced cycle (closed loop)', () => {
    expect(calcCycleNetRatio([
      { inputQty: 1, outputQty: 1 },
      { inputQty: 1, outputQty: 1 },
    ])).toBe(1)
  })

  it('guards division by zero inputQty', () => {
    expect(calcCycleNetRatio([{ inputQty: 0, outputQty: 5 }])).toBe(0)
  })

  it('returns 1 for empty stages', () => {
    expect(calcCycleNetRatio([])).toBe(1)
  })
})

describe('calcMachineCount', () => {
  it('ceil: demand 100 / theory 30 → 4 machines', () => {
    expect(calcMachineCount(100, 30)).toBe(4)
  })

  it('exact division', () => {
    expect(calcMachineCount(60, 30)).toBe(2)
  })

  it('zero actualPm → 0 machines', () => {
    expect(calcMachineCount(0, 30)).toBe(0)
  })

  it('zero theoryPm → 0 machines', () => {
    expect(calcMachineCount(100, 0)).toBe(0)
  })
})

describe('calcThroughput / maxThroughput / calcTransportCount', () => {
  it('belt: msPerRound 2000, no volume → 30/min', () => {
    expect(calcThroughput(2000)).toBe(30)
  })

  it('pipe: msPerRound 500, volume 1 → 120/min', () => {
    expect(calcThroughput(500, 1)).toBe(120)
  })

  it('zero msPerRound → 0', () => {
    expect(calcThroughput(0)).toBe(0)
  })

  it('maxThroughput: real FactoryGridBeltTable entry has NO volume field (regression)', () => {
    const beltTable = {
      grid_belt_01: {
        id: 'grid_belt_01',
        beltData: {
          buildCamState: 'Factory/CCS_Fac_Building_Medium',
          iconOnPanel: 'icon_log_belt_01',
          itemId: 'item_log_belt_01',
          msPerRound: 2000,
          name: { id: '4038501459734707859', text: '' },
        },
      },
    }
    expect(maxThroughput(beltTable, 'beltData')).toBe(30)
  })

  it('maxThroughput: real FactoryLiquidPipeTable entry', () => {
    const pipeTable = {
      log_pipe_01: {
        id: 'log_pipe_01',
        pipeData: { msPerRound: 500, volume: 1, iconOnPanel: 'icon_log_pipe_01', itemId: 'item_log_pipe_01' },
      },
    }
    expect(maxThroughput(pipeTable, 'pipeData')).toBe(120)
  })

  it('maxThroughput: picks highest tier among multiple entries', () => {
    const table = {
      belt_01: { beltData: { msPerRound: 2000 } },
      belt_02: { beltData: { msPerRound: 1000 } },
    }
    expect(maxThroughput(table, 'beltData')).toBe(60)
  })

  it('maxThroughput: empty table → 0', () => {
    expect(maxThroughput({}, 'beltData')).toBe(0)
  })

  it('calcTransportCount: ceil division', () => {
    expect(calcTransportCount(100, 30)).toBe(4)
    expect(calcTransportCount(120, 120)).toBe(1)
  })

  it('calcTransportCount: zero throughput → 0', () => {
    expect(calcTransportCount(100, 0)).toBe(0)
  })
})

describe('R7 供给封顶瓶颈', () => {
  const ingotRecipe: FactoryRecipe = {
    id: 'iron_ingot',
    machineId: 'furnace',
    ingredients: [{ itemId: 'iron_ore', count: 2 }],
    outcomes: [{ itemId: 'iron_ingot', count: 1 }],
    totalProgress: 12000, // 单台理论产出 5/min
    sortId: 0,
  }
  const r7Index: FactoryItemIndex = {
    asIngredient: { iron_ore: [ingotRecipe] },
    asOutcome: { iron_ingot: [ingotRecipe] },
  }
  // 矿机产能 60/min
  const r7Sources: FactorySource[] = [
    { machineId: 'miner', itemId: 'iron_ore', produceRate: 1, msPerRound: 1000 },
  ]

  it('需求低于源产能时满产', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 20 }], [ingotRecipe], r7Index, r7Sources, {})
    const source = graph.nodes.find(n => n.kind === 'source')
    expect(source?.demandPm).toBe(40) // 20 × (2/1)
    expect(source?.actualPm).toBe(40)
    expect(source?.supplyLimited).toBe(false)
  })

  it('需求超过源产能时封顶并标记 supplyLimited', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 100 }], [ingotRecipe], r7Index, r7Sources, {})
    const source = graph.nodes.find(n => n.kind === 'source')
    expect(source?.demandPm).toBe(200)
    expect(source?.actualPm).toBe(60)
    expect(source?.supplyLimited).toBe(true)
    // 源→机器边按封顶后速率传输
    const edge = graph.edges.find(e => e.from.startsWith('source:'))
    expect(edge?.perMinute).toBe(60)
  })

  it('无源物品不封顶（机器可自由增台）', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 100 }], [ingotRecipe], r7Index, [], {})
    const machine = graph.nodes.find(n => n.kind === 'machine')
    expect(machine?.actualPm).toBe(100)
    expect(machine?.supplyLimited).toBeFalsy()
  })
})

describe('R8 机器数量', () => {
  const widgetRecipe: FactoryRecipe = {
    id: 'widget',
    machineId: 'assembler',
    ingredients: [{ itemId: 'part', count: 1 }],
    outcomes: [{ itemId: 'widget', count: 1 }],
    totalProgress: 2000, // 单台理论产出 30/min
    sortId: 0,
  }
  const r8Index: FactoryItemIndex = {
    asIngredient: { part: [widgetRecipe] },
    asOutcome: { widget: [widgetRecipe] },
  }
  const r8Sources: FactorySource[] = [
    { machineId: 'part_maker', itemId: 'part', produceRate: 100, msPerRound: 1000 },
  ]

  it('需求 100/min ÷ 单台 30/min = 4 台', () => {
    const graph = buildChainGraph([{ itemId: 'widget', rate: 100 }], [widgetRecipe], r8Index, r8Sources, {})
    const machine = graph.nodes.find(n => n.kind === 'machine')
    expect(machine?.machineCount).toBe(4)
    expect(machine?.actualPm).toBe(100)
  })

  it('材料需求按 actualPm × 配方比例折算（不随台数取整放大）', () => {
    const graph = buildChainGraph([{ itemId: 'widget', rate: 100 }], [widgetRecipe], r8Index, r8Sources, {})
    const source = graph.nodes.find(n => n.kind === 'source')
    // 修复前：4 台 × 单台材料速率 30/min = 120/min（虚高）；修复后：100 × (1/1) = 100/min
    expect(source?.demandPm).toBe(100)
  })
})

describe('R9/R10 物流设施与液体区分', () => {
  const drinkRecipe: FactoryRecipe = {
    id: 'drink',
    machineId: 'brewer',
    ingredients: [{ itemId: 'water', count: 1 }],
    outcomes: [{ itemId: 'drink', count: 1 }],
    totalProgress: 60000, // 单台 1/min
    sortId: 0,
  }
  const r9Index: FactoryItemIndex = {
    asIngredient: { water: [drinkRecipe] },
    asOutcome: { drink: [drinkRecipe] },
  }
  const r9Sources: FactorySource[] = [
    { machineId: 'pump', itemId: 'water', produceRate: 100, msPerRound: 100 },
  ]
  const beltTable = { grid_belt_01: { beltData: { msPerRound: 2000 } } }
  const pipeTable = { log_pipe_01: { pipeData: { msPerRound: 500, volume: 1 } } }

  it('液体边 isPipe=true 且按管道吞吐量计数', () => {
    const graph = buildChainGraph(
      [{ itemId: 'drink', rate: 100 }],
      [drinkRecipe], r9Index, r9Sources, {},
      undefined, undefined, new Set(['water']), beltTable, pipeTable,
    )
    const liquidEdge = graph.edges.find(e => e.itemId === 'water')
    expect(liquidEdge?.isPipe).toBe(true)
    expect(liquidEdge?.beltCount).toBe(1) // ceil(100/120)
    const solidEdge = graph.edges.find(e => e.itemId === 'drink')
    expect(solidEdge?.isPipe).toBe(false)
    expect(solidEdge?.beltCount).toBe(4) // ceil(100/30)
  })

  it('非 LiquidTable 成员走传送带', () => {
    const graph = buildChainGraph(
      [{ itemId: 'drink', rate: 100 }],
      [drinkRecipe], r9Index, r9Sources, {},
      undefined, undefined, new Set(['other_liquid']), beltTable, pipeTable,
    )
    const edge = graph.edges.find(e => e.itemId === 'water')
    expect(edge?.isPipe).toBe(false)
    expect(edge?.beltCount).toBe(4) // ceil(100/30)
  })

  it('空 liquids 集合降级全固体', () => {
    const graph = buildChainGraph(
      [{ itemId: 'drink', rate: 100 }],
      [drinkRecipe], r9Index, r9Sources, {},
      undefined, undefined, new Set(), beltTable, pipeTable,
    )
    expect(graph.edges.every(e => !e.isPipe)).toBe(true)
  })

  it('物流表缺失时回退默认吞吐量（30/120）', () => {
    const graph = buildChainGraph(
      [{ itemId: 'drink', rate: 100 }],
      [drinkRecipe], r9Index, r9Sources, {},
    )
    const edge = graph.edges.find(e => e.itemId === 'drink')
    expect(edge?.beltCount).toBe(4) // ceil(100/30)
  })

  it('物流表为空对象时同样回退默认吞吐量', () => {
    const graph = buildChainGraph(
      [{ itemId: 'drink', rate: 100 }],
      [drinkRecipe], r9Index, r9Sources, {},
      undefined, undefined, undefined, {}, {},
    )
    const edge = graph.edges.find(e => e.itemId === 'drink')
    expect(edge?.beltCount).toBe(4)
  })
})

describe('多目标需求累加', () => {
  const ingotRecipe: FactoryRecipe = {
    id: 'iron_ingot',
    machineId: 'furnace',
    ingredients: [{ itemId: 'iron_ore', count: 2 }],
    outcomes: [{ itemId: 'iron_ingot', count: 1 }],
    totalProgress: 12000, // 单台 5/min
    sortId: 0,
  }
  const steelRecipe: FactoryRecipe = {
    id: 'steel_ingot',
    machineId: 'furnace',
    ingredients: [{ itemId: 'iron_ingot', count: 3 }],
    outcomes: [{ itemId: 'steel_ingot', count: 1 }],
    totalProgress: 6000, // 单台 10/min
    sortId: 0,
  }
  const mtIndex: FactoryItemIndex = {
    asIngredient: { iron_ore: [ingotRecipe], iron_ingot: [steelRecipe] },
    asOutcome: { iron_ingot: [ingotRecipe], steel_ingot: [steelRecipe] },
  }
  const mtSources: FactorySource[] = [
    { machineId: 'miner', itemId: 'iron_ore', produceRate: 100, msPerRound: 100 },
  ]

  it('共享中间品需求 sum 合并：30 + 30 = 60 → 台数按 60 算', () => {
    const targets: ChainTarget[] = [
      { itemId: 'iron_ingot', rate: 30 },
      { itemId: 'steel_ingot', rate: 10 }, // 消耗 iron_ingot 30/min
    ]
    const graph = buildChainGraph(targets, [ingotRecipe, steelRecipe], mtIndex, mtSources, {})
    const ingotMachine = graph.nodes.find(n => n.kind === 'machine' && n.itemId === 'iron_ingot')
    expect(ingotMachine?.demandPm).toBe(60)
    expect(ingotMachine?.actualPm).toBe(60)
    expect(ingotMachine?.machineCount).toBe(12) // ceil(60/5)
    // 合并后配方摘要速率同步刷新（修复前停留在首次展开）
    const oreInput = ingotMachine?.recipe?.inputs.find(i => i.itemId === 'iron_ore')
    expect(oreInput?.rate).toBe(120) // 60 × (2/1)
    // 矿源需求 = 60 × 2 = 120
    const source = graph.nodes.find(n => n.kind === 'source')
    expect(source?.demandPm).toBe(120)
  })

  it('两个 target 节点各自独立', () => {
    const targets: ChainTarget[] = [
      { itemId: 'iron_ingot', rate: 30 },
      { itemId: 'steel_ingot', rate: 10 },
    ]
    const graph = buildChainGraph(targets, [ingotRecipe, steelRecipe], mtIndex, mtSources, {})
    const targetNodes = graph.nodes.filter(n => n.kind === 'target')
    expect(targetNodes).toHaveLength(2)
  })
})

describe('非整数与非法产速', () => {
  const ingotRecipe: FactoryRecipe = {
    id: 'iron_ingot',
    machineId: 'furnace',
    ingredients: [{ itemId: 'iron_ore', count: 2 }],
    outcomes: [{ itemId: 'iron_ingot', count: 1 }],
    totalProgress: 12000,
    sortId: 0,
  }
  const idx: FactoryItemIndex = {
    asIngredient: { iron_ore: [ingotRecipe] },
    asOutcome: { iron_ingot: [ingotRecipe] },
  }
  const srcs: FactorySource[] = [
    { machineId: 'miner', itemId: 'iron_ore', produceRate: 100, msPerRound: 100 },
  ]

  it('小数产速正常展开', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 2.5 }], [ingotRecipe], idx, srcs, {})
    const target = graph.nodes.find(n => n.kind === 'target')
    expect(target?.actualPm).toBe(2.5)
    const machine = graph.nodes.find(n => n.kind === 'machine')
    expect(machine?.machineCount).toBe(1) // ceil(2.5/5)
  })

  it('rate = 0 不展开', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 0 }], [ingotRecipe], idx, srcs, {})
    expect(graph.nodes).toHaveLength(0)
  })

  it('NaN rate 不展开且不产生 NaN 污染', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: NaN }], [ingotRecipe], idx, srcs, {})
    expect(graph.nodes).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
  })

  it('极小产速', () => {
    const graph = buildChainGraph([{ itemId: 'iron_ingot', rate: 0.001 }], [ingotRecipe], idx, srcs, {})
    const machine = graph.nodes.find(n => n.kind === 'machine')
    expect(machine?.machineCount).toBe(1)
  })
})

describe('循环规则 R0-R6', () => {
  it('采种/种植：netRatio=2 → 有效循环', () => {
    // 种植：1 种子 → 1 作物；采种：1 作物 → 2 种子
    const plantRecipe: FactoryRecipe = {
      id: 'plant', machineId: 'planter',
      ingredients: [{ itemId: 'seed', count: 1 }],
      outcomes: [{ itemId: 'crop', count: 1 }],
      totalProgress: 1000, sortId: 0,
    }
    const seedRecipe: FactoryRecipe = {
      id: 'seed', machineId: 'seeder',
      ingredients: [{ itemId: 'crop', count: 1 }],
      outcomes: [{ itemId: 'seed', count: 2 }],
      totalProgress: 1000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: { seed: [plantRecipe], crop: [seedRecipe] },
      asOutcome: { crop: [plantRecipe], seed: [seedRecipe] },
    }
    const graph = buildChainGraph([{ itemId: 'crop', rate: 1 }], [plantRecipe, seedRecipe], idx, [], {})
    const cycleEdge = graph.edges.find(e => e.isCycle)
    expect(cycleEdge?.cycleType).toBe('productive')
    expect(cycleEdge?.cycleRatio).toBe(2)
  })

  it('瓶装/倒空：netRatio=1 → 封闭回路，机器节点标记 isClosedLoop', () => {
    const bottleRecipe: FactoryRecipe = {
      id: 'bottle', machineId: 'filler',
      ingredients: [{ itemId: 'glass_bottle', count: 1 }],
      outcomes: [{ itemId: 'water_bottle', count: 1 }],
      totalProgress: 1000, sortId: 0,
    }
    const emptyRecipe: FactoryRecipe = {
      id: 'empty', machineId: 'filler',
      ingredients: [{ itemId: 'water_bottle', count: 1 }],
      outcomes: [{ itemId: 'glass_bottle', count: 1 }],
      totalProgress: 1000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: { glass_bottle: [bottleRecipe], water_bottle: [emptyRecipe] },
      asOutcome: { water_bottle: [bottleRecipe], glass_bottle: [emptyRecipe] },
    }
    const graph = buildChainGraph([{ itemId: 'water_bottle', rate: 1 }], [bottleRecipe, emptyRecipe], idx, [], {})
    const cycleEdge = graph.edges.find(e => e.isCycle)
    expect(cycleEdge?.cycleType).toBe('closed')
    expect(cycleEdge?.cycleRatio).toBe(1)
    const bottleMachine = graph.nodes.find(n => n.key === 'machine:filler:bottle')
    expect(bottleMachine?.isClosedLoop).toBe(true)
  })

  it('多材料/多产出配方按循环物品自身取数（R2/R3 副产物隔离）', () => {
    // a 是第二个产出、b 是第二个材料：取 ingredients[0]/outcomes[0] 会算错
    const recipeA: FactoryRecipe = {
      id: 'make_a', machineId: 'm1',
      ingredients: [
        { itemId: 'x', count: 1 },
        { itemId: 'b', count: 4 },
      ],
      outcomes: [
        { itemId: 'junk', count: 9 },
        { itemId: 'a', count: 2 },
      ],
      totalProgress: 1000, sortId: 0,
    }
    const recipeB: FactoryRecipe = {
      id: 'make_b', machineId: 'm2',
      ingredients: [{ itemId: 'a', count: 1 }],
      outcomes: [{ itemId: 'b', count: 1 }],
      totalProgress: 1000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: { x: [recipeA], b: [recipeA], a: [recipeB] },
      asOutcome: { a: [recipeA], junk: [recipeA], b: [recipeB] },
    }
    const srcs: FactorySource[] = [
      { machineId: 'x_src', itemId: 'x', produceRate: 100, msPerRound: 100 },
    ]
    const graph = buildChainGraph([{ itemId: 'a', rate: 1 }], [recipeA, recipeB], idx, srcs, {})
    const cycleEdge = graph.edges.find(e => e.isCycle)
    // netRatio = (a产出2 / b投入4) × (b产出1 / a投入1) = 0.5 ≤ 1 → 封闭
    expect(cycleEdge?.cycleType).toBe('closed')
    expect(cycleEdge?.cycleRatio).toBe(0.5)
  })

  it('R6 深度限制：超过 10 层停止展开并标记截断', () => {
    const chainRecipes: FactoryRecipe[] = []
    const chainIndex: FactoryItemIndex = { asIngredient: {}, asOutcome: {} }
    for (let i = 0; i < 12; i++) {
      const r: FactoryRecipe = {
        id: `r${i}`, machineId: `m${i}`,
        ingredients: [{ itemId: `item_${i + 1}`, count: 1 }],
        outcomes: [{ itemId: `item_${i}`, count: 1 }],
        totalProgress: 1000, sortId: 0,
      }
      chainRecipes.push(r)
      chainIndex.asIngredient[`item_${i + 1}`] = [r]
      chainIndex.asOutcome[`item_${i}`] = [r]
    }
    const graph = buildChainGraph([{ itemId: 'item_0', rate: 1 }], chainRecipes, chainIndex, [], {})
    const truncated = graph.nodes.filter(n => n.truncated)
    expect(truncated.length).toBeGreaterThan(0)
    // 截断节点的上游不再展开：item_12 不存在于图中
    expect(graph.nodes.some(n => n.itemId === 'item_12')).toBe(false)
  })
})


describe('封闭回路消除（配方规划回溯）', () => {
  // 真实数据结构简化：气态赤铜/赤铜罐链路
  // 键序陷阱：气态赤铜/空罐/赤铜块的首个配方均为拆解机/转化机反向配方，必然成环
  const dismantler: FactoryRecipe = {
    id: 'dismantler_copperjar_gas_copper_1', machineId: 'dismantler_1',
    ingredients: [{ itemId: 'item_gasjar_copper_gas_copper', count: 1 }],
    outcomes: [{ itemId: 'item_copper_jar', count: 1 }, { itemId: 'item_gas_copper', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const transmuterGas: FactoryRecipe = {
    id: 'liquid_transmuter_2_gas_gas_copper_1', machineId: 'transmuter_2',
    ingredients: [{ itemId: 'item_copper_nugget', count: 2 }],
    outcomes: [{ itemId: 'item_gas_copper', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const transmuterSolid: FactoryRecipe = {
    id: 'liquid_transmuter_2_solid_copper_nugget_1', machineId: 'transmuter_2',
    ingredients: [{ itemId: 'item_gas_copper', count: 1 }],
    outcomes: [{ itemId: 'item_copper_nugget', count: 2 }],
    totalProgress: 1000, sortId: 0,
  }
  const furnace: FactoryRecipe = {
    id: 'furnance_copper_nugget_1', machineId: 'furnance_1',
    ingredients: [{ itemId: 'item_copper_ore', count: 1 }, { itemId: 'item_liquid_water', count: 1 }],
    outcomes: [{ itemId: 'item_copper_nugget', count: 1 }, { itemId: 'item_liquid_sewage', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const filling: FactoryRecipe = {
    id: 'filling_copperjar_gas_copper_1', machineId: 'filling_1',
    ingredients: [{ itemId: 'item_copper_jar', count: 1 }, { itemId: 'item_gas_copper', count: 1 }],
    outcomes: [{ itemId: 'item_gasjar_copper_gas_copper', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const shaper: FactoryRecipe = {
    id: 'shaper_gas_copper_jar_1', machineId: 'shaper_1',
    ingredients: [{ itemId: 'item_copper_nugget', count: 2 }, { itemId: 'item_gas_inert', count: 1 }],
    outcomes: [{ itemId: 'item_copper_jar', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const cuRecipes = [dismantler, transmuterGas, transmuterSolid, furnace, filling, shaper]
  const cuIndex: FactoryItemIndex = {
    asIngredient: {
      item_gasjar_copper_gas_copper: [dismantler],
      item_copper_nugget: [transmuterGas, shaper],
      item_copper_ore: [furnace],
      item_liquid_water: [furnace],
      item_copper_jar: [filling],
      item_gas_copper: [filling, transmuterSolid],
      item_gas_inert: [shaper],
    },
    asOutcome: {
      // 配方表键序：拆解机/转化机反向配方排在前面（封闭回路陷阱）
      item_gas_copper: [dismantler, transmuterGas],
      item_copper_jar: [dismantler, shaper],
      item_copper_nugget: [transmuterSolid, furnace],
      item_liquid_sewage: [furnace],
      item_gasjar_copper_gas_copper: [filling],
    },
  }
  const cuSources: FactorySource[] = [
    { machineId: 'miner_1', itemId: 'item_copper_ore', produceRate: 1, msPerRound: 1000 },
    { machineId: 'pump_1', itemId: 'item_liquid_water', produceRate: 1, msPerRound: 1000, uncapped: true },
    { machineId: 'gas_pump_1', itemId: 'item_gas_inert', produceRate: 1, msPerRound: 3000 },
  ]

  function assertCopperChain(graph: ReturnType<typeof buildChainGraph>) {
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    // 正确解：固气转化机 + 熔炉，输入赤铜矿 + 清水；无拆解机/灌装机零产出子图
    expect(machineIds).toContain('transmuter_2')
    expect(machineIds).toContain('furnance_1')
    expect(machineIds).not.toContain('dismantler_1')
    expect(machineIds).not.toContain('filling_1')
    const sourceItems = graph.nodes.filter(n => n.kind === 'source').map(n => n.itemId)
    expect(sourceItems).toContain('item_copper_ore')
    expect(sourceItems).toContain('item_liquid_water')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
  }

  it('气态赤铜：Wiki 默认配方（字符串值）指向固气转化机', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_gas_copper', rate: 10 }],
      cuRecipes, cuIndex, cuSources,
      { item_gas_copper: 'liquid_transmuter_2_gas_gas_copper_1' },
    )
    assertCopperChain(graph)
  })

  it('气态赤铜：无默认配方时回溯消除灌装↔拆解封闭回路', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_gas_copper', rate: 10 }],
      cuRecipes, cuIndex, cuSources, {},
    )
    assertCopperChain(graph)
  })

  it('满赤铜耐压罐：回溯后灌装机由塑形机供罐、转化机供气，无封闭回路', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_gasjar_copper_gas_copper', rate: 10 }],
      cuRecipes, cuIndex, cuSources, {},
    )
    const machineIds = graph.nodes.filter(n => n.kind === 'machine').map(n => n.machineId)
    expect(machineIds).toContain('filling_1')
    expect(machineIds).toContain('shaper_1')
    expect(machineIds).toContain('transmuter_2')
    expect(machineIds).not.toContain('dismantler_1')
    const sourceItems = graph.nodes.filter(n => n.kind === 'source').map(n => n.itemId)
    expect(sourceItems).toContain('item_copper_ore')
    expect(sourceItems).toContain('item_gas_inert')
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
  })

  it('用户指定配方（override）为强制项，不参与回溯', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_gas_copper', rate: 10 }],
      cuRecipes, cuIndex, cuSources, {},
      { item_gas_copper: 'dismantler_copperjar_gas_copper_1' },
    )
    // 强制拆解机：封闭回路保留标记而不是被替换
    const dismantlerNode = graph.nodes.find(n => n.machineId === 'dismantler_1')
    expect(dismantlerNode).toBeDefined()
    expect(graph.edges.some(e => e.cycleType === 'closed')).toBe(true)
  })
})

describe('有效循环产能结算（种植增产）', () => {
  // 种植：1 种子 → 1 作物；采种：1 作物 → 2 种子（netRatio=2）
  const plantRecipe: FactoryRecipe = {
    id: 'plant', machineId: 'planter',
    ingredients: [{ itemId: 'seed', count: 1 }],
    outcomes: [{ itemId: 'crop', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const seedRecipe: FactoryRecipe = {
    id: 'seed', machineId: 'seeder',
    ingredients: [{ itemId: 'crop', count: 1 }],
    outcomes: [{ itemId: 'seed', count: 2 }],
    totalProgress: 1000, sortId: 0,
  }
  const plantIndex: FactoryItemIndex = {
    asIngredient: { seed: [plantRecipe], crop: [seedRecipe] },
    asOutcome: { crop: [plantRecipe], seed: [seedRecipe] },
  }

  it('作物目标：种植机/采种机按净产出比放大至稳态产能', () => {
    const graph = buildChainGraph([{ itemId: 'crop', rate: 10 }], [plantRecipe, seedRecipe], plantIndex, [], {})
    // 稳态：种植机总产 20（10 交付 + 10 回流采种），采种机处理 10 作物 → 20 种子
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    const seeder = graph.nodes.find(n => n.machineId === 'seeder')
    expect(planter?.actualPm).toBe(20)
    expect(seeder?.actualPm).toBe(20)
    expect(planter?.machineCount).toBe(1) // 单台理论 60/min，20/min → 1 台
  })

  it('作物目标：循环反馈边速率为稳态回流量', () => {
    const graph = buildChainGraph([{ itemId: 'crop', rate: 10 }], [plantRecipe, seedRecipe], plantIndex, [], {})
    const cycleEdge = graph.edges.find(e => e.isCycle)
    expect(cycleEdge?.cycleType).toBe('productive')
    expect(cycleEdge?.cycleRatio).toBe(2)
    expect(cycleEdge?.perMinute).toBe(10) // 回流量 = 20 - 10
    // 种子流边同样按稳态 20/min
    const seedEdge = graph.edges.find(e => e.itemId === 'seed' && !e.isCycle)
    expect(seedEdge?.perMinute).toBe(20)
  })

  it('多目标同一作物：产能按合并外部需求一次性放大，不重复翻倍', () => {
    const graph = buildChainGraph(
      [{ itemId: 'crop', rate: 10 }, { itemId: 'crop', rate: 10 }],
      [plantRecipe, seedRecipe], plantIndex, [], {},
    )
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    const seeder = graph.nodes.find(n => n.machineId === 'seeder')
    expect(planter?.actualPm).toBe(40) // 外部 20 × 2/(2-1)
    expect(seeder?.actualPm).toBe(40)
    const cycleEdges = graph.edges.filter(e => e.isCycle)
    expect(cycleEdges).toHaveLength(1)
    expect(cycleEdges[0]?.perMinute).toBe(20)
  })

  it('种子目标：采种机增产自足，种植机仅承担循环回流', () => {
    const graph = buildChainGraph([{ itemId: 'seed', rate: 10 }], [plantRecipe, seedRecipe], plantIndex, [], {})
    const seeder = graph.nodes.find(n => n.machineId === 'seeder')
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    expect(seeder?.actualPm).toBe(20) // 10 交付 + 10 供种植
    expect(planter?.actualPm).toBe(10) // 10 作物全部回流采种
  })

  it('种草（额外消耗清水）：非循环材料按结算增量补展开', () => {
    const grassPlant: FactoryRecipe = {
      id: 'plant_grass', machineId: 'planter',
      ingredients: [{ itemId: 'grass_seed', count: 1 }, { itemId: 'item_liquid_water', count: 1 }],
      outcomes: [{ itemId: 'grass', count: 2 }],
      totalProgress: 1000, sortId: 0,
    }
    const grassSeed: FactoryRecipe = {
      id: 'seed_grass', machineId: 'seeder',
      ingredients: [{ itemId: 'grass', count: 1 }],
      outcomes: [{ itemId: 'grass_seed', count: 1 }],
      totalProgress: 1000, sortId: 0,
    }
    const grassIndex: FactoryItemIndex = {
      asIngredient: { grass_seed: [grassPlant], item_liquid_water: [grassPlant], grass: [grassSeed] },
      asOutcome: { grass: [grassPlant], grass_seed: [grassSeed] },
    }
    const waterSources: FactorySource[] = [
      { machineId: 'pump_1', itemId: 'item_liquid_water', produceRate: 1, msPerRound: 1000, uncapped: true },
    ]
    const graph = buildChainGraph([{ itemId: 'grass', rate: 10 }], [grassPlant, grassSeed], grassIndex, waterSources, {})
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    expect(planter?.actualPm).toBe(20) // netRatio = 2/1 × 1/1 = 2
    // 稳态清水需求 = 20 × (1/2) = 10/min（构建期 5 + 结算增量 5）
    const water = graph.nodes.find(n => n.kind === 'source' && n.itemId === 'item_liquid_water')
    expect(water?.demandPm).toBe(10)
    expect(water?.actualPm).toBe(10)
  })
})

describe('液体泵源无限采集', () => {
  const drinkRecipe: FactoryRecipe = {
    id: 'drink', machineId: 'brewer',
    ingredients: [{ itemId: 'item_liquid_water', count: 1 }],
    outcomes: [{ itemId: 'drink', count: 1 }],
    totalProgress: 60000, sortId: 0,
  }
  const idx: FactoryItemIndex = {
    asIngredient: { item_liquid_water: [drinkRecipe] },
    asOutcome: { drink: [drinkRecipe] },
  }

  it('uncapped 源不封顶、不标记 supplyLimited', () => {
    const sources: FactorySource[] = [
      { machineId: 'pump_1', itemId: 'item_liquid_water', produceRate: 1, msPerRound: 1000, uncapped: true },
    ]
    const graph = buildChainGraph([{ itemId: 'drink', rate: 1000 }], [drinkRecipe], idx, sources, {})
    const source = graph.nodes.find(n => n.kind === 'source')
    expect(source?.demandPm).toBe(1000)
    expect(source?.actualPm).toBe(1000)
    expect(source?.supplyLimited).toBe(false)
  })
})


describe('区域资源上限与多路线分配', () => {
  // 息壤链路：气泵采集息壤气 → 固气转化机 → 息壤粉末；或 天有洪炉 碳块+水 → 粉末
  const transmuterSolid: FactoryRecipe = {
    id: 'transmuter_solid', machineId: 'transmuter_2',
    ingredients: [{ itemId: 'item_gas_xiranite', count: 1 }],
    outcomes: [{ itemId: 'item_xiranite_powder', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const oven: FactoryRecipe = {
    id: 'oven_powder', machineId: 'xiranite_oven_1',
    ingredients: [{ itemId: 'item_carbon_mtl', count: 1 }, { itemId: 'item_liquid_water', count: 1 }],
    outcomes: [{ itemId: 'item_xiranite_powder', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const gasFromPowder: FactoryRecipe = {
    id: 'gas_from_powder', machineId: 'transmuter_2',
    ingredients: [{ itemId: 'item_xiranite_powder', count: 1 }],
    outcomes: [{ itemId: 'item_gas_xiranite', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const xiRecipes = [transmuterSolid, oven, gasFromPowder]
  const xiIndex: FactoryItemIndex = {
    asIngredient: {
      item_gas_xiranite: [transmuterSolid],
      item_carbon_mtl: [oven],
      item_liquid_water: [oven],
      item_xiranite_powder: [gasFromPowder],
    },
    asOutcome: {
      item_xiranite_powder: [transmuterSolid, oven],
      item_gas_xiranite: [gasFromPowder],
    },
  }
  const xiSources: FactorySource[] = [
    { machineId: 'gas_pump_1', itemId: 'item_gas_xiranite', produceRate: 1, msPerRound: 3000 }, // 机台 20/min
    { machineId: 'pump_1', itemId: 'item_liquid_water', produceRate: 1, msPerRound: 1000, uncapped: true },
  ]
  const xiDefaultCrafts = { item_xiranite_powder: 'oven_powder' }

  it('武陵地区：气泵采集用满区域上限 100/min，剩余 50/min 由洪炉生产', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_xiranite_powder', rate: 150 }],
      xiRecipes, xiIndex, xiSources, xiDefaultCrafts,
      undefined, undefined, undefined, undefined, undefined,
      { item_gas_xiranite: 100 },
    )
    const transmuter = graph.nodes.find(n => n.machineId === 'transmuter_2' && n.itemId === 'item_xiranite_powder')
    const ovenNode = graph.nodes.find(n => n.machineId === 'xiranite_oven_1')
    expect(transmuter?.actualPm).toBe(100)
    expect(ovenNode?.actualPm).toBe(50)
    const gasSource = graph.nodes.find(n => n.kind === 'source' && n.itemId === 'item_gas_xiranite')
    expect(gasSource?.actualPm).toBe(100)
    expect(gasSource?.supplyLimited).toBe(false)
  })

  it('四号谷地：息壤气不可采集（上限 0），全部走洪炉且不展示气泵源节点', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_xiranite_powder', rate: 150 }],
      xiRecipes, xiIndex, xiSources, xiDefaultCrafts,
      undefined, undefined, undefined, undefined, undefined,
      {}, // 四号谷地未列出息壤气
    )
    expect(graph.nodes.some(n => n.machineId === 'transmuter_2')).toBe(false)
    const ovenNode = graph.nodes.find(n => n.machineId === 'xiranite_oven_1')
    expect(ovenNode?.actualPm).toBe(150)
    expect(graph.nodes.some(n => n.kind === 'source' && n.itemId === 'item_gas_xiranite')).toBe(false)
  })

  it('机台上限（无区域）：受限路线用满后剩余需求落到不受限路线', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_xiranite_powder', rate: 150 }],
      xiRecipes, xiIndex, xiSources, xiDefaultCrafts,
    )
    const transmuter = graph.nodes.find(n => n.machineId === 'transmuter_2' && n.itemId === 'item_xiranite_powder')
    const ovenNode = graph.nodes.find(n => n.machineId === 'xiranite_oven_1')
    expect(transmuter?.actualPm).toBe(20) // 气泵机台 20/min
    expect(ovenNode?.actualPm).toBe(130)
  })

  it('采集源达上限后超额需求转配方路线', () => {
    // 目标直接是息壤气：泵采 20/min + 超额 80/min 由粉末转化（粉末走洪炉，不构成回路）
    const graph = buildChainGraph(
      [{ itemId: 'item_gas_xiranite', rate: 100 }],
      xiRecipes, xiIndex, xiSources, xiDefaultCrafts,
    )
    const gasSource = graph.nodes.find(n => n.kind === 'source' && n.itemId === 'item_gas_xiranite')
    expect(gasSource?.actualPm).toBe(20)
    const gasMachine = graph.nodes.find(n => n.machineId === 'transmuter_2' && n.itemId === 'item_gas_xiranite')
    expect(gasMachine?.actualPm).toBe(80)
    const ovenNode = graph.nodes.find(n => n.machineId === 'xiranite_oven_1')
    expect(ovenNode?.actualPm).toBe(80)
    expect(graph.edges.every(e => e.cycleType !== 'closed')).toBe(true)
  })

  it('区域内未列出资源不可采集且无配方：源节点零供给并标记供应受限', () => {
    const ingotRecipe: FactoryRecipe = {
      id: 'iron_ingot', machineId: 'furnace',
      ingredients: [{ itemId: 'item_iron_ore', count: 2 }],
      outcomes: [{ itemId: 'item_iron_ingot', count: 1 }],
      totalProgress: 12000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: { item_iron_ore: [ingotRecipe] },
      asOutcome: { item_iron_ingot: [ingotRecipe] },
    }
    const srcs: FactorySource[] = [
      { machineId: 'miner_1', itemId: 'item_iron_ore', produceRate: 1, msPerRound: 1000 },
    ]
    const graph = buildChainGraph(
      [{ itemId: 'item_iron_ingot', rate: 20 }],
      [ingotRecipe], idx, srcs, {},
      undefined, undefined, undefined, undefined, undefined,
      {}, // 区域未列出蓝铁矿
    )
    const source = graph.nodes.find(n => n.kind === 'source')
    expect(source?.demandPm).toBe(40)
    expect(source?.actualPm).toBe(0)
    expect(source?.supplyLimited).toBe(true)
    const machine = graph.nodes.find(n => n.kind === 'machine')
    expect(machine?.supplyLimited).toBe(true)
  })

  it('多目标共享同一受限采集源：全局余量先到先得', () => {
    const graph = buildChainGraph(
      [{ itemId: 'item_xiranite_powder', rate: 120 }, { itemId: 'item_gas_xiranite', rate: 50 }],
      xiRecipes, xiIndex, xiSources, xiDefaultCrafts,
      undefined, undefined, undefined, undefined, undefined,
      { item_gas_xiranite: 100 },
    )
    // 粉末先用满 100 泵采 + 20 洪炉；随后息壤气目标泵采余量为 0，50 全部转粉末路线
    const gasSource = graph.nodes.find(n => n.kind === 'source' && n.itemId === 'item_gas_xiranite')
    expect(gasSource?.actualPm).toBe(100)
    const gasMachine = graph.nodes.find(n => n.machineId === 'transmuter_2' && n.itemId === 'item_gas_xiranite')
    expect(gasMachine?.actualPm).toBe(50)
  })
})

describe('有效循环预填充标识', () => {
  const plantRecipe: FactoryRecipe = {
    id: 'plant', machineId: 'planter',
    ingredients: [{ itemId: 'seed', count: 1 }],
    outcomes: [{ itemId: 'crop', count: 1 }],
    totalProgress: 1000, sortId: 0,
  }
  const seedRecipe: FactoryRecipe = {
    id: 'seed', machineId: 'seeder',
    ingredients: [{ itemId: 'crop', count: 1 }],
    outcomes: [{ itemId: 'seed', count: 2 }],
    totalProgress: 1000, sortId: 0,
  }
  const plantIndex: FactoryItemIndex = {
    asIngredient: { seed: [plantRecipe], crop: [seedRecipe] },
    asOutcome: { crop: [plantRecipe], seed: [seedRecipe] },
  }

  it('作物目标：采种机节点标记需预填充作物 ×1', () => {
    const graph = buildChainGraph([{ itemId: 'crop', rate: 10 }], [plantRecipe, seedRecipe], plantIndex, [], {})
    const seeder = graph.nodes.find(n => n.machineId === 'seeder')
    expect(seeder?.priming).toEqual({ itemId: 'crop', count: 1 })
    // 生产方（种植机）不标记
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    expect(planter?.priming).toBeUndefined()
  })

  it('种子目标：种植机节点标记需预填充种子 ×1', () => {
    const graph = buildChainGraph([{ itemId: 'seed', rate: 10 }], [plantRecipe, seedRecipe], plantIndex, [], {})
    const planter = graph.nodes.find(n => n.machineId === 'planter')
    expect(planter?.priming).toEqual({ itemId: 'seed', count: 1 })
  })
})


describe('扩容反应池多配方共炉', () => {
  // 炉内级联链：粉末+水→液X（3 物质）；液X+污水→液Y+副产（4）；液Y×2+铁粉→终物+污水（4）
  // 全组不同物质：粉末/水/液X/污水/液Y/副产/铁粉/终物 = 8，正好占满缓存区
  function makePoolRecipes(machineId: string): { poolA: FactoryRecipe; poolB: FactoryRecipe; poolC: FactoryRecipe } {
    return {
      poolA: {
        id: `pool_a_${machineId}`, machineId,
        ingredients: [{ itemId: 'powder', count: 1 }, { itemId: 'water', count: 1 }],
        outcomes: [{ itemId: 'liquid_x', count: 1 }],
        totalProgress: 12000, sortId: 0,
      },
      poolB: {
        id: `pool_b_${machineId}`, machineId,
        ingredients: [{ itemId: 'liquid_x', count: 1 }, { itemId: 'sewage', count: 1 }],
        outcomes: [{ itemId: 'liquid_y', count: 1 }, { itemId: 'byproduct', count: 1 }],
        totalProgress: 12000, sortId: 0,
      },
      poolC: {
        id: `pool_c_${machineId}`, machineId,
        ingredients: [{ itemId: 'liquid_y', count: 2 }, { itemId: 'iron_powder', count: 1 }],
        outcomes: [{ itemId: 'final', count: 1 }, { itemId: 'sewage', count: 1 }],
        totalProgress: 12000, sortId: 0,
      },
    }
  }
  const { poolA, poolB, poolC } = makePoolRecipes('mix_pool_2')
  const poolIndex: FactoryItemIndex = {
    asIngredient: {
      powder: [poolA], water: [poolA],
      liquid_x: [poolB], sewage: [poolB],
      liquid_y: [poolC], iron_powder: [poolC],
    },
    asOutcome: {
      liquid_x: [poolA],
      liquid_y: [poolB], byproduct: [poolB],
      final: [poolC], sewage: [poolC],
    },
  }
  const poolSources: FactorySource[] = [
    { machineId: 'miner', itemId: 'powder', produceRate: 100, msPerRound: 100 },
    { machineId: 'pump', itemId: 'water', produceRate: 100, msPerRound: 100, uncapped: true },
    { machineId: 'miner2', itemId: 'iron_powder', produceRate: 100, msPerRound: 100 },
    { machineId: 'pump2', itemId: 'sewage', produceRate: 100, msPerRound: 100, uncapped: true },
  ]

  it('级联 3 配方合并为单台反应池节点：缓存区 8/8，台数取最大产线数', () => {
    const graph = buildChainGraph([{ itemId: 'final', rate: 10 }], [poolA, poolB, poolC], poolIndex, poolSources, {})
    const poolNodes = graph.nodes.filter(n => n.machineId === 'mix_pool_2')
    expect(poolNodes).toHaveLength(1)
    const reactor = poolNodes[0]
    expect(reactor.key.startsWith('reactor:')).toBe(true)
    expect(reactor.recipes).toHaveLength(3)
    expect(reactor.slotsUsed).toBe(8)
    expect(reactor.slotsTotal).toBe(8)
    // 单线理论 5/min：终物 10 → 2 线；液Y 20 → 4 线；液X 20 → 4 线 → 台数 4
    expect(reactor.machineCount).toBe(4)
    expect(reactor.recipes?.map(r => r.actualPm)).toEqual([10, 20, 20])
    // 炉内级联边取消：所有边的端点都是现存节点，且无自环
    const nodeKeys = new Set(graph.nodes.map(n => n.key))
    for (const e of graph.edges) {
      expect(e.from === e.to).toBe(false)
      expect(nodeKeys.has(e.from)).toBe(true)
      expect(nodeKeys.has(e.to)).toBe(true)
    }
    // 外部边重定向：反应池 → 目标、源 → 反应池
    expect(graph.edges.some(e => e.from === reactor.key && e.to === 'target:final')).toBe(true)
    expect(graph.edges.some(e => e.from.startsWith('source:') && e.to === reactor.key)).toBe(true)
  })

  it('普通反应池（mix_pool_1）不合并、不标注缓存区', () => {
    const { poolA: a, poolB: b, poolC: c } = makePoolRecipes('mix_pool_1')
    const idx: FactoryItemIndex = {
      asIngredient: {
        powder: [a], water: [a], liquid_x: [b], sewage: [b], liquid_y: [c], iron_powder: [c],
      },
      asOutcome: { liquid_x: [a], liquid_y: [b], byproduct: [b], final: [c], sewage: [c] },
    }
    const graph = buildChainGraph([{ itemId: 'final', rate: 10 }], [a, b, c], idx, poolSources, {})
    const poolNodes = graph.nodes.filter(n => n.machineId === 'mix_pool_1')
    expect(poolNodes).toHaveLength(3)
    expect(poolNodes.every(n => n.slotsTotal == null && n.recipes == null)).toBe(true)
  })

  it('缓存区溢出时拆分为多台反应池，跨池物品保留外部物流边', () => {
    // 追加下游配方 poolD：终物+矿石→产物2（新增 矿石/产物2 两种物质，全组 10 > 8）
    const poolD: FactoryRecipe = {
      id: 'pool_d', machineId: 'mix_pool_2',
      ingredients: [{ itemId: 'final', count: 1 }, { itemId: 'ore', count: 1 }],
      outcomes: [{ itemId: 'final2', count: 1 }],
      totalProgress: 12000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: {
        ...poolIndex.asIngredient,
        final: [poolD], ore: [poolD],
      },
      asOutcome: { ...poolIndex.asOutcome, final2: [poolD] },
    }
    const sources = [...poolSources, { machineId: 'miner3', itemId: 'ore', produceRate: 100, msPerRound: 100 }]
    const graph = buildChainGraph([{ itemId: 'final2', rate: 10 }], [poolA, poolB, poolC, poolD], idx, sources, {})
    const poolNodes = graph.nodes.filter(n => n.machineId === 'mix_pool_2')
    // 装箱（共享污水/液Y/液X）：[poolD+poolC+poolB]=8 物质共炉、[poolA] 单池 3 物质
    expect(poolNodes).toHaveLength(2)
    const merged = poolNodes.find(n => n.recipes != null)
    const singleton = poolNodes.find(n => n.recipes == null)
    expect(merged?.recipes).toHaveLength(3)
    expect(merged?.slotsUsed).toBe(8)
    expect(merged?.slotsTotal).toBe(8)
    expect(singleton?.slotsUsed).toBe(3)
    expect(singleton?.slotsTotal).toBe(8)
    // 跨池级联边（液X：poolA 池 → 共炉池）保留为外部物流边
    const crossEdge = graph.edges.find(e =>
      e.itemId === 'liquid_x' && e.from === singleton?.key && e.to === merged?.key,
    )
    expect(crossEdge?.perMinute).toBe(20)
  })

  it('不相连的独立配方只要缓存区容纳得下也合并', () => {
    const poolE: FactoryRecipe = {
      id: 'pool_e', machineId: 'mix_pool_2',
      ingredients: [{ itemId: 'a', count: 1 }, { itemId: 'b', count: 1 }],
      outcomes: [{ itemId: 'c', count: 1 }],
      totalProgress: 12000, sortId: 0,
    }
    const poolF: FactoryRecipe = {
      id: 'pool_f', machineId: 'mix_pool_2',
      ingredients: [{ itemId: 'd', count: 1 }, { itemId: 'e', count: 1 }],
      outcomes: [{ itemId: 'f', count: 1 }],
      totalProgress: 12000, sortId: 0,
    }
    const idx: FactoryItemIndex = {
      asIngredient: { a: [poolE], b: [poolE], d: [poolF], e: [poolF] },
      asOutcome: { c: [poolE], f: [poolF] },
    }
    const sources: FactorySource[] = ['a', 'b', 'd', 'e'].map(itemId => ({
      machineId: 'miner', itemId, produceRate: 100, msPerRound: 100,
    }))
    const graph = buildChainGraph(
      [{ itemId: 'c', rate: 5 }, { itemId: 'f', rate: 5 }],
      [poolE, poolF], idx, sources, {},
    )
    const poolNodes = graph.nodes.filter(n => n.machineId === 'mix_pool_2')
    expect(poolNodes).toHaveLength(1)
    expect(poolNodes[0].recipes).toHaveLength(2)
    expect(poolNodes[0].slotsUsed).toBe(6)
  })
})
