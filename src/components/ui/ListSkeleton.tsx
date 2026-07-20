import { Skeleton } from './Skeleton'

interface ListSkeletonProps {
  filters?: number
  cards?: number
}

export function ListSkeleton({ filters = 3, cards = 8 }: ListSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in-up" data-testid="skeleton">
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: filters }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  )
}
