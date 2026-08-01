export interface MissionConditionContext {
  resolveText?: (key: string) => string
}

export interface MissionConditionField {
  name: string
  value: string | number | boolean | null
}

export interface MissionConditionRender {
  type: string
  args?: Record<string, string | number>
  fields: MissionConditionField[]
  children?: MissionConditionRender[]
  combinedText?: string
}

type ConditionFormatter = (
  condition: Record<string, unknown>,
  ctx: MissionConditionContext,
) => MissionConditionRender | null

const METADATA_KEYS = new Set(['$type', 'uniqueId', 'useCurrentScope', 'scopeMask', 'useGraphScope'])
const RESERVED_KEYS = new Set(['subConditions', 'conditionEvalString'])

const formatters = new Map<string, ConditionFormatter>()

export function registerMissionConditionFormatter(type: string, formatter: ConditionFormatter): void {
  formatters.set(type, formatter)
}

export function shortConditionType(condition: unknown): string {
  const $type = (condition as Record<string, unknown> | null)?.['$type']
  if (typeof $type === 'string') {
    const short = $type.split(',')[0].split('.').pop()
    return short && short.length > 0 ? short : $type
  }
  return 'Unknown'
}

export function unwrapConstValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return value as string | number | boolean
  const obj = value as Record<string, unknown>
  if ('constValue' in obj) return unwrapConstValue(obj.constValue)
  const entries = Object.entries(obj)
  if (entries.length === 1) return `${entries[0][0]}=${unwrapConstValue(entries[0][1])}`
  if (entries.length === 0) return null
  return JSON.stringify(obj)
}

export function normalizeConditionValue(value: unknown): string | number | boolean | null {
  if (Array.isArray(value)) {
    const items = value.map(unwrapConstValue)
    return items.length > 0 ? items.join(', ') : null
  }
  return unwrapConstValue(value)
}

export function extractConditionFields(condition: Record<string, unknown>): MissionConditionField[] {
  const fields: MissionConditionField[] = []
  for (const [key, value] of Object.entries(condition)) {
    if (METADATA_KEYS.has(key) || RESERVED_KEYS.has(key)) continue
    const normalized = normalizeConditionValue(value)
    if (normalized === null) continue
    fields.push({ name: key, value: normalized })
  }
  return fields
}

export function conditionField(
  condition: Record<string, unknown>,
  name: string,
): string | number | boolean | null {
  if (!(name in condition)) return null
  return normalizeConditionValue(condition[name])
}

function argFormatter(type: string, argMap: Record<string, string>): ConditionFormatter {
  return (condition) => {
    const args: Record<string, string | number> = {}
    for (const [rawName, argName] of Object.entries(argMap)) {
      const value = conditionField(condition, rawName)
      if (typeof value === 'string' && value !== '') args[argName] = value
      else if (typeof value === 'number') args[argName] = value
    }
    return { type, args, fields: extractConditionFields(condition) }
  }
}

function registerArgFormatter(type: string, argMap: Record<string, string>): void {
  registerMissionConditionFormatter(type, argFormatter(type, argMap))
}

registerArgFormatter('ReachDestination', { _mapId: 'map', _areaId: 'area' })
registerArgFormatter('CheckTalkOptionFinish', { _dialogId: 'dialog' })
registerArgFormatter('CheckQuestState', { _questId: 'quest' })
registerArgFormatter('CheckMissionState', { _missionId: 'mission' })
registerArgFormatter('CheckActivityConditionalStageStatus', { _activityStageId: 'stage' })
registerArgFormatter('PlayerHasItem', { _itemId: 'item', _progressToCompare: 'count' })
registerArgFormatter('PlayerHasItemInItemBag', { _itemId: 'item', _progressToCompare: 'count' })
registerArgFormatter('WeekRaidPlayerHasItem', { _itemId: 'item' })
registerArgFormatter('CheckMoney', { _moneyId: 'item', _progressToCompare: 'count' })
registerArgFormatter('CheckAdventureLevel', { _progressToCompare: 'level' })
registerArgFormatter('CheckWorldLevel', { _progressToCompare: 'level' })
registerArgFormatter('CheckUnlockWorldLevel', { _progressToCompare: 'level' })
registerArgFormatter('GameConditionServerPlaceHolder', { _progressToCompare: 'progress' })

export function renderMissionCondition(
  condition: unknown,
  ctx: MissionConditionContext = {},
): MissionConditionRender | null {
  if (!condition || typeof condition !== 'object') return null
  const cond = condition as Record<string, unknown>
  const type = shortConditionType(cond)
  if (type === 'CombineCondition') {
    const children = (Array.isArray(cond.subConditions) ? cond.subConditions : [])
      .map((sub) => renderMissionCondition(sub, ctx))
      .filter((r): r is MissionConditionRender => r !== null)
    return {
      type,
      fields: [],
      combinedText: typeof cond.conditionEvalString === 'string' ? cond.conditionEvalString : '',
      children,
    }
  }
  const formatter = formatters.get(type)
  if (formatter) {
    const rendered = formatter(cond, ctx)
    if (rendered) return rendered
  }
  return { type, fields: extractConditionFields(cond) }
}
