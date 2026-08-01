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
    expect(out!.summary).toBeUndefined()
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
    registerMissionConditionFormatter('CheckTalkOptionFinish', (cond, ctx) => ({
      type: 'CheckTalkOptionFinish',
      summary: `talk ${(cond._dialogId as any).constValue} ${ctx.resolveText?.('x') ?? ''}`.trim(),
      fields: [],
    }))
    const out = renderMissionCondition(
      {
        $type: 'Beyond.Gameplay.CheckTalkOptionFinish, Gameplay.Beyond',
        _dialogId: { constValue: 'dlg_a1m2_3' },
        _finishId: { constValue: -1 },
      },
      { resolveText: (k) => `T:${k}` },
    )
    expect(out).not.toBeNull()
    expect(out!.type).toBe('CheckTalkOptionFinish')
    expect(out!.summary).toBe('talk dlg_a1m2_3 T:x')
    expect(out!.fields).toEqual([])
  })

  it('falls back to fields when formatter returns null', () => {
    registerMissionConditionFormatter('CheckMoney', () => null)
    const out = renderMissionCondition({
      $type: 'Beyond.Gameplay.CheckMoney, Gameplay.Beyond',
      _moneyId: { constValue: 'item_1001' },
      _progressToCompare: { constValue: 100 },
    })
    expect(out!.type).toBe('CheckMoney')
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
