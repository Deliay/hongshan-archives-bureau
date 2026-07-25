import { useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, ActivityTimeRange } from '../../lib/types'
import { ACTIVITY_GROUP_COLORS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { formatMonthLabel } from './timeFormat'

const NAME_COL_WIDTH = 140
const ROW_HEIGHT = 52
const BAR_HEIGHT = 34
const DAY_MS = 86400000
const MONTH_MS = 30.4375 * DAY_MS
const PAD_MS = 15 * DAY_MS
const MIN_TICK_PX = 64
const MIN_WINDOW_MS = 3 * MONTH_MS

const STATUS_ORDER: Record<string, number> = {
  ongoing: 0,
  permanent: 1,
  upcoming: 2,
  expired: 3,
}

const TICK_STEPS = [1, 2, 3, 6, 12]

interface ActivityGanttProps {
  activities: Activity[]
  onSelect: (activity: Activity) => void
}

interface GanttBarProps {
  activity: Activity
  range: ActivityTimeRange
  left: number
  width: number
  onSelect: (activity: Activity) => void
}

function GanttBar({ activity, range, left, width, onSelect }: GanttBarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const color = ACTIVITY_GROUP_COLORS[activity.group] ?? ACTIVITY_GROUP_COLORS.other
  const permanent = range.closeTime === null
  const expired = activity.status === 'expired'
  return (
    <button
      type="button"
      data-testid={`gantt-bar-${activity.id}`}
      title={activity.name}
      onClick={() => onSelect(activity)}
      className={`absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-md border transition hover:brightness-125 ${expired ? 'opacity-40 saturate-50' : ''}`}
      style={{
        left,
        width: Math.max(10, width),
        height: BAR_HEIGHT,
        borderColor: `${color}66`,
        backgroundColor: `${color}26`,
      }}
    >
      {activity.tabImg && !imgFailed && (
        <img
          src={activity.tabImg}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-70"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: permanent
            ? 'linear-gradient(to right, rgba(19,20,26,0.35) 0%, rgba(19,20,26,0.25) 55%, rgba(19,20,26,0.85) 90%, #13141A 100%)'
            : 'linear-gradient(to bottom, rgba(19,20,26,0.15) 0%, rgba(19,20,26,0.45) 100%)',
        }}
      />
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
    </button>
  )
}

export default function ActivityGantt({ activities, onSelect }: ActivityGanttProps) {
  const { t, locale } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const now = useMemo(() => Date.now(), [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setViewportWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setViewportWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  const timelineViewport = Math.max(240, viewportWidth - NAME_COL_WIDTH)
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

  const todayX = NAME_COL_WIDTH + (now - axisStart) * pxPerMs

  useEffect(() => {
    const el = scrollRef.current
    if (!el || viewportWidth === 0) return
    el.scrollLeft = Math.max(0, todayX - viewportWidth / 2 - NAME_COL_WIDTH / 2)
  }, [todayX, viewportWidth])

  return (
    <div
      ref={scrollRef}
      className="min-w-0 overflow-x-auto rounded border border-archive-border bg-archive-file"
      data-testid="activity-gantt"
    >
      <div className="relative" style={{ width: NAME_COL_WIDTH + timelineWidth }}>
        <div className="flex h-8 border-b border-archive-border">
          <div
            className="sticky left-0 z-10 shrink-0 bg-archive-file px-2 text-[11px] leading-8 text-archive-lead"
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
            data-testid="activity-row"
            className="group flex border-b border-archive-border/50 last:border-b-0 transition-colors hover:bg-[#17181F]"
            style={{ height: ROW_HEIGHT }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 truncate bg-archive-file px-2 text-xs text-archive-ivory group-hover:bg-[#17181F]"
              style={{ width: NAME_COL_WIDTH, lineHeight: `${ROW_HEIGHT}px` }}
            >
              {a.name}
            </div>
            <div className="relative flex-1">
              {a.timeRanges.map((r, i) => {
                const end = Math.min(r.closeTime ?? axisEnd, axisEnd)
                const left = Math.max(0, (r.openTime - axisStart) * pxPerMs)
                const width = Math.max(3, (end - Math.max(r.openTime, axisStart)) * pxPerMs)
                return (
                  <GanttBar
                    key={i}
                    activity={a}
                    range={r}
                    left={left}
                    width={width}
                    onSelect={onSelect}
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
            <span className="absolute top-0 left-1 rounded bg-archive-file/90 px-1 text-[10px] leading-4 text-archive-seal whitespace-nowrap">
              {t('activity.today')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
