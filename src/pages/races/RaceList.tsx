import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useRaces } from '../../hooks/useData'
import { Link } from 'react-router-dom'
import OperatorPortraitCard from '../../components/Operators/OperatorPortraitCard'
import { useI18n } from '../../i18n'

export default function RaceList() {
  const { t } = useI18n()
  const { data: races, loading, error } = useRaces()

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!races) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  const nonEmpty = races.filter(r => r.members.length > 0)
  if (nonEmpty.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('race.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.races}</Badge>
      </div>

      <div className="flex flex-col gap-4">
        {nonEmpty.map((race) => (
          <div
            key={race.id}
            className="rounded border border-archive-border bg-archive-file p-4
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <Link
              to={`/archive/races/${race.id}`}
              className="flex items-baseline gap-2 mb-3"
            >
              <h3 className="text-base font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">{race.name}</h3>
              <span className="text-xs text-archive-lead">{t('common.countPeople', { count: race.members.length })}</span>
            </Link>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {race.members.map((m) => (
                <OperatorPortraitCard
                  key={m.id}
                  id={m.id}
                  name={m.name}
                  portrait={m.portrait}
                  rarity={m.rarity}
                  size="sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
