import { describe, it, expect } from 'vitest'
import {
  shortConditionType,
  unwrapConstValue,
  normalizeConditionValue,
  extractConditionFields,
  renderMissionCondition,
  registerMissionConditionFormatter,
} from '../missionCondition'

const checkStage = {
  $type: 'Beyond.Gameplay.CheckActivityConditionalStageStatus, Gameplay.Beyond',
  uniqueId: '86c2ba68',
  useCurrentScope: false,
  scopeMask: 1,
  useGraphScope: true,
  _activityStageId: { constValue: 'dungeon_fighting_5' },
  _comparer: { constValue: 3 },
  _progressToCompare: { constValue: 1 },
}

describe('shortConditionType', () => {
  it('extracts short name from full C# type', () => {
    expect(shortConditionType(checkStage)).toBe('CheckActivityConditionalStageStatus')
  })

  it('handles namespaced non-assembly types', () => {
    expect(shortConditionType({ $type: 'Beyond.Gameplay.Conditions.OnUIPanelClose' })).toBe('OnUIPanelClose')
  })

  it('returns Unknown when $type is missing', () => {
    expect(shortConditionType({ _comparer: { constValue: 0 } })).toBe('Unknown')
    expect(shortConditionType(null)).toBe('Unknown')
  })
})

describe('unwrapConstValue', () => {
  it('unwraps single constValue wrapper', () => {
    expect(unwrapConstValue({ constValue: 'dungeon_fighting_5' })).toBe('dungeon_fighting_5')
    expect(unwrapConstValue({ constValue: 3 })).toBe(3)
    expect(unwrapConstValue({ constValue: true })).toBe(true)
  })

  it('recurses nested constValue wrappers', () => {
    expect(unwrapConstValue({ constValue: { constValue: 'a' } })).toBe('a')
  })

  it('renders nested struct constValue as key=value', () => {
    expect(unwrapConstValue({ constValue: { scriptId: 22801130002 } })).toBe('scriptId=22801130002')
  })

  it('passes primitives through and returns null for nullish', () => {
    expect(unwrapConstValue('raw')).toBe('raw')
    expect(unwrapConstValue(7)).toBe(7)
    expect(unwrapConstValue(null)).toBeNull()
    expect(unwrapConstValue(undefined)).toBeNull()
  })
})

describe('normalizeConditionValue', () => {
  it('joins arrays of wrapped values', () => {
    expect(normalizeConditionValue([{ constValue: 'e1' }, { constValue: 'e2' }])).toBe('e1, e2')
  })

  it('returns null for empty arrays', () => {
    expect(normalizeConditionValue([])).toBeNull()
  })
})

describe('extractConditionFields', () => {
  it('excludes metadata and reserved keys, unwraps const values', () => {
    const fields = extractConditionFields(checkStage)
    expect(fields).toEqual([
      { name: '_activityStageId', value: 'dungeon_fighting_5' },
      { name: '_comparer', value: 3 },
      { name: '_progressToCompare', value: 1 },
    ])
  })

  it('keeps non-underscore data fields', () => {
    const cond = {
      $type: 'Beyond.Gameplay.CheckLevelScriptStage, Gameplay.Beyond',
      levelId: { constValue: 'map02_lv007' },
      scriptId: { constValue: { scriptId: 10200190002 } },
      _compareOperator: { constValue: 3 },
      _progressToCompare: { constValue: 1 },
    }
    expect(extractConditionFields(cond)).toEqual([
      { name: 'levelId', value: 'map02_lv007' },
      { name: 'scriptId', value: 'scriptId=10200190002' },
      { name: '_compareOperator', value: 3 },
      { name: '_progressToCompare', value: 1 },
    ])
  })
})

