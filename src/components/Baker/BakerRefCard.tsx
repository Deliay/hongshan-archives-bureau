import { Link } from 'react-router-dom'
import type { BakerCard } from '../../lib/types'
import { cn } from '../../lib/utils'

export function BakerRefCard({ card, className }: { card: BakerCard; className?: string }) {
  const label = card.kind === 'prts' ? 'PRTS' : '任务'
  return (
    <Link
      to={card.to}
      className={cn(
        'block w-full rounded-lg border border-archive-gold/30 bg-archive-ink/60 p-3 transition-colors hover:border-archive-gold/60 hover:bg-archive-ink',
        className,
      )}
    >
      <div className="text-archive-gold text-xs mb-1">{label}</div>
      <div className="text-sm text-archive-ivory line-clamp-2">{card.title}</div>
    </Link>
  )
}
