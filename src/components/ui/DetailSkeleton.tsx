import { Skeleton } from './Skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up" data-testid="skeleton">
      <div className="flex items-start gap-4">
        <Skeleton className="w-20 h-20 rounded shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
