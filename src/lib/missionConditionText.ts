import type { MissionConditionRender } from './missionCondition'

export type ConditionTextT = (key: string, vars?: Record<string, string | number>) => string

function combineText(
  render: MissionConditionRender,
  t: ConditionTextT,
): string {
  const children = (render.children ?? []).map((child) => renderConditionText(child, t))
  const evalStr = render.combinedText ?? ''
  if (!evalStr) return children.join(` ${t('story.objAnd')} `)
  let out = evalStr
    .replace(/\band\b/gi, ` ${t('story.objAnd')} `)
    .replace(/\bor\b/gi, ` ${t('story.objOr')} `)
    .replace(/\bnot\b/gi, ` ${t('story.objNot')} `)
  out = out.replace(/\{(\d+)\}/g, (_, i) => children[Number(i)] ?? '')
  return out.replace(/\s+/g, ' ').trim()
}

function fallbackFields(render: MissionConditionRender): string | null {
  if (render.fields.length === 0) return null
  return render.fields.map((f) => `${f.name}: ${String(f.value)}`).join(' · ')
}

export function renderConditionText(
  render: MissionConditionRender,
  t: ConditionTextT,
): string | null {
  if (render.type === 'CombineCondition') {
    const text = combineText(render, t)
    return text.length > 0 ? text : null
  }
  const args = render.args ?? {}
  const arg = (name: string): string | number | undefined => args[name]
  const str = (name: string): string => (args[name] === undefined ? '' : String(args[name]))
  switch (render.type) {
    case 'ReachDestination':
      if (arg('map') !== undefined) {
        return t('story.objReachDestination', { map: str('map'), area: str('area') })
      }
      return fallbackFields(render)
    case 'CheckTalkOptionFinish':
      if (arg('dialog') !== undefined) return t('story.objTalkOption', { dialog: str('dialog') })
      return fallbackFields(render)
    case 'CheckQuestState':
      if (arg('quest') !== undefined) return t('story.objQuestState', { quest: str('quest') })
      return fallbackFields(render)
    case 'CheckMissionState':
      if (arg('mission') !== undefined) return t('story.objMissionState', { mission: str('mission') })
      return fallbackFields(render)
    case 'CheckActivityConditionalStageStatus':
      if (arg('stage') !== undefined) return t('story.objStageStatus', { stage: str('stage') })
      return fallbackFields(render)
    case 'PlayerHasItem':
    case 'PlayerHasItemInItemBag':
    case 'WeekRaidPlayerHasItem':
      if (arg('item') !== undefined) {
        return arg('count') !== undefined
          ? t('story.objHasItemCount', { item: str('item'), count: str('count') })
          : t('story.objHasItem', { item: str('item') })
      }
      return fallbackFields(render)
    case 'CheckMoney':
      if (arg('item') !== undefined) {
        return t('story.objHasMoney', { item: str('item'), count: str('count') })
      }
      return fallbackFields(render)
    case 'CheckAdventureLevel':
      if (arg('level') !== undefined) return t('story.objAdventureLevel', { level: str('level') })
      return fallbackFields(render)
    case 'CheckWorldLevel':
    case 'CheckUnlockWorldLevel':
      if (arg('level') !== undefined) return t('story.objWorldLevel', { level: str('level') })
      return fallbackFields(render)
    case 'GameConditionServerPlaceHolder':
      if (arg('progress') !== undefined) return t('story.objProgress', { progress: str('progress') })
      return fallbackFields(render)
    default:
      return fallbackFields(render)
  }
}