describe('renderMissionCondition', () => {
  it('renders fallback fields for unknown types', () => {
    const out = renderMissionCondition(checkStage)
    expect(out).not.toBeNull()
    expect(out!.type).toBe('CheckActivityConditionalStageStatus')
    expect(out!.args).toEqual({ stage: 'dungeon_fighting_5' })
    expect(out!.fields).toEqual([
      { name: '_activityStageId', value: 'dungeon_fighting_5' },
      { name: '_comparer', value: 3 },
      { name: '_progressToCompare', value: 1 },
    ])
  })

  it('recurses CombineCondition subConditions and keeps combinedText', () => {
    const cond = {
      $type: 'Beyond.Gameplay.CombineCondition, Gameplay.Beyond',
      uniqueId: 'dc8398cd',
      scopeMask: 1,
      useGraphScope: true,
      conditionEvalString: '{0} and ({1} or {2})',
      subConditions: [
        {
          $type: 'Beyond.Gameplay.CheckAdventureLevel, Gameplay.Beyond',
          _comparer: { constValue: 3 },
          _progressToCompare: { constValue: 25 },
        },
        {
          $type: 'Beyond.Gameplay.CheckMissionState, Gameplay.Beyond',
          _missionId: { constValue: 'e2m8' },
          _targetMissionState: { constValue: 3 },
        },
      ],
    }
    const out = renderMissionCondition(cond)
    expect(out).not.toBeNull()
    expect(out!.type).toBe('CombineCondition')
    expect(out!.combinedText).toBe('{0} and ({1} or {2})')
    expect(out!.fields).toEqual([])
    expect(out!.children).toHaveLength(2)
    expect(out!.children![0].type).toBe('CheckAdventureLevel')
    expect(out!.children![0].fields).toEqual([
      { name: '_comparer', value: 3 },
      { name: '_progressToCompare', value: 25 },
    ])
    expect(out!.children![1].type).toBe('CheckMissionState')
    expect(out!.children![1].fields).toEqual([
      { name: '_missionId', value: 'e2m8' },
      { name: '_targetMissionState', value: 3 },
    ])
  })

  it('dispatches to registered formatter and passes context', () => {
    registerMissionConditionFormatter('PhonyFormatter', (cond) => ({
      type: 'PhonyFormatter',
      args: { dialog: (cond._dialogId as any).constValue },
      fields: [],
    }))
    const out = renderMissionCondition(
      {
        $type: 'Beyond.Gameplay.PhonyFormatter, Gameplay.Beyond',
        _dialogId: { constValue: 'dlg_a1m2_3' },
        _finishId: { constValue: -1 },
      },
      { resolveText: (k) => `T:${k}` },
    )
    expect(out).not.toBeNull()
    expect(out!.type).toBe('PhonyFormatter')
    expect(out!.args).toEqual({ dialog: 'dlg_a1m2_3' })
    expect(out!.fields).toEqual([])
  })

  it('falls back to fields when formatter returns null', () => {
    registerMissionConditionFormatter('NullFormatter', () => null)
    const out = renderMissionCondition({
      $type: 'Beyond.Gameplay.NullFormatter, Gameplay.Beyond',
      _moneyId: { constValue: 'item_1001' },
      _progressToCompare: { constValue: 100 },
    })
    expect(out!.type).toBe('NullFormatter')
    expect(out!.fields).toEqual([
      { name: '_moneyId', value: 'item_1001' },
      { name: '_progressToCompare', value: 100 },
    ])
  })

  it('returns null for empty / non-object input', () => {
    expect(renderMissionCondition(null)).toBeNull()
    expect(renderMissionCondition(undefined)).toBeNull()
    expect(renderMissionCondition('nope')).toBeNull()
  })
})

