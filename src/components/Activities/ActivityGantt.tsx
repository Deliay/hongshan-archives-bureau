import { useEffect, useMemo, useRef, useState } from 'react'
import type { Activity } from '../../lib/types'
import { ACTIVITY_GROUP_COLORS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { formatActivityDate, formatMonthLabel } from './timeFormat'

const ROW_HEIGHT = 48
const BAR_HEIGHT = 36
const DAY_MS = 86400000
const MONTH_MS = 30.4375 * DAY_MS
const PAD_MS = 15 * DAY_MS
const MIN_TICK_PX = 64
const MIN_WINDOW_MS = 3 * MONTH_MS
const SHOW_NAME_WIDTH = 96
const SHOW_DATE_WIDTH = 200
const LABEL_MIN_SPACE = 72

const STATUS_ORDER: Record<string, number> = {
  upcoming: 0,
  ongoing: 1,
  permanent: 2,
  expired: 3,
}

const TICK_STEPS = [1, 2, 3, 6, 12]

interface ActivityGanttProps {
  activities: Activity[]
  onSelect: (activity: Activity) => void
}

interface BarRect {
  left: number
  width: number
  permanent: boolean
  dateLabel: string | null
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

export default function ActivityGantt({ activities, onSelect }: ActivityGanttProps) {
  const { t, locale } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportWidth = useContainerWidth(scrollRef)
  const [scrollLeft, setScrollLeft] = useState(0)
  const now = useMemo(() => Date.now(), [])

  const rows = useMemo(() => {
    return [...activities].sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 4
      const sb = STATUS_ORDER[b.status] ?? 4
      if (sa !== sb) return sa - sb
      const oa = a.timeRanges[0]?.openTime ?? 0
      const ob = b.timeRanges[0]?.openTime ?? 0
      if (oa !== ob) return sa === STATUS_ORDER.permanent ? ob - oa : oa - ob
      return a.sortId - b.sortId
    })
  }, [activities])

  const { axisStart, axisEnd } = useMemo(() => {
    let min = Infinity
    let maxClose = -Infinity
    for (const a of activities) {
      for (const r of a.timeRanges) {
        if (r.openTime < min) min = r.openTime
        if (r.closeTime !== null && r.closeTime > maxClose) maxClose = r.closeTime
      }
    }
    if (!isFinite(min)) min = now
    const end = Math.max(now, isFinite(maxClose) ? maxClose : now)
    return { axisStart: min - PAD_MS, axisEnd: end + PAD_MS }
  }, [activities, now])

  const timelineViewport = Math.max(240, viewportWidth || 1024)
  const windowMs = Math.max(2 * (axisEnd - now), MIN_WINDOW_MS)
  const pxPerMs = timelineViewport / windowMs
  const timelineWidth = Math.max(timelineViewport, Math.round((axisEnd - axisStart) * pxPerMs))

  const months = useMemo(() => {
    const step = TICK_STEPS.find((s) => s * MONTH_MS * pxPerMs >= MIN_TICK_PX) ?? 12
    const result: { time: number; label: string }[] = []
    const start = new Date(axisStart)
    const y = start.getUTCFullYear()
    let m = start.getUTCMonth()
    let tick = Date.UTC(y, m, 1)
    if (tick < axisStart) {
      m += step
      tick = Date.UTC(y, m, 1)
    }
    while (tick <= axisEnd) {
      result.push({ time: tick, label: formatMonthLabel(tick, locale) })
      m += step
      tick = Date.UTC(y, m, 1)
    }
    return result
  }, [axisStart, axisEnd, locale, pxPerMs])

  const todayX = (now - axisStart) * pxPerMs

  useEffect(() => {
    const el = scrollRef.current
    if (!el || viewportWidth === 0) return
    el.scrollLeft = Math.max(0, todayX - viewportWidth / 2)
  }, [todayX, viewportWidth])

  const barRects = (a: (typeof rows)[number]): BarRect[] =>
    a.timeRanges.map((r) => {
      const end = Math.min(r.closeTime ?? axisEnd, axisEnd)
      const left = Math.max(0, (r.openTime - axisStart) * pxPerMs)
      const width = Math.max(3, (end - Math.max(r.openTime, axisStart)) * pxPerMs)
      const permanent = r.closeTime === null
      const dateLabel = permanent
        ? null
        : `${formatActivityDate(r.openTime)} ~ ${formatActivityDate(r.closeTime as number)}`
      return { left, width, permanent, dateLabel }
    })

  return (
    <div
      ref={scrollRef}
      className="min-w-0 overflow-x-auto rounded border border-archive-border bg-archive-file"
      data-testid="activity-gantt"
      onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
    >
      <div className="relative" style={{ width: timelineWidth }}>
        <div className="relative h-8 border-b border-archive-border">
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

        {rows.map((a) => {
          const rects = barRects(a)
          const color = ACTIVITY_GROUP_COLORS[a.group] ?? ACTIVITY_GROUP_COLORS.other
          const expired = a.status === 'expired'
          return (
            <div
              key={a.id}
              data-testid="activity-row"
              className="relative border-b border-archive-border/50 last:border-b-0 transition-colors hover:bg-[#17181F]"
              style={{ height: ROW_HEIGHT }}
            >
              {rects.map((rect, i) => (
                <button
                  key={i}
                  type="button"
                  data-testid={`gantt-bar-${a.id}`}
                  title={a.name}
                  onClick={() => onSelect(a)}
                  className={`absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-md border transition hover:brightness-125 ${expired ? 'opacity-40 saturate-50' : ''}`}
                  style={{
                    left: rect.left,
                    width: Math.max(10, rect.width),
                    height: BAR_HEIGHT,
                    borderColor: `${color}66`,
                    backgroundColor: `${color}26`,
                  }}
                >
                  {a.tabImg && (
                    <img
                      src={a.tabImg}
                      alt=""
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                      className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-70"
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: rect.permanent
                        ? 'linear-gradient(to right, rgba(19,20,26,0.35) 0%, rgba(19,20,26,0.25) 55%, rgba(19,20,26,0.85) 90%, #13141A 100%)'
                        : 'linear-gradient(to bottom, rgba(19,20,26,0.15) 0%, rgba(19,20,26,0.45) 100%)',
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
                </button>
              ))}
              {rects.map((rect, i) => {
                if (rect.width < LABEL_MIN_SPACE) return null
                const prev = i > 0 ? rects[i - 1] : null
                const overlapsPrev = prev !== null && rect.left < prev.left + prev.width + 8
                const showName = i === 0 && rect.width >= SHOW_NAME_WIDTH
                const showDate = !overlapsPrev && rect.dateLabel !== null && rect.width >= SHOW_DATE_WIDTH
                if (!showName && !showDate) return null
                const labelLeft = Math.min(
                  Math.max(rect.left + 8, scrollLeft + 8),
                  rect.left + rect.width - LABEL_MIN_SPACE,
                )
                return (
                  <div
                    key={`label-${i}`}
                    className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 overflow-hidden"
                    style={{ left: labelLeft, maxWidth: rect.left + rect.width - labelLeft - 6 }}
                  >
                    <span
                      className="whitespace-nowrap text-xs font-medium text-archive-ivory"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                    >
                      {showName && a.name}
                      {showName && showDate && '  '}
                      {showDate && (
                        <span className="font-mono text-[10px] font-normal text-archive-ivory/80">
                          {rect.dateLabel}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}

        {now >= axisStart && now <= axisEnd && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-[5]"
            style={{ left: todayX }}
            data-testid="gantt-today-line"
          >
            <div className="h-full w-px bg-archive-seal" />
            <span className="absolute top-0 left-1 rounded bg-archive-file/90 px-1 text-[10px] leading-4 text-archive-seal whitespace-nowrap">
              {t('activity.today')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
