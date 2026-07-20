import { useEffect, useMemo, useState } from 'react'
import { useLoading } from './LoadingProvider'
import { useI18n } from '../../i18n'

const MIN_VISIBLE_MS = 400
const SLOW_THRESHOLD_MS = 3000

export function LoadingToast() {
  const { t } = useI18n()
  const { items, errors, retry } = useLoading()
  const [lastEmptyAt, setLastEmptyAt] = useState<number | null>(null)

  useEffect(() => {
    if (items.length === 0 && errors.length === 0 && lastEmptyAt === null) {
      setLastEmptyAt(Date.now())
    } else if ((items.length > 0 || errors.length > 0) && lastEmptyAt !== null) {
      setLastEmptyAt(null)
    }
  }, [items.length, errors.length, lastEmptyAt])

  const visible = useMemo(() => {
    if (items.length > 0 || errors.length > 0) return true
    if (lastEmptyAt == null) return false
    return Date.now() - lastEmptyAt < MIN_VISIBLE_MS
  }, [items.length, errors.length, lastEmptyAt])

  const isSlow = useMemo(() => {
    if (items.length === 0) return false
    const oldest = Math.min(...items.map(i => i.startedAt))
    return Date.now() - oldest > SLOW_THRESHOLD_MS
  }, [items])

  if (!visible) return null

  const latestDescription = items[items.length - 1]?.description ?? errors[errors.length - 1]?.description ?? ''

  return (
    <div className="fixed top-4 right-4 z-50 min-w-[15rem] max-w-[20rem]
                    rounded border border-archive-border bg-archive-ink/95 backdrop-blur-sm
                    shadow-lg shadow-black/20 p-3">
      {errors.length > 0 ? (
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 rounded-full bg-[#9E3A3A] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#9E3A3A]">{t('common.loadingFailed')}</div>
            <div className="text-xs text-archive-dust mt-1 truncate">{latestDescription}</div>
            <div className="text-xs text-archive-lead mt-1 line-clamp-2">{errors[errors.length - 1]?.message}</div>
            <button
              type="button"
              onClick={() => retry(errors[errors.length - 1].key)}
              className="mt-2 px-2.5 py-1 text-xs rounded border border-archive-border
                         text-archive-ivory hover:border-archive-gold/60 transition-colors"
            >
              {t('common.loadingRetry')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-archive-gold border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-archive-ivory">
              {items.length > 1
                ? t('common.loadingRequestCount', { count: items.length })
                : t('common.loadingArchive')}
            </div>
            {latestDescription && (
              <div className="text-xs text-archive-dust mt-1 truncate">{latestDescription}</div>
            )}
            {isSlow && (
              <div className="text-xs text-archive-gold mt-1">{t('common.loadingSlow')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
