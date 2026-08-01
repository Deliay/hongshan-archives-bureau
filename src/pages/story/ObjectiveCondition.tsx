import { useMemo } from 'react'
import { useI18n } from '../../i18n'
import { resolveConditionArgs } from '../../lib/missionConditionNames'
import { renderConditionText } from '../../lib/missionConditionText'
import type { MissionConditionRender } from '../../lib/missionCondition'
import type { MissionConditionArgResolver } from '../../hooks/useData'

export function ObjectiveCondition({
  condition,
  resolveArg,
}: {
  condition: MissionConditionRender
  resolveArg?: MissionConditionArgResolver
}) {
  const { t } = useI18n()
  const text = useMemo(() => {
    const resolved = resolveArg ? resolveConditionArgs(condition, resolveArg) : condition
    return renderConditionText(resolved, (key, vars) => t(key, vars))
  }, [condition, resolveArg, t])
  if (!text) return null
  return <span className="text-archive-dust text-xs mt-0.5">{text}</span>
}
