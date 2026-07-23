import { Link } from 'react-router-dom'
import RarityFrame from '../RarityFrame'

interface OperatorPortraitCardProps {
  id: string
  name: string
  portrait: string
  rarity: number
  professionIcon?: string
  elementIcon?: string
  elementColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: { card: 'w-[76px] h-[106px]', badge: 'w-4 h-4', frameSize: 'sm' as const },
  md: { card: 'w-[114px] h-[159px]', badge: 'w-5 h-5', frameSize: 'md' as const },
  lg: { card: 'w-[152px] h-[212px]', badge: 'w-6 h-6', frameSize: 'lg' as const },
}

export default function OperatorPortraitCard({
  id,
  name,
  portrait,
  rarity,
  professionIcon,
  elementIcon,
  elementColor,
  size = 'md',
  className = '',
}: OperatorPortraitCardProps) {
  const s = SIZE_MAP[size]

  return (
    <Link
      to={`/archive/operators/${id}`}
      className={`block ${s.card} rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-all duration-200 overflow-hidden shrink-0 ${className}`}
    >
      <RarityFrame rarity={rarity} name={name} size={s.frameSize} className="relative w-full h-full">
        {portrait ? (
          <img src={portrait} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-archive-ink text-archive-lead text-lg">
            ?
          </div>
        )}
        {professionIcon && (
          <img
            src={professionIcon}
            alt=""
            className={`absolute top-1 left-1 ${s.badge} object-contain bg-archive-ink/60 rounded-sm p-0.5`}
          />
        )}
        {elementIcon && (
          <img
            src={elementIcon}
            alt=""
            className={`absolute top-1 right-1 ${s.badge} object-contain`}
            style={elementColor ? { filter: `drop-shadow(0 0 2px ${elementColor})` } : undefined}
          />
        )}
      </RarityFrame>
    </Link>
  )
}
