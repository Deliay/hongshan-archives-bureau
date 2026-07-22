import { rarityColor } from '../data/constants'

interface RarityFrameProps {
  rarity: number
  name?: string
  children: React.ReactNode
  className?: string
}

export default function RarityFrame({ rarity, name, children, className }: RarityFrameProps) {
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
          <span className="absolute inset-x-0 bottom-0.5 px-0.5 text-center text-[10px] leading-tight text-archive-ivory line-clamp-2">
            {name}
          </span>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: color }} />
    </div>
  )
}
