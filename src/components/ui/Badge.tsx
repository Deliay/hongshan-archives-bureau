import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'gold' | 'seal' | 'bronze' | 'ghost'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-archive-border text-archive-dust',
  gold: 'bg-archive-gold/10 text-archive-gold border border-archive-gold/30',
  seal: 'bg-archive-seal/10 text-archive-seal border border-archive-seal/30',
  bronze: 'bg-archive-bronze/10 text-archive-bronze border border-archive-bronze/30',
  ghost: 'bg-transparent text-archive-lead',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
