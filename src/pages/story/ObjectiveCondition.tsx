import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { resolveConditionArgs } from '../../lib/missionConditionNames'
import { renderConditionText } from '../../lib/missionConditionText'
import type { MissionConditionRender } from '../../lib/missionCondition'
import type { ActivityStageDetail } from '../../lib/missionConditionNames'
import type { MissionConditionArgResolver } from '../../hooks/useData'
import type { StoryRecapScene } from '../../lib/types'
import { ActivityStagePanel } from './ActivityStagePanel'
import { DialogScript } from './DialogScript'

export function ObjectiveCondition({
  condition,
  resolveArg,
  stageDetail,
  rewardTable,
  dialogScene,
}: {
  condition: MissionConditionRender
  resolveArg?: MissionConditionArgResolver
  stageDetail?: (stageId: string) => ActivityStageDetail | null
  rewardTable?: Record<string, any>
  dialogScene?: (dialogId: string) => StoryRecapScene | null
}) {
  const { t } = useI18n()
  const text = useMemo(() => {
    const resolved = resolveArg ? resolveConditionArgs(condition, resolveArg) : condition
    return renderConditionText(resolved, (key, vars) => t(key, vars))
  }, [condition, resolveArg, t])

  const dialogId = useMemo(
    () => condition.type === 'CheckTalkOptionFinish' && typeof condition.args?.dialog === 'string'
      ? condition.args.dialog
      : '',
    [condition],
  )

  const scene = useMemo(() => {
    return dialogId && dialogScene ? dialogScene(dialogId) : null
  }, [dialogId, dialogScene])

  const isStageCondition = condition.type === 'CheckActivityConditionalStageStatus'
  const rawStageId = isStageCondition && typeof condition.args?.stage === 'string' ? condition.args.stage : ''
  const detail = rawStageId && stageDetail ? stageDetail(rawStageId) : null
  if (detail) {
    return <ActivityStagePanel detail={detail} rewardTable={rewardTable ?? {}} />
  }
  if (!text && !scene) return null
  return (
    <span className="flex flex-col gap-1">
      {text && <span className="text-archive-dust text-xs">{text}</span>}
      {scene && <DialogSceneBlock scene={scene} dialogId={dialogId} />}
    </span>
  )
}

function DialogSceneBlock({ scene, dialogId }: { scene: StoryRecapScene; dialogId: string }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  return (
    <span data-testid="quest-recap-scene" className="flex flex-col gap-0.5 pl-2 border-l-2 border-archive-gold/30">
      <span className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-archive-gold">{scene.code}</span>
        {dialogId && <span className="font-mono text-[10px] text-archive-lead/70">{dialogId}</span>}
        {dialogId && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-archive-dust hover:text-archive-gold transition-colors"
          >
            {expanded ? t('story.collapseDialog') : t('story.expandDialog')}
          </button>
        )}
      </span>
      <span className="text-xs text-archive-ivory leading-relaxed">{scene.text}</span>
      {expanded && dialogId && (
        <span className="pt-1">
          <DialogScript dlgKey={dialogId} />
        </span>
      )}
    </span>
  )
}
