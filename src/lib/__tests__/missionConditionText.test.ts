import { describe, it, expect } from 'vitest'
import { renderConditionText, type ConditionTextT } from '../missionConditionText'
import type { MissionConditionRender } from '../missionCondition'

const TEMPLATES: Record<string, string> = {
  'story.objReachDestination': '前往地图 {{map}} 的 {{area}}',
  'story.objTalkOption': '完成对话 {{dialog}}',
  'story.objQuestState': '完成任务目标 {{quest}}',
  'story.objMissionState': '完成任务 {{mission}}',
  'story.objStageStatus': '完成活动阶段 {{stage}}',
  'story.objHasItem': '持有 {{item}}',
  'story.objHasItemCount': '持有 {{item}} ×{{count}}',
  'story.objHasMoney': '拥有 {{count}} 个 {{item}}',
  'story.objAdventureLevel': '冒险等级达到 {{level}}',
  'story.objWorldLevel': '世界等级达到 {{level}}',
  'story.objProgress': '进度达到 {{progress}}',
  'story.objAnd': '且',
  'story.objOr': '或',
  'story.objNot': '非',
}

const t: ConditionTextT = (key, vars) => {
  let s = TEMPLATES[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{{${k}}}`, String(v))
  }
  return s
}

describe('renderConditionText', () => {
  it('maps ReachDestination to template with map and area', () => {
    const render: MissionConditionRender = {
      type: 'ReachDestination',
      args: { map: '供能高地', area: 'e11m4_004' },
      fields: [],
    }
    expect(renderConditionText(render, t)).toBe('前往地图 供能高地 的 e11m4_004')
  })

  it('handles PlayerHasItem with and without count', () => {
    const withCount: MissionConditionRender = {
      type: 'PlayerHasItem', args: { item: '金条', count: 3 }, fields: [],
    }
    expect(renderConditionText(withCount, t)).toBe('持有 金条 ×3')

    const noCount: MissionConditionRender = {
      type: 'WeekRaidPlayerHasItem', args: { item: '银币' }, fields: [],
    }
    expect(renderConditionText(noCount, t)).toBe('持有 银币')
  })

  it('renders CombineCondition recursively with and/or/not tokens', () => {
    const render: MissionConditionRender = {
      type: 'CombineCondition',
      fields: [],
      combinedText: 'not {0} and {1}',
      children: [
        { type: 'CheckMissionState', args: { mission: 'e2m8' }, fields: [] },
        { type: 'CheckQuestState', args: { quest: 'a1m2_q#3' }, fields: [] },
      ],
    }
    expect(renderConditionText(render, t)).toBe('非 完成任务 e2m8 且 完成任务目标 a1m2_q#3')
  })

  it('falls back to fields for unknown types', () => {
    const render: MissionConditionRender = {
      type: 'UnknownType',
      fields: [
        { name: '_sceneId', value: 'scene_1' },
        { name: '_slotIds', value: '1, 2' },
      ],
    }
    const text = renderConditionText(render, t)
    expect(text).toContain('_sceneId')
    expect(text).toContain('scene_1')
  })

  it('returns null when nothing renderable', () => {
    const render: MissionConditionRender = { type: 'UnknownType', fields: [] }
    expect(renderConditionText(render, t)).toBeNull()
  })
})
