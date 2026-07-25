import { useEffect, useMemo, useRef } from 'react'
import type { Activity } from '../../lib/types'
import { ACTIVITY_GROUP_COLORS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { formatMonthLabel } from './timeFormat'

const NAME_COL_WIDTH = 180
const ROW_HEIGHT = 36
const MONTH_PX = 120
const DAY_MS = 86400000
const MONTH_MS = 30.4375 * DAY_MS
const PAD_MS = 15 * DAY_MS

const STATUS_ORDER: Record<string, number> = {
  ongoing: 0,
  permanent: 1,
  upcoming: 2,
  expired: 3,
}

interface ActivityGanttProps {
  activities: Activity[]
  onSelect: (activity: Activity) => void
}

export default function ActivityGantt({ activities, onSelect }: ActivityGanttProps) {
  const { t, locale } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => Date.now(), [])

  const rows = useMemo(() => {
    return [...activities].sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 4
      const sb = STATUS_ORDER[b.status] ?? 4
      if (sa !== sb) return sa - sb
      const oa = a.timeRanges[0]?.openTime ?? 0
      const ob = b.timeRanges[0]?.openTime ?? 0
      if (oa !== ob) return oa - ob
      return a.sortId - b.sortId
    })
  }, [activities])

  const { axisStart, axisEnd } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const a of activities) {
      for (const r of a.timeRanges) {
        if (r.openTime < min) min = r.openTime
        const end = r.closeTime ?? now
        if (end > max) max = end
      }
    }
    if (!isFinite(min) || !isFinite(max)) {
      min = now
      max = now
    }
    return { axisStart: min - PAD_MS, axisEnd: max + PAD_MS }
  }, [activities, now])

  const pxPerMs = MONTH_PX / MONTH_MS
  const timelineWidth = Math.max(MONTH_PX, Math.round((axisEnd - axisStart) * pxPerMs))

  const months = useMemo(() => {
    const result: { time: number; label: string }[] = []
    const start = new Date(axisStart)
    const y = start.getUTCFullYear()
    let m = start.getUTCMonth()
    let tick = Date.UTC(y, m, 1)
    if (tick < axisStart) {
      m += 1
      tick = Date.UTC(y, m, 1)
    }
    while (tick <= axisEnd) {
      result.push({ time: tick, label: formatMonthLabel(tick, locale) })
      m += 1
      tick = Date.UTC(y, m, 1)
    }
    return result
  }, [axisStart, axisEnd, locale])

  const todayX = NAME_COL_WIDTH + (now - axisStart) * pxPerMs

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3)
  }, [todayX])

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto rounded border border-archive-border bg-archive-file"
      data-testid="activity-gantt"
    >
      <div className="relative" style={{ width: NAME_COL_WIDTH + timelineWidth }}>
        <div className="flex border-b border-archive-border">
          <div
            className="sticky left-0 z-10 shrink-0 bg-archive-file px-3 text-xs leading-8 text-archive-lead"
            style={{ width: NAME_COL_WIDTH }}
          >
            {t('activity.title')}
          </div>
          <div className="relative h-8 flex-1">
            {months.map((mo) => (
              <div
                key={mo.time}
                className="absolute top-0 bottom-0 border-l border-archive-border"
                style={{ left: (mo.time - axisStart) * pxPerMs }}
              >
                <span className="pl-1.5 text-[10px] leading-8 text-archive-dust whitespace-nowrap">{mo.label}</span>
              </div>
            ))}
          </div>
        </div>

        {rows.map((a) => (
          <div
            key={a.id}
            className="group flex border-b border-archive-border/50 last:border-b-0 transition-colors hover:bg-[#17181F]"
            style={{ height: ROW_HEIGHT }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 truncate bg-archive-file px-3 text-xs text-archive-ivory group-hover:bg-[#17181F]"
              style={{ width: NAME_COL_WIDTH, lineHeight: `${ROW_HEIGHT}px` }}
            >
              {a.name}
            </div>
            <div className="relative flex-1">
              {a.timeRanges.map((r, i) => {
                const end = Math.min(r.closeTime ?? axisEnd, axisEnd)
                const left = Math.max(0, (r.openTime - axisStart) * pxPerMs)
                const width = Math.max(3, (end - Math.max(r.openTime, axisStart)) * pxPerMs)
                const color = ACTIVITY_GROUP_COLORS[a.group] ?? ACTIVITY_GROUP_COLORS.other
                const permanent = r.closeTime === null
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`gantt-bar-${a.id}`}
                    title={a.name}
                    onClick={() => onSelect(a)}
                    className={`absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full transition-opacity hover:opacity-80 ${a.status === 'expired' ? 'opacity-40' : ''}`}
                    style={{
                      left,
                      width,
                      background: permanent
                        ? `linear-gradient(to right, ${color} 0%, ${color} 55%, transparent 100%)`
                        : color,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {now >= axisStart && now <= axisEnd && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-[5]"
            style={{ left: todayX }}
            data-testid="gantt-today-line"
          >
            <div className="h-full w-px bg-archive-seal" />
            <span className="absolute top-0 left-1 text-[10px] leading-4 text-archive-seal whitespace-nowrap">
              {t('activity.today')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
