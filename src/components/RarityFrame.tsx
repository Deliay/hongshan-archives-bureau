import { rarityColor } from '../data/constants'

type TileSize = 'sm' | 'md' | 'lg' | 'xl'

const TEXT_CLASSES: Record<TileSize, string> = {
  sm: 'text-[6px]',
  md: 'text-[9px]',
  lg: 'text-[11px]',
  xl: 'text-xs',
}

interface RarityFrameProps {
  rarity: number
  name?: string
  children: React.ReactNode
  size?: TileSize
  className?: string
}

export default function RarityFrame({ rarity, name, children, size = 'md', className }: RarityFrameProps) {
  const color = rarityColor(rarity)
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {children}
      {name && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: `linear-gradient(to top, ${color}59, transparent)` }}
          />
          <span className={`absolute inset-x-0 bottom-0.5 px-0.5 text-center leading-tight text-archive-ivory line-clamp-2 ${TEXT_CLASSES[size]}`}>
            {name}
          </span>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: color }} />
    </div>
  )
}
