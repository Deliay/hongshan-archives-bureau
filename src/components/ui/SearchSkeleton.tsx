import { Skeleton } from './Skeleton'

export function SearchSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up" data-testid="skeleton">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-12 h-12 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
