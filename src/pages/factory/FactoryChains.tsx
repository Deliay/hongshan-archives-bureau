import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useI18n } from '../../i18n'
import { useFactoryData, useCraftingChain, useFactoryItemMeta } from '../../hooks/useData'
import ItemTile from '../../components/Items/ItemTile'
import ChainGraph from '../../components/Factory/ChainGraph'
import FactoryItemSidebar from '../../components/Factory/FactoryItemSidebar'
import { ListSkeleton } from '../../components/ui/ListSkeleton'

export default function FactoryChains() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetsParam = searchParams.get('targets')
  const targets = useMemo(() => targetsParam ? targetsParam.split(',').filter(Boolean) : [], [targetsParam])
  const { data: factoryData, loading, error } = useFactoryData()
  const { data: graph } = useCraftingChain(targets)

  const baseIds = useMemo(() => {
    if (!factoryData) return []
    return Object.keys(factoryData.index.asOutcome)
  }, [factoryData])

  const itemMeta = useFactoryItemMeta(baseIds)

  const itemIds = useMemo(() => {
    return [...baseIds].sort((a, b) => {
      const ra = itemMeta[a]?.rarity ?? 0
      const rb = itemMeta[b]?.rarity ?? 0
      if (rb !== ra) return rb - ra
      return (itemMeta[a]?.name || a).localeCompare(itemMeta[b]?.name || b)
    })
  }, [baseIds, itemMeta])

  function addTarget(id: string) {
    if (targets.includes(id)) return
    const next = [...targets, id]
    setSearchParams({ targets: next.join(',') })
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
      <FactoryItemSidebar
        itemIds={itemIds}
        itemMeta={itemMeta}
        searchPlaceholder={t('factory.addTarget')}
        toggleLabel={
          <span className="text-archive-lead">
            {targets.length > 0
              ? `${targets.length} ${t('factory.selectedTargets')}`
              : t('factory.addTarget')}
          </span>
        }
        isSelected={id => targets.includes(id)}
        onSelect={addTarget}
        disableSelected
        clearSearchOnSelect
      />

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
