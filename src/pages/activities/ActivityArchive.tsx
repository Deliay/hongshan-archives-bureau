import { useMemo, useState } from 'react'
import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useActivities } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import type { Activity, ActivityGroup, ActivityStatus } from '../../lib/types'
import ActivityGantt from '../../components/Activities/ActivityGantt'
import ActivityFilters from '../../components/Activities/ActivityFilters'
import { ACTIVITY_GROUPS } from '../../components/Activities/activityMeta'
import ActivityTooltip from '../../components/Activities/ActivityTooltip'

const DEFAULT_STATUSES: ActivityStatus[] = ['ongoing', 'permanent', 'upcoming']

export default function ActivityArchive() {
  const { t } = useI18n()
  const { data: activities, loading, error } = useActivities()
  const [groups, setGroups] = useState<ActivityGroup[]>(ACTIVITY_GROUPS)
  const [statuses, setStatuses] = useState<ActivityStatus[]>(DEFAULT_STATUSES)
  const [selected, setSelected] = useState<Activity | null>(null)

  const filtered = useMemo(() => {
    if (!activities) return []
    return activities.filter(
      (a) => a.status !== 'unknown' && groups.includes(a.group) && statuses.includes(a.status as ActivityStatus),
    )
  }, [activities, groups, statuses])

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!activities || activities.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('activity.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.activity}</Badge>
      </div>

      <ActivityFilters
        groups={groups}
        statuses={statuses}
        onGroupsChange={setGroups}
        onStatusesChange={setStatuses}
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-archive-lead mt-4">{t('activity.empty')}</p>
      ) : (
        <ActivityGantt activities={filtered} onSelect={setSelected} />
      )}

      {selected && <ActivityTooltip activity={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
