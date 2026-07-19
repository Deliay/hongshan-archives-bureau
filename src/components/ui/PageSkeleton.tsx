import { Skeleton } from './Skeleton'

interface PageSkeletonProps {
  lines?: number
}

export function PageSkeleton({ lines = 6 }: PageSkeletonProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
