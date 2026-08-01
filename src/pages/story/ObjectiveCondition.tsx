import { useMemo } from 'react'
import { useI18n } from '../../i18n'
import { resolveConditionArgs } from '../../lib/missionConditionNames'
import { renderConditionText } from '../../lib/missionConditionText'
import type { MissionConditionRender } from '../../lib/missionCondition'
import type { ActivityStageDetail } from '../../lib/missionConditionNames'
import type { MissionConditionArgResolver } from '../../hooks/useData'
import { ActivityStagePanel } from './ActivityStagePanel'

export function ObjectiveCondition({
  condition,
  resolveArg,
  stageDetail,
  rewardTable,
}: {
  condition: MissionConditionRender
  resolveArg?: MissionConditionArgResolver
  stageDetail?: (stageId: string) => ActivityStageDetail | null
  rewardTable?: Record<string, any>
}) {
  const { t } = useI18n()
  const text = useMemo(() => {
    const resolved = resolveArg ? resolveConditionArgs(condition, resolveArg) : condition
    return renderConditionText(resolved, (key, vars) => t(key, vars))
  }, [condition, resolveArg, t])

  const isStageCondition = condition.type === 'CheckActivityConditionalStageStatus'
  const rawStageId = isStageCondition && typeof condition.args?.stage === 'string' ? condition.args.stage : ''
  const detail = rawStageId && stageDetail ? stageDetail(rawStageId) : null
  if (detail) {
    return <ActivityStagePanel detail={detail} rewardTable={rewardTable ?? {}} />
  }
  if (!text) return null
  return <span className="text-archive-dust text-xs mt-0.5">{text}</span>
}
