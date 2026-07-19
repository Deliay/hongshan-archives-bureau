import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { useParams, Link } from 'react-router-dom'
import { useFactionDetail, useArchiveSearch } from '../../hooks/useData'
import Rarity from '../../components/Rarity'
import { useI18n } from '../../i18n'
import ArchiveSearchResults from '../../components/Search/ArchiveSearchResults'

export default function FactionDetail() {
  const { factionId } = useParams<{ factionId: string }>()
  const { t } = useI18n()
  const { data, loading, error } = useFactionDetail(factionId ?? '')

  const {
    results,
    entities,
    total,
    page,
    pageSize,
    loading: searchLoading,
    error: searchError,
    setPage,
  } = useArchiveSearch(data?.name ?? '', {
    excludeTables: ['TagDataTable', 'BlocDataTable', 'CharacterTagTable'],
  })

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!data) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/archive/factions"
          className="w-7 h-7 flex items-center justify-center rounded-full border border-archive-border
                     text-archive-dust hover:text-archive-gold hover:border-archive-gold/40
                     transition-all duration-200 text-sm leading-none"
        >
          &lt;
        </Link>
        <h2 className="font-display text-xl font-bold text-archive-ivory">{data.name}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.factions}</Badge>
        {data.engName && (
          <span className="text-sm text-archive-lead">{data.engName}</span>
        )}
        <span className="text-xs text-archive-lead">{t('common.countPeople', { count: data.members.length })}</span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-archive-dust">{t('faction.relatedRecords')}</h3>
          {data.name && (
            <Link
              to={`/archive/search?keyword=${encodeURIComponent(data.name)}`}
              className="text-xs text-archive-gold hover:text-archive-ivory transition-colors"
            >
              {t('search.searchMore')}
            </Link>
          )}
        </div>
        <ArchiveSearchResults
          query={data.name}
          results={results}
          entities={entities}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={searchLoading}
          error={searchError}
          emptyMessage={t('search.noResults')}
          onPageChange={setPage}
        />
      </div>

      <h3 className="text-sm font-medium text-archive-dust mb-2">{t('faction.members')}</h3>
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
