import { describe, it, expect } from 'vitest'
import { resolveConditionArgs, type ConditionArgValue } from '../missionConditionNames'
import type { MissionConditionRender } from '../missionCondition'

describe('resolveConditionArgs', () => {
  const resolver = (argName: string, raw: ConditionArgValue): ConditionArgValue | undefined => {
    if (argName === 'map') return `地图:${raw}`
    if (argName === 'item') return `道具:${raw}`
    return undefined
  }

  it('replaces resolvable args and keeps raw for the rest', () => {
    const render: MissionConditionRender = {
      type: 'ReachDestination',
      args: { map: 'map02_lv008', area: 'e11m3_006' },
      fields: [],
    }
    const out = resolveConditionArgs(render, resolver)
    expect(out.args).toEqual({ map: '地图:map02_lv008', area: 'e11m3_006' })
    expect(out.type).toBe('ReachDestination')
  })

  it('preserves numeric args untouched when unresolvable', () => {
    const render: MissionConditionRender = {
      type: 'PlayerHasItem',
      args: { item: 'item_1002', count: 5 },
      fields: [],
    }
    const out = resolveConditionArgs(render, resolver)
    expect(out.args).toEqual({ item: '道具:item_1002', count: 5 })
  })

  it('recurses into CombineCondition children', () => {
    const render: MissionConditionRender = {
      type: 'CombineCondition',
      fields: [],
      combinedText: '{0} and {1}',
      children: [
        { type: 'CheckMissionState', args: { mission: 'e2m8' }, fields: [] },
        { type: 'ReachDestination', args: { map: 'map01_lv007', area: 'c33m1_007' }, fields: [] },
      ],
    }
    const out = resolveConditionArgs(render, resolver)
    expect(out.children![0].args).toEqual({ mission: 'e2m8' })
    expect(out.children![1].args).toEqual({ map: '地图:map01_lv007', area: 'c33m1_007' })
  })

  it('does not mutate the input render', () => {
    const render: MissionConditionRender = {
      type: 'ReachDestination',
      args: { map: 'map02_lv008' },
      fields: [],
    }
    const out = resolveConditionArgs(render, resolver)
    expect(out).not.toBe(render)
    expect(render.args).toEqual({ map: 'map02_lv008' })
    expect(out.args).toEqual({ map: '地图:map02_lv008' })
  })
})
