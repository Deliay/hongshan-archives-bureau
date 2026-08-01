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

export interface EnemySummary {
  enemyId: string
  name: string
  nickname: string
  templateId: string
  iconUrl: string
}

export interface DungeonEnemy {
  enemyId: string
  level?: number
  summary?: EnemySummary
}

export interface DungeonRewards {
  fixed: string[]
  firstPass: string[]
  custom: string[]
  extra: string[]
  hunter: string[]
}

export interface DungeonDetail {
  dungeonId: string
  name: string
  desc: string
  levelDesc: string
  featureDesc: string
  picUrl: string
  costStamina: number
  dungeonCategory: string
  sortId: number
  sceneId: string
  enemies: DungeonEnemy[]
  rewards: DungeonRewards
}

export interface ActivityStageDetail {
  stageId: string
  name: string
  activityId: string
  rewardId: string
  questId?: string
  levelId?: string
  conditions: ActivityStageCondition[]
  activityName: string
  stageName: string
  missionId: string
  sortId: number
  timeId: string
  unlockTexts: string[]
  relatedQuestText: string
  dungeonDetail: DungeonDetail | null
}

interface TableData {
  raw?: Record<string, any>
  i18n?: Record<string, string>
}

function resolveField(
  field: { id?: number | string; text?: string } | null | undefined,
  i18nMap?: Record<string, string>,
): string {
  if (!field) return ''
  const id = String(field.id ?? '')
  return i18nMap?.[id] || field.text || ''
}

function unwrapParamStrings(p: unknown): string[] {
  if (!p || typeof p !== 'object') return [String(p)]
  const obj = p as Record<string, unknown>
  const out: string[] = []
  for (const list of [obj.valueStringList, obj.valueIntList, obj.valueFloatList, obj.valueBoolList]) {
    if (Array.isArray(list)) out.push(...list.map(String))
  }
  return out
}

export function extractParamStrings(parameters: unknown[]): string[] {
  return (parameters ?? []).flatMap(unwrapParamStrings)
}

export function buildEnemySummary(
  enemyId: string,
  table: TableData | undefined,
  iconUrl: (templateId: string) => string,
): EnemySummary | undefined {
  const entry = table?.raw?.[enemyId]
  if (!entry) return undefined
  const templateId = entry.templateId || enemyId
  return {
    enemyId,
    name: resolveField(entry.name, table?.i18n) || enemyId,
    nickname: resolveField(entry.nickname, table?.i18n),
    templateId,
    iconUrl: iconUrl(templateId),
  }
}

export function buildDungeonDetail(
  dungeonId: string,
  tables: {
    dungeon: TableData
    enemy: TableData
  },
  iconUrl: (templateId: string) => string,
  picUrl: (path: string) => string,
): DungeonDetail | null {
  const entry = tables.dungeon.raw?.[dungeonId]
  if (!entry) return null
  const enemyIds = Array.isArray(entry.enemyIds) ? entry.enemyIds : []
  const enemyLevels = Array.isArray(entry.enemyLevels) ? entry.enemyLevels : []
  const enemies: DungeonEnemy[] = enemyIds
    .slice(0, enemyLevels.length)
    .map((id: string, i: number) => {
      const summary = buildEnemySummary(id, tables.enemy, iconUrl)
      return { enemyId: id, level: enemyLevels[i], summary }
    })
  return {
    dungeonId,
    name: resolveField(entry.dungeonName, tables.dungeon.i18n) || dungeonId,
    desc: resolveField(entry.dungeonDesc, tables.dungeon.i18n),
    levelDesc: resolveField(entry.dungeonLevelDesc, tables.dungeon.i18n),
    featureDesc: resolveField(entry.featureDesc, tables.dungeon.i18n),
    picUrl: entry.dungeonPicPath ? picUrl(entry.dungeonPicPath) : '',
    costStamina: entry.costStamina ?? 0,
    dungeonCategory: entry.dungeonCategory ?? '',
    sortId: entry.sortId ?? 0,
    sceneId: entry.sceneId ?? '',
    enemies,
    rewards: {
      fixed: entry.rewardId ? [entry.rewardId] : [],
      firstPass: entry.firstPassRewardId ? [entry.firstPassRewardId] : [],
      custom: entry.customRewardId ? [entry.customRewardId] : [],
      extra: entry.extraRewardId ? [entry.extraRewardId] : [],
      hunter: entry.hunterModeRewardId ? [entry.hunterModeRewardId] : [],
    },
  }
}

export interface StageDetailContext {
  stage: TableData
  complete: TableData
  dungStage: TableData
  multiStage: TableData
  condition: TableData
  activity: TableData
  dungeon: TableData
  enemy: TableData
  questDesc?: Map<string, string>
  iconUrl?: (templateId: string) => string
  picUrl?: (path: string) => string
}

export function buildStageDetail(stageId: string, ctx: StageDetailContext): ActivityStageDetail | null {
  const entry = ctx.stage.raw?.[stageId]
  if (!entry) return null
  const dung = ctx.dungStage.raw?.[stageId]
  const activityId = entry.activityId ?? ''
  const multiStage = ctx.multiStage.raw?.[activityId]?.stageList?.[stageId]
  const conditions: ActivityStageCondition[] = (ctx.complete.raw?.[stageId]?.conditionList ?? []).map((c: any) => ({
    conditionType: c.conditionType ?? 0,
    compareOperator: c.compareOperator ?? 0,
    progressToCompare: c.progressToCompare ?? 0,
    conditionId: c.conditionId ?? '',
    parameters: c.parameters ?? [],
  }))
  const stageName =
    resolveField(multiStage?.name, ctx.multiStage.i18n) ||
    resolveField(entry.desc, ctx.stage.i18n) ||
    stageId
  const unlockTexts: string[] = []
  for (const c of ctx.condition.raw?.[stageId]?.conditionList ?? []) {
    if (c.blockShow) continue
    const text = resolveField(c.desc, ctx.condition.i18n)
    if (text) unlockTexts.push(text)
  }
  const levelId = dung?.levelId
  const dungeonDetail =
    levelId && ctx.iconUrl && ctx.picUrl
      ? buildDungeonDetail(levelId, { dungeon: ctx.dungeon, enemy: ctx.enemy }, ctx.iconUrl, ctx.picUrl)
      : null
  const questId = dung?.questId
  const relatedQuestText = questId ? ctx.questDesc?.get(questId) ?? '' : ''
  return {
    stageId,
    name: stageName,
    activityId,
    rewardId: entry.rewardId ?? '',
    questId,
    levelId,
    conditions,
    activityName: resolveField(ctx.activity.raw?.[activityId]?.name, ctx.activity.i18n) || activityId,
    stageName,
    missionId: multiStage?.missionId ?? '',
    sortId: multiStage?.sortId ?? 0,
    timeId: multiStage?.timeId ?? '',
    unlockTexts,
    relatedQuestText,
    dungeonDetail,
  }
}
