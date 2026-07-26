import type { ActivityGroup, ActivityStatus } from '../../lib/types'
import { ACTIVITY_GROUP_COLORS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { ACTIVITY_GROUPS, ACTIVITY_STATUSES, ACTIVITY_GROUP_LABEL_KEYS, ACTIVITY_STATUS_LABEL_KEYS } from './activityMeta'

interface ActivityFiltersProps {
  groups: ActivityGroup[]
  statuses: ActivityStatus[]
  onGroupsChange: (groups: ActivityGroup[]) => void
  onStatusesChange: (statuses: ActivityStatus[]) => void
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

const chipBase = 'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors'
const chipOn = 'border-archive-gold/50 bg-archive-gold/10 text-archive-ivory'
const chipOff = 'border-archive-border bg-transparent text-archive-lead hover:text-archive-dust'

export default function ActivityFilters({ groups, statuses, onGroupsChange, onStatusesChange }: ActivityFiltersProps) {
  const { t } = useI18n()

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-archive-lead">{t('activity.filterType')}</span>
        {ACTIVITY_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={groups.includes(g)}
            onClick={() => onGroupsChange(toggle(groups, g))}
            className={`${chipBase} ${groups.includes(g) ? chipOn : chipOff}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ACTIVITY_GROUP_COLORS[g] ?? ACTIVITY_GROUP_COLORS.other }}
            />
            {t(ACTIVITY_GROUP_LABEL_KEYS[g])}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-archive-lead">{t('activity.filterStatus')}</span>
        {ACTIVITY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statuses.includes(s)}
            onClick={() => onStatusesChange(toggle(statuses, s))}
            className={`${chipBase} ${statuses.includes(s) ? chipOn : chipOff}`}
          >
            {t(ACTIVITY_STATUS_LABEL_KEYS[s])}
          </button>
        ))}
      </div>
    </div>
  )
}
