import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { RichText } from '../../lib/richText'
import RewardPanel from '../../components/Items/RewardPanel'
import { DungeonPanel } from './DungeonPanel'
import type { ActivityStageDetail } from '../../lib/missionConditionNames'

export function ActivityStagePanel({
  detail,
  rewardTable,
}: {
  detail: ActivityStageDetail
  rewardTable: Record<string, any>
}) {
  const { t } = useI18n()
  return (
    <div className="mt-1 p-3 rounded border border-archive-gold/20 bg-archive-file/40 space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-display text-sm font-bold text-archive-gold">{detail.stageName}</span>
        <span className="text-[10px] font-mono text-archive-lead">{detail.stageId}</span>
        {detail.activityName && (
          <span className="text-[11px] text-archive-ivory">{detail.activityName}</span>
        )}
      </div>
      {detail.missionId && (
        <p className="text-[11px] text-archive-lead">
          <Link to={`/archive/story/mission/${detail.missionId}`} className="hover:text-archive-gold transition-colors font-mono">
            {t('story.stageMission', { mission: detail.missionId })}
          </Link>
        </p>
      )}
      {detail.unlockTexts.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.stageUnlock')}</div>
          <ul className="list-none space-y-0.5">
            {detail.unlockTexts.map((text) => (
              <li key={text} className="text-xs text-archive-ivory leading-relaxed"><RichText text={text} /></li>
            ))}
          </ul>
        </div>
      )}
      {detail.relatedQuestText && (
        <p className="text-xs text-archive-dust leading-relaxed">{t('story.stageRelatedQuest')}{detail.relatedQuestText}</p>
      )}
      {detail.rewardId && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.stageRewards')}</div>
          <RewardPanel rewardIds={[detail.rewardId]} rewardTable={rewardTable} />
        </div>
      )}
      {detail.dungeonDetail && <DungeonPanel detail={detail.dungeonDetail} rewardTable={rewardTable} />}
    </div>
  )
}
