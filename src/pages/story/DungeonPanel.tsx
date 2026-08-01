import { useI18n } from '../../i18n'
import { RichText } from '../../lib/richText'
import RewardPanel from '../../components/Items/RewardPanel'
import { EnemyUnit } from './EnemyUnit'
import type { DungeonDetail } from '../../lib/missionConditionNames'

export function DungeonPanel({
  detail,
  rewardTable,
}: {
  detail: DungeonDetail
  rewardTable: Record<string, any>
}) {
  const { t } = useI18n()
  const rewards = detail.rewards
  return (
    <div className="mt-3 p-3 rounded border border-archive-border/60 bg-archive-file/40 space-y-2">
      <div className="flex items-start gap-3">
        {detail.picUrl && (
          <img src={detail.picUrl} alt="" className="w-20 h-20 object-cover rounded border border-archive-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-sm font-bold text-archive-ivory">{detail.name}</span>
            <span className="text-[10px] font-mono text-archive-lead">{detail.dungeonId}</span>
          </div>
          {detail.levelDesc && <p className="text-[11px] text-archive-dust mt-0.5">{detail.levelDesc}</p>}
          {detail.dungeonCategory && (
            <p className="text-[11px] text-archive-lead font-mono mt-0.5">{detail.dungeonCategory}</p>
          )}
          {(detail.costStamina > 0 || detail.sortId > 0) && (
            <p className="text-[11px] text-archive-lead font-mono mt-0.5">
              {detail.sortId > 0 && `${t('story.dungeonSort')} ${detail.sortId}`}
              {detail.sortId > 0 && detail.costStamina > 0 && ' · '}
              {detail.costStamina > 0 && `${t('story.dungeonStamina')} ${detail.costStamina}`}
            </p>
          )}
        </div>
      </div>

      {detail.desc && (
        <p className="text-xs text-archive-ivory leading-relaxed"><RichText text={detail.desc} /></p>
      )}
      {detail.featureDesc && (
        <p className="text-xs text-archive-bronze leading-relaxed"><RichText text={detail.featureDesc} /></p>
      )}

      {detail.enemies.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.dungeonEnemies')}</div>
          <div className="flex flex-wrap gap-2">
            {detail.enemies.map((e) => (
              <EnemyUnit key={e.enemyId} enemy={e.summary} level={e.level} />
            ))}
          </div>
        </div>
      )}

      {rewards.fixed.length > 0 && <RewardPanel rewardIds={rewards.fixed} rewardTable={rewardTable} />}
      {rewards.firstPass.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.dungeonFirstPass')}</div>
          <RewardPanel rewardIds={rewards.firstPass} rewardTable={rewardTable} />
        </div>
      )}
      {rewards.custom.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.dungeonCustom')}</div>
          <RewardPanel rewardIds={rewards.custom} rewardTable={rewardTable} />
        </div>
      )}
      {rewards.extra.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.dungeonExtra')}</div>
          <RewardPanel rewardIds={rewards.extra} rewardTable={rewardTable} />
        </div>
      )}
      {rewards.hunter.length > 0 && (
        <div>
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('story.dungeonHunter')}</div>
          <RewardPanel rewardIds={rewards.hunter} rewardTable={rewardTable} />
        </div>
      )}
    </div>
  )
}
