import { useEffect, useRef, useState } from 'react'
import type { Activity } from '../../lib/types'
import { ACTIVITY_GROUP_COLORS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { RichText } from '../../lib/richText'
import { Badge } from '../ui/Badge'
import { formatActivityTime } from './timeFormat'
import { ACTIVITY_GROUP_LABEL_KEYS, ACTIVITY_STATUS_LABEL_KEYS } from './activityMeta'

type StatusBadgeVariant = 'gold' | 'bronze' | 'default' | 'ghost'

const STATUS_BADGE_VARIANTS: Record<string, StatusBadgeVariant> = {
  ongoing: 'gold',
  permanent: 'bronze',
  upcoming: 'default',
  expired: 'ghost',
}

interface ActivityTooltipProps {
  activity: Activity
  onClose: () => void
}

export default function ActivityTooltip({ activity, onClose }: ActivityTooltipProps) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const groupColor = ACTIVITY_GROUP_COLORS[activity.group] ?? ACTIVITY_GROUP_COLORS.other
  const statusKey = activity.status === 'unknown' ? null : activity.status
  const statusLabel = statusKey ? t(ACTIVITY_STATUS_LABEL_KEYS[statusKey]) : t('activity.unknownTime')
  const statusVariant: StatusBadgeVariant = statusKey ? (STATUS_BADGE_VARIANTS[statusKey] ?? 'default') : 'ghost'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto rounded border border-archive-border bg-archive-file shadow-2xl"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="sticky top-0 bg-archive-file border-b border-archive-border px-4 py-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-archive-ivory truncate">{activity.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-archive-lead hover:text-archive-ivory transition-colors text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {activity.tabImg && !imgFailed && (
            <img
              src={activity.tabImg}
              alt={activity.name}
              className="w-full rounded border border-archive-border object-cover"
              onError={() => setImgFailed(true)}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border"
              style={{
                color: groupColor,
                borderColor: `${groupColor}55`,
                backgroundColor: `${groupColor}1a`,
              }}
            >
              {t(ACTIVITY_GROUP_LABEL_KEYS[activity.group])}
            </Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          <div>
            <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('activity.detailTime')}</div>
            {activity.timeRanges.length === 0 ? (
              <p className="text-xs text-archive-lead">{t('activity.unknownTime')}</p>
            ) : (
              <ul className="space-y-1">
                {activity.timeRanges.map((r, i) => (
                  <li key={i} className="text-xs text-archive-ivory font-mono">
                    {formatActivityTime(r.openTime)}
                    {' ~ '}
                    {r.closeTime === null ? t('activity.permanent') : formatActivityTime(r.closeTime)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {activity.desc && (
            <div className="text-xs text-archive-ivory leading-relaxed">
              <RichText text={activity.desc} />
            </div>
          )}

          {activity.tags.length > 0 && (
            <div>
              <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('activity.detailTags')}</div>
              <div className="flex flex-wrap gap-1.5">
                {activity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded border border-archive-border px-2 py-0.5 text-[11px] text-archive-dust"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-archive-lead font-mono pt-1 border-t border-archive-border">
            {activity.id}
          </div>
        </div>
      </div>
    </div>
  )
}
