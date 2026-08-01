import { describe, it, expect } from 'vitest'
import { resolveConditionArgs, buildEnemySummary, buildDungeonDetail, buildStageDetail, extractParamStrings, type ConditionArgValue } from '../missionConditionNames'
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

describe('extractParamStrings', () => {
  it('extracts string lists from wrapped parameters', () => {
    const params = [
      { valueStringList: ['dung01_actmonster02'], valueIntList: null },
      { valueStringList: null, valueIntList: [3] },
    ]
    expect(extractParamStrings(params)).toEqual(['dung01_actmonster02', '3'])
  })

  it('falls back to raw value for non-object params', () => {
    expect(extractParamStrings(['abc', 5])).toEqual(['abc', '5'])
  })
})

describe('buildEnemySummary', () => {
  const enemyTable = { eny_hound: { templateId: 'eny_0050_hound', name: { id: 1, text: '' }, nickname: { id: 2, text: '' } } }
  const i18n = { '1': '碾骨撕裂牙兽', '2': '碾骨撕裂牙兽' }
  const iconUrl = (tpl: string) => `icon:${tpl}`

  it('resolves name/nickname/icon from table + i18n', () => {
    const s = buildEnemySummary('eny_hound', { raw: enemyTable, i18n }, iconUrl)
    expect(s).toEqual({
      enemyId: 'eny_hound',
      name: '碾骨撕裂牙兽',
      nickname: '碾骨撕裂牙兽',
      templateId: 'eny_0050_hound',
      iconUrl: 'icon:eny_0050_hound',
    })
  })

  it('returns undefined when enemy missing', () => {
    expect(buildEnemySummary('eny_missing', { raw: enemyTable, i18n }, iconUrl)).toBeUndefined()
  })

  it('falls back to enemyId for name when unresolvable', () => {
    const s = buildEnemySummary('eny_other', { raw: { eny_other: { templateId: '', name: null, nickname: null } }, i18n }, iconUrl)
    expect(s!.name).toBe('eny_other')
    expect(s!.templateId).toBe('eny_other')
  })
})

describe('buildDungeonDetail', () => {
  const dungeonTable = {
    dung01: {
      dungeonName: { id: 10, text: '' },
      dungeonDesc: { id: 11, text: '' },
      dungeonLevelDesc: { id: 12, text: '' },
      featureDesc: { id: 13, text: '' },
      dungeonPicPath: 'dung_surviva_bomb',
      costStamina: 5,
      dungeonCategory: 'dungeon_actmonster',
      sortId: 2,
      sceneId: 'dung01_cdg012',
      enemyIds: ['eny_a', 'eny_b'],
      enemyLevels: [40, 40],
      firstPassRewardId: 'reward_first',
      rewardId: '',
    },
  }
  const dungeonI18n = { '10': '爆破练习', '11': 'desc', '12': '威胁等级·未知', '13': 'feature' }
  const enemyTable = {
    eny_a: { templateId: 'eny_a_tpl', name: { id: 21, text: '' }, nickname: { id: 0, text: '' } },
    eny_b: { templateId: 'eny_b_tpl', name: { id: 22, text: '' }, nickname: { id: 0, text: '' } },
  }
  const enemyI18n = { '21': '碾骨撕裂牙兽', '22': '巨型炸弹' }
  const iconUrl = (tpl: string) => `icon:${tpl}`
  const picUrl = (path: string) => `pic:${path}`

  it('builds dungeon detail with enemies aligned by index', () => {
    const d = buildDungeonDetail('dung01', { dungeon: { raw: dungeonTable, i18n: dungeonI18n }, enemy: { raw: enemyTable, i18n: enemyI18n } }, iconUrl, picUrl)
    expect(d).not.toBeNull()
    expect(d!.name).toBe('爆破练习')
    expect(d!.picUrl).toBe('pic:dung_surviva_bomb')
    expect(d!.enemies).toHaveLength(2)
    expect(d!.enemies[0].level).toBe(40)
    expect(d!.enemies[0].summary!.name).toBe('碾骨撕裂牙兽')
    expect(d!.enemies[1].summary!.iconUrl).toBe('icon:eny_b_tpl')
    expect(d!.rewards).toEqual({ fixed: [], firstPass: ['reward_first'], custom: [], extra: [], hunter: [] })
  })

  it('returns null when dungeon missing', () => {
    expect(buildDungeonDetail('dung_missing', { dungeon: { raw: dungeonTable, i18n: dungeonI18n }, enemy: { raw: enemyTable, i18n: enemyI18n } }, iconUrl, picUrl)).toBeNull()
  })

  it('skips enemies beyond enemyLevels length', () => {
    const t = { ...dungeonTable, dung02: { ...dungeonTable.dung01, enemyIds: ['eny_a', 'eny_b', 'eny_c'], enemyLevels: [10] } }
    const d = buildDungeonDetail('dung02', { dungeon: { raw: t, i18n: dungeonI18n }, enemy: { raw: enemyTable, i18n: enemyI18n } }, iconUrl, picUrl)
    expect(d!.enemies).toHaveLength(1)
    expect(d!.enemies[0].enemyId).toBe('eny_a')
  })
})

