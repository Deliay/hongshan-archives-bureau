import { useState, useMemo } from 'react'
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
import { useEffect } from 'react'

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

  useEffect(() => {
    if (!factoryData) return
    const allIds = new Set<string>([
      ...Object.keys(factoryData.index.asOutcome),
    ])
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
    return Object.keys(factoryData.index.asOutcome).sort()
  }, [factoryData])

  const filteredIds = useMemo(() => {
    if (!search.trim()) return itemIds
    const q = search.toLowerCase()
    return itemIds.filter(id => {
      const meta = itemMeta[id]
      return meta?.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    })
  }, [itemIds, itemMeta, search])

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('factory.addTarget')}
            className="w-full px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40"
          />
          {search.trim() && filteredIds.length > 0 && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded border border-archive-border bg-archive-file">
              {filteredIds.slice(0, 20).map(id => {
                const meta = itemMeta[id]
                const isSelected = targets.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => addTarget(id)}
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
            </div>
          )}
        </div>
      </div>

      {targets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-archive-lead">{t('factory.selectedTargets')}:</span>
          {targets.map(id => {
            const meta = itemMeta[id]
            return (
              <div key={id} className="flex items-center gap-1 bg-archive-gold/10 rounded px-2 py-0.5">
                <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
                <span className="text-xs text-archive-gold">{meta?.name || id}</span>
                <button
                  type="button"
                  onClick={() => removeTarget(id)}
                  className="text-archive-lead hover:text-archive-ivory ml-1"
                >
                  ×
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={clearTargets}
            className="text-xs text-archive-lead hover:text-archive-ivory"
          >
            {t('factory.clearAll')}
          </button>
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
  )
}
