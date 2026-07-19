import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded border border-archive-border bg-archive-file p-6',
        hover && 'transition-all duration-200 hover:border-archive-gold/40',
        className
      )}
    >
      {children}
    </div>
  )
}
