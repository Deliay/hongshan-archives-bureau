import { useI18n } from '../../i18n'
import type { EnemySummary } from '../../lib/missionConditionNames'

export function EnemyUnit({
  enemy,
  level,
}: {
  enemy?: EnemySummary
  level?: number
}) {
  const { t } = useI18n()
  if (!enemy) return null
  return (
    <div className="flex flex-col items-center gap-1 w-20">
      <div className="w-12 h-12 overflow-hidden rounded border border-archive-border bg-archive-file">
        <img src={enemy.iconUrl} alt="" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
      <span className="text-[11px] leading-tight text-archive-ivory text-center line-clamp-2" title={enemy.name}>
        {enemy.name}
      </span>
      {level != null && (
        <span className="text-[10px] text-archive-dust font-mono">{t('story.enemyLv', { level })}</span>
      )}
    </div>
  )
}
