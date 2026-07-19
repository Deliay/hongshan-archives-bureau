import { cn } from '../../lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  hover?: boolean
}

export function Card({ children, className, hover = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded border border-archive-border bg-archive-file p-6',
        hover && 'transition-all duration-200 hover:border-archive-gold/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
