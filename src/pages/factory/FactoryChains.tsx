import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useI18n } from '../../i18n'
import { useFactoryData, useCraftingChain } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import ItemTile from '../../components/Items/ItemTile'
import ChainGraph from '../../components/Factory/ChainGraph'
import { ListSkeleton } from '../../components/ui/ListSkeleton'

const LIST_PAGE_SIZE = 50

export default function FactoryChains() {
  const { t } = useI18n()
  const { locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetsParam = searchParams.get('targets')
  const targets = useMemo(() => targetsParam ? targetsParam.split(',').filter(Boolean) : [], [targetsParam])
  const { data: factoryData, loading, error } = useFactoryData()
  const { data: graph } = useCraftingChain(targets)
  const [search, setSearch] = useState('')
  const [itemMeta, setItemMeta] = useState<Record<string, { name: string; rarity: number }>>({})
  const [listPage, setListPage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setListPage(0)
  }, [search])

  useEffect(() => {
    if (!factoryData) return
    const allIds = new Set<string>(Object.keys(factoryData.index.asOutcome))
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale)),
    ]).then(([raw, i18nMap]) => {
      if (cancelled) return
      const meta: Record<string, { name: string; rarity: number }> = {}
      for (const id of allIds) {
        const item = raw[id]
        const name = item?.name ? (i18nMap[String(item.name.id)] || item.name.text || id) : id
        meta[id] = { name, rarity: item?.rarity ?? 0 }
      }
      setItemMeta(meta)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [factoryData, locale])

  const itemIds = useMemo(() => {
    if (!factoryData) return []
    return Object.keys(factoryData.index.asOutcome).sort((a, b) => {
      const ra = itemMeta[a]?.rarity ?? 0
      const rb = itemMeta[b]?.rarity ?? 0
      if (rb !== ra) return rb - ra
      return (itemMeta[a]?.name || a).localeCompare(itemMeta[b]?.name || b)
    })
  }, [factoryData, itemMeta])

  const filteredIds = useMemo(() => {
    if (!search.trim()) return itemIds
    const q = search.toLowerCase()
    return itemIds.filter(id => {
      const meta = itemMeta[id]
      return meta?.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    })
  }, [itemIds, itemMeta, search])

  const listTotalPages = Math.max(1, Math.ceil(filteredIds.length / LIST_PAGE_SIZE))
  const pagedList = filteredIds.slice(listPage * LIST_PAGE_SIZE, (listPage + 1) * LIST_PAGE_SIZE)

  function addTarget(id: string) {
    if (targets.includes(id)) return
    const next = [...targets, id]
    setSearchParams({ targets: next.join(',') })
    setSearch('')
  }

  function removeTarget(id: string) {
    const next = targets.filter(t => t !== id)
    if (next.length === 0) {
      setSearchParams({})
    } else {
      setSearchParams({ targets: next.join(',') })
    }
  }

  function clearTargets() {
    setSearchParams({})
  }

  if (loading) return <ListSkeleton />
  if (error) return <div className="text-center py-12 text-archive-lead">{error}</div>

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-72 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('factory.addTarget')}
          className="w-full px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 mb-3"
        />

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory"
          >
            <span className="text-archive-lead flex-1 text-left">
              {targets.length > 0
                ? `${targets.length} ${t('factory.selectedTargets')}`
                : t('factory.addTarget')}
            </span>
            <svg className={`w-4 h-4 text-archive-lead shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileOpen && (
            <div className="mt-1 max-h-[50vh] overflow-y-auto rounded border border-archive-border bg-archive-file">
              {pagedList.map(id => {
                const meta = itemMeta[id]
                const isSelected = targets.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { if (!isSelected) addTarget(id) }}
                    disabled={isSelected}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'text-archive-lead cursor-not-allowed'
                        : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-border'
                    }`}
                  >
                    <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
                    <span className="truncate">{meta?.name || id}</span>
                  </button>
                )
              })}
              {filteredIds.length === 0 && (
                <div className="text-sm text-archive-lead py-4 text-center">{t('factory.noRecipes')}</div>
              )}
            </div>
          )}
          {listTotalPages > 1 && mobileOpen && (
            <div className="flex items-center justify-center gap-1 text-xs mt-2">
              <button type="button" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}
                className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
              <span className="text-archive-lead px-1">{listPage + 1}/{listTotalPages}</span>
              <button type="button" disabled={listPage >= listTotalPages - 1} onClick={() => setListPage(p => p + 1)}
                className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            </div>
          )}
        </div>

        <div className="hidden md:block max-h-[70vh] overflow-y-auto space-y-0.5 pr-1">
          {pagedList.map(id => {
            const meta = itemMeta[id]
            const isSelected = targets.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => { if (!isSelected) addTarget(id) }}
                disabled={isSelected}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  isSelected
                    ? 'bg-archive-gold/10 text-archive-gold cursor-not-allowed'
                    : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-file'
                }`}
              >
                <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
                <span className="truncate">{meta?.name || id}</span>
              </button>
            )
          })}
          {filteredIds.length === 0 && (
            <div className="text-sm text-archive-lead py-4 text-center">{t('factory.noRecipes')}</div>
          )}
        </div>
        {listTotalPages > 1 && (
          <div className="hidden md:flex items-center justify-center gap-1 text-xs mt-2">
            <button type="button" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            <span className="text-archive-lead px-1">{listPage + 1}/{listTotalPages}</span>
            <button type="button" disabled={listPage >= listTotalPages - 1} onClick={() => setListPage(p => p + 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {targets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-archive-lead">{t('factory.selectedTargets')}:</span>
            {targets.map(id => {
              const meta = itemMeta[id]
              return (
                <div key={id} className="flex items-center gap-1 bg-archive-gold/10 rounded px-2 py-0.5">
                  <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
                  <span className="text-xs text-archive-gold">{meta?.name || id}</span>
                  <button type="button" onClick={() => removeTarget(id)}
                    className="text-archive-lead hover:text-archive-ivory ml-1">×</button>
                </div>
              )
            })}
            <button type="button" onClick={clearTargets}
              className="text-xs text-archive-lead hover:text-archive-ivory">{t('factory.clearAll')}</button>
          </div>
        )}

        {targets.length === 0 ? (
          <div className="text-center py-16 text-archive-lead text-sm">{t('factory.emptyChainHint')}</div>
        ) : graph && graph.nodes.length > 0 ? (
          <ReactFlowProvider>
            <ChainGraph graph={graph} />
          </ReactFlowProvider>
        ) : (
          <ListSkeleton />
        )}
      </div>
    </div>
  )
}
