import { useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePrtsLibrary } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { PrtsDocumentDetail } from './PrtsDocumentDetail'

export default function StoryLibrary() {
  const { t } = useI18n()
  const { data, loading, error } = usePrtsLibrary()
  const [searchParams, setSearchParams] = useSearchParams()
  const catFilter = searchParams.get('cat') || ''
  const docParam = searchParams.get('doc') || ''

  const filteredVolumes = useMemo(() => {
    if (!data) return []
    if (!catFilter) return data.volumes
    return data.volumes.filter(v => v.categoryId === catFilter)
  }, [data, catFilter])

  const allItems = useMemo(() => {
    if (!data) return []
    return data.items
      .filter(i => filteredVolumes.some(v => v.id === i.volumeId))
      .sort((a, b) => a.order - b.order)
  }, [data, filteredVolumes])

  const selectedId = docParam || allItems[0]?.id || ''

  useEffect(() => {
    if (!docParam && allItems[0]?.id) {
      setSearchParams({ ...(catFilter ? { cat: catFilter } : {}), doc: allItems[0].id }, { replace: true })
    }
  }, [docParam, catFilter, allItems, setSearchParams])

  if (loading) return <ListSkeleton cards={20} />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!data) return null

  const volumesByCat = filteredVolumes.sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)] md:min-h-0 md:max-h-[calc(100vh-4rem)]">
      <aside className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col min-h-0 md:border-r border-archive-border">
        <div className="p-4 pb-2 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchParams(catFilter ? { cat: '' } : {})}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              !catFilter ? 'bg-archive-gold/20 text-archive-gold' : 'bg-archive-file text-archive-dust hover:text-archive-ivory'
            }`}
          >
            {t('story.typeAll')}
          </button>
          {data.categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSearchParams({ cat: cat.id, doc: selectedId })}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                catFilter === cat.id ? 'bg-archive-gold/20 text-archive-gold' : 'bg-archive-file text-archive-dust hover:text-archive-ivory'
              }`}
            >
              {cat.name} <span className="ml-1 text-xs">({cat.itemCount})</span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-4">
          {volumesByCat.map(vol => (
            <div key={vol.id}>
              <div className="flex items-center gap-2 px-2 py-1">
                {vol.iconUrl ? (
                  <img
                    src={vol.iconUrl}
                    alt=""
                    className="w-5 h-5 object-contain shrink-0"
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
                  <div className="w-5 h-5 rounded bg-archive-file shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-archive-ivory truncate">{vol.name || vol.id}</div>
                  {vol.subName && <div className="text-[11px] text-archive-dust truncate">{vol.subName}</div>}
                </div>
              </div>
              <div className="mt-1 space-y-0.5">
                {data.items
                  .filter(i => i.volumeId === vol.id)
                  .sort((a, b) => a.order - b.order)
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSearchParams({ ...(catFilter ? { cat: catFilter } : {}), doc: item.id })}
                      className={`w-full flex items-center gap-2 p-1.5 rounded cursor-pointer text-left transition-colors ${
                        selectedId === item.id
                          ? 'bg-archive-gold/10 text-archive-gold'
                          : 'hover:bg-archive-file text-archive-ivory'
                      }`}
                    >
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-archive-file text-archive-dust shrink-0">
                        {item.type}
                      </span>
                      <span className="text-xs flex-1 truncate">{item.name || item.id}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {volumesByCat.length === 0 && (
            <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
          )}
        </div>
      </aside>

      <section className="flex-1 min-h-0 md:overflow-y-auto p-4 md:p-6">
        {selectedId ? (
          <PrtsDocumentDetail itemId={selectedId} />
        ) : (
          <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
        )}
      </section>
    </div>
  )
}
