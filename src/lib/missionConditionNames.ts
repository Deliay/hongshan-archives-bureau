import type { MissionConditionRender } from './missionCondition'

export type ConditionArgValue = string | number

export function resolveConditionArgs(
  render: MissionConditionRender,
  resolveArg: (argName: string, raw: ConditionArgValue) => ConditionArgValue | undefined,
): MissionConditionRender {
  const args: Record<string, ConditionArgValue> = {}
  if (render.args) {
    for (const [name, raw] of Object.entries(render.args)) {
      const resolved = resolveArg(name, raw)
      args[name] = resolved ?? raw
    }
  }
  return {
    ...render,
    args,
    children: render.children?.map((child) => resolveConditionArgs(child, resolveArg)),
  }
}

export interface ActivityStageCondition {
  conditionType: number
  compareOperator: number
  progressToCompare: number
  conditionId: string
  parameters: unknown[]
}

export interface ActivityStageDetail {
  stageId: string
  name: string
  activityId: string
  rewardId: string
  questId?: string
  levelId?: string
  conditions: ActivityStageCondition[]
}
