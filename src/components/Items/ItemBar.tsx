import { Link } from 'react-router-dom'
import ItemTile from './ItemTile'
import type { ItemTileSize } from './ItemTile'
import type { ReactNode } from 'react'

interface ItemBarProps {
  itemId: string
  href: string
  size?: ItemTileSize
  badge?: ReactNode
  children: ReactNode
}

export default function ItemBar({ itemId, href, size = 'lg', badge, children }: ItemBarProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors"
    >
      <ItemTile
        itemId={itemId}
        size={size}
        badge={badge}
        showTips={false}
        plain
        className="border-0 bg-transparent p-0 shrink-0"
      />
      <div className="flex-1 min-w-0">{children}</div>
    </Link>
  )
}
