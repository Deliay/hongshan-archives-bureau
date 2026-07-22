import { Link } from 'react-router-dom'
import type { SearchEntity } from '../../lib/types'
import { ASSET_BASE } from '../../lib/adapter'
import { Skeleton } from '../ui/Skeleton'
import Rarity from '../Rarity'
import ItemTile from '../Items/ItemTile'

function getEnemyIconUrl(templateId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/${templateId}.png`
}

function getCharPortraitUrl(charId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`
}

function ReferenceCardSkeleton() {
  return <Skeleton className="w-36 h-24 rounded" />
}

interface ReferenceCardProps {
  entity: SearchEntity
}

function WeaponReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <ItemTile
      itemId={entity.id}
      name={entity.name}
      rarity={entity.rarity ?? 1}
      showTips={false}
      showName
      href={entity.route}
      size="md"
    />
  )
}

function OperatorReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <Link
      to={entity.route}
      className="flex items-center gap-2 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors min-w-0"
    >
      <img
        src={getCharPortraitUrl(entity.id)}
        alt=""
        className="w-10 h-10 object-cover rounded bg-archive-border shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-archive-ivory truncate">{entity.name}</div>
        {entity.rarity !== undefined && <Rarity level={entity.rarity} />}
      </div>
    </Link>
  )
}

function ItemReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <ItemTile
      itemId={entity.id}
      name={entity.name}
      rarity={entity.rarity ?? 1}
      showTips
      showName
      size="md"
    />
  )
}

function EnemyReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <Link
      to={entity.route}
      className="flex items-center gap-2 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors min-w-0"
    >
      <img
        src={getEnemyIconUrl(entity.id)}
        alt=""
        className="w-10 h-10 object-cover rounded bg-archive-border shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-archive-ivory truncate">{entity.name}</div>
        {entity.tags && entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {entity.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] text-archive-lead bg-archive-border/30 px-1 rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export function EntityReferenceCard({ entity, loading }: { entity?: SearchEntity; loading?: boolean }) {
  if (loading) return <ReferenceCardSkeleton />
  if (!entity) return null

  switch (entity.type) {
    case 'weapon':
      return <WeaponReferenceCard entity={entity} />
    case 'operator':
      return <OperatorReferenceCard entity={entity} />
    case 'item':
      return <ItemReferenceCard entity={entity} />
    case 'enemy':
      return <EnemyReferenceCard entity={entity} />
    default:
      return null
  }
}
