import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { SearchEntity } from '../../lib/types'
import { ASSET_BASE } from '../../lib/adapter'
import { Skeleton } from '../ui/Skeleton'
import Rarity from '../Rarity'
import RarityFrame from '../RarityFrame'
import ItemIcon from '../Items/ItemIcon'

const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }

function getEnemyIconUrl(templateId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericon/${templateId}.png`
}

function getCharPortraitUrl(charId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`
}

function ReferenceCardSkeleton() {
  return <Skeleton className="w-36 h-24 rounded" />
}

function ReferenceBar({ href, left, children }: { href: string; left: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors min-w-0"
    >
      <div className="shrink-0">{left}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </Link>
  )
}

interface ReferenceCardProps {
  entity: SearchEntity
}

function IconBar({ id, href, name, rarity, children }: { id: string; href: string; name: string; rarity: number; children?: ReactNode }) {
  return (
    <ReferenceBar
      href={href}
      left={
        <div className="w-10 h-10 overflow-hidden rounded">
          <RarityFrame rarity={rarity} size="sm" className="w-full h-full">
            <ItemIcon itemId={id} className="w-full h-full" />
          </RarityFrame>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-xs text-archive-ivory">{name}</span>
        <Rarity level={rarity} />
        {children}
      </div>
    </ReferenceBar>
  )
}

function WeaponReferenceCard({ entity }: ReferenceCardProps) {
  return <IconBar id={entity.id} href={entity.route} name={entity.name} rarity={entity.rarity ?? 0} />
}

function OperatorReferenceCard({ entity }: ReferenceCardProps) {
  const portrait = entity.portrait ?? getCharPortraitUrl(entity.id)
  return (
    <ReferenceBar
      href={entity.route}
      left={
        <div className="w-10 h-10 overflow-hidden rounded">
          <RarityFrame rarity={entity.rarity ?? 0} size="sm" className="w-full h-full">
            <img
              src={portrait}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </RarityFrame>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-xs text-archive-ivory">{entity.name}</span>
        {entity.rarity !== undefined && <Rarity level={entity.rarity} />}
      </div>
    </ReferenceBar>
  )
}

function ItemReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <ReferenceBar
      href={entity.route}
      left={
        <div className="w-10 h-10 overflow-hidden rounded">
          <RarityFrame rarity={entity.rarity ?? 0} size="sm" className="w-full h-full">
            <ItemIcon itemId={entity.id} className="w-full h-full" />
          </RarityFrame>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-xs text-archive-ivory">{entity.name}</span>
        <Rarity level={entity.rarity ?? 0} />
        {entity.subInfo && (
          <span className="text-[9px] text-archive-dust">{entity.subInfo}</span>
        )}
      </div>
    </ReferenceBar>
  )
}

function EnemyReferenceCard({ entity }: ReferenceCardProps) {
  const stars = ENEMY_STARS[entity.displayType ?? 0] ?? 1
  return (
    <ReferenceBar
      href={entity.route}
      left={
        <img
          src={getEnemyIconUrl(entity.id)}
          alt=""
          className="w-12 h-12 object-cover bg-archive-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-xs text-archive-ivory">{entity.name}</span>
        <Rarity level={stars} />
        {entity.tags && entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entity.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-archive-border text-archive-dust">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </ReferenceBar>
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
