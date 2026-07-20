import { useEffect, useState } from 'react'
import { useLoading } from './LoadingProvider'
import { retryLoading } from '../../lib/api'
import { useI18n } from '../../i18n'

const MIN_VISIBLE_MS = 400
const SLOW_THRESHOLD_MS = 3000

export function LoadingToast() {
  const { t } = useI18n()
  const { items, errors } = useLoading()
  const [hideToast, setHideToast] = useState(true)
  const [, setTick] = useState(0)

  const hasActive = items.length > 0 || errors.length > 0
  const needsTimer = hasActive

  useEffect(() => {
    if (!needsTimer) return
    const id = setInterval(() => setTick(t => t + 1), 250)
    return () => clearInterval(id)
  }, [needsTimer])

  useEffect(() => {
    if (hasActive) {
      setHideToast(false)
      return
    }
    const id = setTimeout(() => setHideToast(true), MIN_VISIBLE_MS)
    return () => clearTimeout(id)
  }, [hasActive])

  const visible = !hideToast

  const isSlow = items.length > 0 && Date.now() - Math.min(...items.map(i => i.startedAt)) > SLOW_THRESHOLD_MS

  if (!visible) return null

  const latestItem = items[items.length - 1] ?? errors[errors.length - 1]
  const latestDescription = latestItem
    ? latestItem.descriptionKey
      ? t(latestItem.descriptionKey, latestItem.descriptionVars)
      : latestItem.description
    : ''

  return (
    <div className="fixed top-4 right-4 z-50 min-w-[15rem] max-w-[20rem]
                    rounded border border-archive-border bg-archive-ink/95 backdrop-blur-sm
                    shadow-lg shadow-black/20 p-3">
      {errors.length > 0 ? (
        <div className="flex items-start gap-3" role="alert" aria-live="assertive">
          <div className="w-4 h-4 mt-0.5 rounded-full bg-archive-seal shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-archive-seal">{t('common.loadingFailed')}</div>
            <div className="text-xs text-archive-dust mt-1 truncate">{latestDescription}</div>
            <div className="text-xs text-archive-lead mt-1 line-clamp-2">{errors[errors.length - 1]?.message}</div>
            <button
              type="button"
              onClick={() => retryLoading(errors[errors.length - 1].key)}
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