describe('high-frequency condition formatters', () => {
  const cond = (type: string, extra: Record<string, unknown>) => ({
    $type: `Beyond.Gameplay.${type}, Gameplay.Beyond`,
    uniqueId: 'u',
    scopeMask: 1,
    useGraphScope: true,
    ...extra,
  })

  it('ReachDestination maps map and area', () => {
    const out = renderMissionCondition(cond('ReachDestination', {
      _areaId: { constValue: 'e11m3_006' },
      _mapId: { constValue: 'map02_lv008' },
    }))
    expect(out!.type).toBe('ReachDestination')
    expect(out!.args).toEqual({ map: 'map02_lv008', area: 'e11m3_006' })
  })

  it('CheckTalkOptionFinish maps dialog id', () => {
    const out = renderMissionCondition(cond('CheckTalkOptionFinish', {
      _dialogId: { constValue: 'dlg_a1m2_3' },
      _finishId: { constValue: -1 },
    }))
    expect(out!.args).toEqual({ dialog: 'dlg_a1m2_3' })
  })

  it('CheckQuestState maps quest id', () => {
    const out = renderMissionCondition(cond('CheckQuestState', {
      _questId: { constValue: 'gm02m21_q#2' },
      _comparer: { constValue: 0 },
      _targetQuestState: { constValue: 3 },
    }))
    expect(out!.args).toEqual({ quest: 'gm02m21_q#2' })
  })

  it('CheckMissionState maps mission id', () => {
    const out = renderMissionCondition(cond('CheckMissionState', {
      _missionId: { constValue: 'e2m8' },
      _targetMissionState: { constValue: 3 },
    }))
    expect(out!.args).toEqual({ mission: 'e2m8' })
  })

  it('CheckActivityConditionalStageStatus maps activity stage id', () => {
    const out = renderMissionCondition(cond('CheckActivityConditionalStageStatus', {
      _activityStageId: { constValue: 'dungeon_fighting_5' },
      _comparer: { constValue: 3 },
      _progressToCompare: { constValue: 1 },
    }))
    expect(out!.args).toEqual({ stage: 'dungeon_fighting_5' })
  })

  it('PlayerHasItem / PlayerHasItemInItemBag map item and count', () => {
    const a = renderMissionCondition(cond('PlayerHasItem', {
      _itemId: { constValue: 'item_plant_mushroom_1_3' },
      _progressToCompare: { constValue: 1 },
    }))
    expect(a!.args).toEqual({ item: 'item_plant_mushroom_1_3', count: 1 })
    const b = renderMissionCondition(cond('PlayerHasItemInItemBag', {
      _itemId: { constValue: 'item_1002' },
      _progressToCompare: { constValue: 5 },
    }))
    expect(b!.args).toEqual({ item: 'item_1002', count: 5 })
  })

  it('WeekRaidPlayerHasItem maps item without count', () => {
    const out = renderMissionCondition(cond('WeekRaidPlayerHasItem', {
      _itemId: { constValue: 'item_1003' },
    }))
    expect(out!.args).toEqual({ item: 'item_1003' })
  })

  it('CheckMoney maps item and count', () => {
    const out = renderMissionCondition(cond('CheckMoney', {
      _moneyId: { constValue: 'item_1001' },
      _progressToCompare: { constValue: 100 },
    }))
    expect(out!.args).toEqual({ item: 'item_1001', count: 100 })
  })

  it('level checks map progressToCompare as level', () => {
    expect(renderMissionCondition(cond('CheckAdventureLevel', { _progressToCompare: { constValue: 25 } }))!.args).toEqual({ level: 25 })
    expect(renderMissionCondition(cond('CheckWorldLevel', { _progressToCompare: { constValue: 2 } }))!.args).toEqual({ level: 2 })
    expect(renderMissionCondition(cond('CheckUnlockWorldLevel', { _progressToCompare: { constValue: 1 } }))!.args).toEqual({ level: 1 })
  })

  it('unregistered types still fall back to fields without args', () => {
    const out = renderMissionCondition(cond('CheckSnapshotIdentifySuccess', {
      _identifyGroupId: { constValue: 'grp_1' },
      _progressToCompare: { constValue: 1 },
    }))
    expect(out!.type).toBe('CheckSnapshotIdentifySuccess')
    expect(out!.args).toBeUndefined()
    expect(out!.fields).toEqual([
      { name: '_identifyGroupId', value: 'grp_1' },
      { name: '_progressToCompare', value: 1 },
    ])
  })

  it('GameConditionServerPlaceHolder maps progressToCompare as progress', () => {
    const out = renderMissionCondition(cond('GameConditionServerPlaceHolder', {
      _comparer: { constValue: 0 },
      _progressToCompare: { constValue: 1 },
    }))
    expect(out!.type).toBe('GameConditionServerPlaceHolder')
    expect(out!.args).toEqual({ progress: 1 })
  })

  it('CombineCondition propagates formatter args to children', () => {
    const out = renderMissionCondition({
      $type: 'Beyond.Gameplay.CombineCondition, Gameplay.Beyond',
      conditionEvalString: '{0} and {1}',
      subConditions: [
        cond('CheckMissionState', { _missionId: { constValue: 'e2m8' } }),
        cond('CheckAdventureLevel', { _progressToCompare: { constValue: 25 } }),
      ],
    })
    expect(out!.children).toHaveLength(2)
    expect(out!.children![0].args).toEqual({ mission: 'e2m8' })
    expect(out!.children![1].args).toEqual({ level: 25 })
  })
})