describe('buildStageDetail', () => {
  const ctx = {
    stage: {
      raw: {
        dung_fighting_2: { activityId: 'dungeon_fighting', desc: { id: 101, text: '' }, rewardId: 'reward_dungeon_actmonster_a1d2' },
      },
      i18n: {},
    },
    complete: {
      raw: {
        dung_fighting_2: {
          conditionList: [{ conditionType: 5052, compareOperator: 3, progressToCompare: 0, conditionId: 'c1', parameters: [{ valueStringList: ['dung01_actmonster02'] }] }],
        },
      },
    },
    dungStage: { raw: { dung_fighting_2: { levelId: 'dung01_actmonster02', questId: 'a1m2_q#Day2' } } },
    multiStage: {
      raw: { dungeon_fighting: { stageList: { dung_fighting_2: { name: { id: 102, text: '' }, missionId: 'a1m2', sortId: 2, timeId: 't1' } } } },
      i18n: { '102': '爆破练习' },
    },
    condition: { raw: { dung_fighting_2: { conditionList: [{ blockShow: false, desc: { id: 103, text: '' } }] } }, i18n: { '103': '完成前置关卡后解锁' } },
    activity: { raw: { dungeon_fighting: { name: { id: 104, text: '' } } }, i18n: { '104': '生存特训' } },
    dungeon: {
      raw: {
        dung01_actmonster02: {
          dungeonName: { id: 105, text: '' },
          dungeonDesc: { id: 0, text: '' },
          dungeonLevelDesc: { id: 0, text: '' },
          featureDesc: { id: 0, text: '' },
          dungeonPicPath: 'dung_surviva_bomb',
          enemyIds: [],
          enemyLevels: [],
          firstPassRewardId: '',
        },
      },
      i18n: { '105': '爆破练习' },
    },
    enemy: { raw: {}, i18n: {} },
    questDesc: new Map([['a1m2_q#Day2', '使用爆炸物击败敌人']]),
    iconUrl: (tpl: string) => `icon:${tpl}`,
    picUrl: (path: string) => `pic:${path}`,
  }

  it('builds stage detail with all linked data', () => {
    const d = buildStageDetail('dung_fighting_2', ctx)
    expect(d).not.toBeNull()
    expect(d!.stageName).toBe('爆破练习')
    expect(d!.activityName).toBe('生存特训')
    expect(d!.missionId).toBe('a1m2')
    expect(d!.sortId).toBe(2)
    expect(d!.rewardId).toBe('reward_dungeon_actmonster_a1d2')
    expect(d!.unlockTexts).toEqual(['完成前置关卡后解锁'])
    expect(d!.relatedQuestText).toBe('使用爆炸物击败敌人')
    expect(d!.dungeonDetail).not.toBeNull()
    expect(d!.dungeonDetail!.name).toBe('爆破练习')
    expect(d!.conditions).toHaveLength(1)
    expect(d!.conditions[0].conditionType).toBe(5052)
  })

  it('returns null when stage missing', () => {
    expect(buildStageDetail('missing_stage', ctx)).toBeNull()
  })

  it('skips blockShow unlock conditions', () => {
    const hiddenCtx = {
      ...ctx,
      condition: { raw: { dung_fighting_2: { conditionList: [{ blockShow: true, desc: { id: 103, text: '' } }] } }, i18n: { '103': '隐藏条件' } },
    }
    const d = buildStageDetail('dung_fighting_2', hiddenCtx)
    expect(d!.unlockTexts).toEqual([])
  })

  it('returns null dungeonDetail when levelId missing', () => {
    const noDung = { ...ctx, dungStage: { raw: { dung_fighting_2: {} } } }
    const d = buildStageDetail('dung_fighting_2', noDung)
    expect(d!.dungeonDetail).toBeNull()
  })
})
