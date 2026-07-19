import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useRaceDetail } from '../../hooks/useData'
import Rarity from '../../components/Rarity'
import { RichText } from '../../lib/richText'
import { useI18n } from '../../i18n'

const HIGHLIGHT_COLOR = '#B89A6A'

function highlightName(text: string, name: string): string {
  if (!name) return text
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'g'), `<mark=${HIGHLIGHT_COLOR}>${name}</mark>`)
}

export default function RaceDetail() {
  const { raceId } = useParams<{ raceId: string }>()
  const { t } = useI18n()
  const { data, loading, error } = useRaceDetail(raceId ?? '')

  const highlighted = useMemo(() => {
    if (!data) return []
    return data.texts.map(t => ({
      ...t,
      html: highlightName(t.text, data.name),
    }))
  }, [data])

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!data) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/archive/races"
          className="w-7 h-7 flex items-center justify-center rounded-full border border-archive-border
                     text-archive-dust hover:text-archive-gold hover:border-archive-gold/40
                     transition-all duration-200 text-sm leading-none"
        >
          &lt;
        </Link>
        <h2 className="font-display text-xl font-bold text-archive-ivory">{data.name}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.races}</Badge>
        <span className="text-xs text-archive-lead">{t('common.countPeople', { count: data.members.length })}</span>
      </div>

      {highlighted.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-archive-dust mb-2">{t('race.relatedRecords')}</h3>
          <div className="flex flex-col gap-3">
            {highlighted.map((t, i) => (
              <div key={i} className="rounded border border-archive-border bg-archive-file p-3">
                <div className="text-[10px] text-archive-lead mb-1">{t.source}</div>
                <div className="text-sm text-archive-ivory leading-relaxed">
                  <RichText text={t.html} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-medium text-archive-dust mb-2">{t('race.members')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.members.map((m) => (
          <Link
            key={m.id}
            to={`/archive/operators/${m.id}`}
            className="block p-4 rounded border border-archive-border bg-archive-file
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0">
                {m.portrait ? (
                  <img src={m.portrait} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-archive-lead text-lg">?</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors truncate">
                  {m.name}
                </h4>
                <Rarity level={m.rarity} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
