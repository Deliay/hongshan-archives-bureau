import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import RarityFrame from '../../components/RarityFrame'
import type { EnemySummary } from '../../lib/missionConditionNames'

export type EnemyTileSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<EnemyTileSize, string> = {
  sm: 'w-14',
  md: 'w-20',
  lg: 'w-28',
  xl: 'w-32',
}

const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }

export function EnemyUnit({
  enemy,
  level,
  size = 'md',
  className,
}: {
  enemy?: EnemySummary
  level?: number
  size?: EnemyTileSize
  className?: string
}) {
  const { t } = useI18n()
  if (!enemy) return null
  const stars = ENEMY_STARS[enemy.displayType] ?? 1
  const baseClass = `aspect-square ${SIZE_CLASSES[size]} overflow-hidden ${className ?? ''}`
  const tileContent = (
    <RarityFrame rarity={stars} name={enemy.name} size={size} className="w-full h-full">
      <img src={enemy.iconUrl} alt="" className="w-full h-full object-cover bg-archive-border"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      {level != null && (
        <span className="absolute top-0.5 right-0.5 rounded bg-archive-ink/80 px-0.5 text-[9px] font-mono text-archive-ivory">
          {t('story.enemyLv', { level })}
        </span>
      )}
    </RarityFrame>
  )
  return (
    <Link
      to={`/archive/enemies/${enemy.enemyId}`}
      className={`${baseClass} rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors`}
      title={enemy.nickname && enemy.nickname !== enemy.name ? `${enemy.name} · ${enemy.nickname}` : enemy.name}
    >
      {tileContent}
    </Link>
  )
}
