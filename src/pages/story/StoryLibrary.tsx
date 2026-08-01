import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePrtsLibrary } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { ListSkeleton } from '../../components/ui/ListSkeleton'

export default function StoryLibrary() {
  const { t } = useI18n()
  const { data, loading, error } = usePrtsLibrary()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const catFilter = searchParams.get('cat') || ''
  const [expandedVol, setExpandedVol] = useState<string | null>(null)

  const filteredVolumes = useMemo(() => {
    if (!data) return []
    if (!catFilter) return data.volumes
    return data.volumes.filter(v => v.categoryId === catFilter)
  }, [data, catFilter])

  if (loading) return <ListSkeleton cards={20} />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!data) return null

  return (
    <div className="min-h-screen p-6">
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
            !catFilter ? 'bg-archive-gold/20 text-archive-gold' : 'bg-archive-file text-archive-dust hover:text-archive-ivory'
          }`}
        >
          {t('story.typeAll')}
        </button>
        {data.categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSearchParams({ cat: cat.id })}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              catFilter === cat.id ? 'bg-archive-gold/20 text-archive-gold' : 'bg-archive-file text-archive-dust hover:text-archive-ivory'
            }`}
          >
            {cat.name} <span className="ml-1 text-xs">({cat.itemCount})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredVolumes.sort((a, b) => a.order - b.order).map(vol => (
          <div key={vol.id}>
            <button
              type="button"
              onClick={() => setExpandedVol(expandedVol === vol.id ? null : vol.id)}
              className="w-full p-4 rounded-lg border border-archive-border hover:border-archive-gold/40 cursor-pointer transition-colors text-center"
            >
              {vol.iconUrl ? (
                <img
                  src={vol.iconUrl}
                  alt=""
                  className="w-12 h-12 mx-auto mb-2 object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    const currentSrc = img.src
                    if (currentSrc.includes('/prts/icon/')) {
                      img.src = currentSrc.replace('/prts/icon/', '/prts/')
                    } else {
                      img.style.display = 'none'
                    }
                  }}
                />
              ) : (
                <div className="w-12 h-12 mx-auto mb-2 rounded bg-archive-file" />
              )}
              <div className="text-sm font-medium text-archive-ivory truncate">{vol.name || vol.id}</div>
              {vol.subName && <div className="text-xs text-archive-dust truncate">{vol.subName}</div>}
              <div className="text-xs text-archive-gold mt-1">{vol.itemIds.length}</div>
            </button>
            {expandedVol === vol.id && (
              <div className="border-t border-archive-border mt-2 pt-2 space-y-1">
                {data.items
                  .filter(i => i.volumeId === vol.id)
                  .sort((a, b) => a.order - b.order)
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/archive/story/library/${item.id}`)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-archive-file rounded cursor-pointer text-left"
                    >
                      <span className="text-xs px-2 py-0.5 rounded bg-archive-file text-archive-dust">
                        {item.type}
                      </span>
                      <span className="text-sm text-archive-ivory flex-1 truncate">{item.name || item.id}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredVolumes.length === 0 && (
        <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
      )}
    </div>
  )
}
