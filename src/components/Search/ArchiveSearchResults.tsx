import { useEffect, useRef } from 'react'
import type { SearchResult, SearchEntity } from '../../lib/types'
import { escapeRegex } from '../../lib/search'
import { RichText } from '../../lib/richText'
import { EntityReferenceCard } from './EntityCards'
import SkillReferenceCard from '../skills/SkillReferenceCard'
import { Skeleton } from '../ui/Skeleton'
import { useI18n } from '../../i18n'

const HIGHLIGHT_COLOR = '#B89A6A'

function highlightText(text: string, term: string): string {
  if (!term) return text
  const escaped = escapeRegex(term)
  return text.replace(new RegExp(`(${escaped})`, 'gi'), `<mark=${HIGHLIGHT_COLOR}>$1</mark>`)
}

const LOADING_ROWS = 5
const MAX_VISIBLE_PAGES = 7

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, i) => i)
  }
  const pages: (number | 'ellipsis')[] = []
  const half = Math.floor(MAX_VISIBLE_PAGES / 2)
  let start = Math.max(0, current - half)
  let end = Math.min(total - 1, current + half)
  if (current - half <= 0) {
    end = MAX_VISIBLE_PAGES - 1
  }
  if (current + half >= total - 1) {
    start = total - MAX_VISIBLE_PAGES
  }
  if (start > 0) {
    pages.push(0, 'ellipsis')
  }
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  if (end < total - 1) {
    pages.push('ellipsis', total - 1)
  }
  return pages
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: LOADING_ROWS }).map((_, i) => (
        <div key={`skel-${i}`} className="rounded border border-archive-border bg-archive-file p-3">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

interface ArchiveSearchResultsProps {
  query: string
  results: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  emptyMessage?: string
  onPageChange: (page: number) => void
}

export default function ArchiveSearchResults({
  query,
  results,
  entities,
  total,
  page,
  pageSize,
  loading,
  error,
  emptyMessage,
  onPageChange,
}: ArchiveSearchResultsProps) {
  const { t } = useI18n()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const initialPageRef = useRef(true)

  useEffect(() => {
    if (initialPageRef.current) {
      initialPageRef.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="text-red-400 text-sm p-4 rounded border border-red-400/20 bg-red-400/5">
        {error}
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="text-archive-dust text-sm p-4 text-center">
        {emptyMessage || t('search.noResults')}
      </div>
    )
  }

  return (
    <div>
      <div className="text-xs text-archive-lead mb-3">
        {t('search.resultCount', { count: total })}
      </div>

      <div className="flex flex-col gap-3">
        {results.map((r, i) => {
          const entity = r.entityKey ? entities[r.table]?.[r.entityKey] : undefined
          const ownerEntity = r.ownerEntity
          return (
            <div key={`${r.id}-${i}`} className="rounded border border-archive-border bg-archive-file p-3">
              <div className="text-[10px] text-archive-lead mb-1">{r.table}</div>
              <div className="text-sm text-archive-ivory leading-relaxed mb-2">
                <RichText text={highlightText(r.text, query)} />
              </div>
              {r.table === 'SkillPatchTable' && r.entityKey && (
                <SkillReferenceCard skillId={r.entityKey} showLevelSlider defaultLevel={9} className="mb-2" />
              )}
              {(entity || ownerEntity) && <EntityReferenceCard entity={ownerEntity ?? entity} />}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 text-xs rounded border border-archive-border text-archive-dust hover:text-archive-gold hover:border-archive-gold/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('search.prev')}
          </button>
          {(() => {
            let ellipsisCount = 0
            return getPageRange(page, totalPages).map((item) => {
              if (item === 'ellipsis') {
                ellipsisCount++
                return <span key={`ellipsis-${ellipsisCount}`} className="px-1 text-archive-lead text-xs">…</span>
              }
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    item === page
                      ? 'text-archive-gold bg-archive-gold/10 border border-archive-gold/30'
                      : 'text-archive-dust border border-transparent hover:text-archive-ivory'
                  }`}
                >
                  {item + 1}
                </button>
              )
            })
          })()}
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 text-xs rounded border border-archive-border text-archive-dust hover:text-archive-gold hover:border-archive-gold/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('search.next')}
          </button>
        </div>
      )}
    </div>
  )
}
