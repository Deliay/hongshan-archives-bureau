import { useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useI18n } from '../../i18n'
import { useFactoryData, useCraftingChain, useFactoryItemMeta } from '../../hooks/useData'
import ItemTile from '../../components/Items/ItemTile'
import ChainGraph from '../../components/Factory/ChainGraph'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import type { ChainTarget } from '../../lib/factory/types'

export default function FactoryChains() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetsParam = searchParams.get('targets')

  const [targets, setTargets] = useState<ChainTarget[]>(() => {
    if (!targetsParam) return []
    return targetsParam.split(',').filter(Boolean).map(part => {
      const [itemId, rateStr] = part.split(':')
      const rate = parseFloat(rateStr)
      return {
        itemId,
        rate: isNaN(rate) || rate < 0 ? 0 : rate,
      }
    }).filter(t => t.itemId)
  })

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

  const updateTargets = useCallback((newTargets: ChainTarget[]) => {
    setTargets(newTargets)
    if (newTargets.length === 0) {
      setSearchParams({})
    } else {
      setSearchParams({ targets: newTargets.map(t => `${t.itemId}:${t.rate}`).join(',') })
    }
  }, [setSearchParams])

  function addTarget(itemId: string) {
    if (targets.some(t => t.itemId === itemId)) return
    const recipe = factoryData?.index.asOutcome[itemId]?.[0]
    const outcome = recipe?.outcomes.find(o => o.itemId === itemId)
    const defaultRate = recipe ? (outcome?.count ?? 1) * 60000 / recipe.totalProgress : 0
    updateTargets([...targets, { itemId, rate: defaultRate }])
  }

  function removeTarget(itemId: string) {
    updateTargets(targets.filter(t => t.itemId !== itemId))
  }

  function updateRate(itemId: string, rate: number) {
    updateTargets(targets.map(t => t.itemId === itemId ? { ...t, rate } : t))
  }

  function clearTargets() {
    updateTargets([])
  }

  if (loading) return <ListSkeleton />
  if (error) return <div className="text-center py-12 text-archive-lead">{error}</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-archive-lead">{t('factory.addTarget')}:</span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                addTarget(e.target.value)
                e.target.value = ''
              }
            }}
            className="bg-archive-ink border border-archive-border rounded px-2 py-1 text-sm text-archive-ivory"
          >
            <option value="">--</option>
            {itemIds.map(id => (
              <option key={id} value={id}>{itemMeta[id]?.name || id}</option>
            ))}
          </select>
        </div>

        {targets.map(target => {
          const meta = itemMeta[target.itemId]
          return (
            <div key={target.itemId} className="flex items-center gap-2 bg-archive-gold/10 rounded px-3 py-2">
              <ItemTile itemId={target.itemId} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
              <span className="text-sm text-archive-gold">{meta?.name || target.itemId}</span>
              <input
                type="number"
                value={target.rate}
                onChange={(e) => updateRate(target.itemId, parseFloat(e.target.value) || 0)}
                className="w-20 bg-archive-ink border border-archive-border rounded px-2 py-1 text-sm text-archive-ivory"
                min="0"
                step="0.1"
              />
              <span className="text-xs text-archive-lead">{t('factory.unitPerMin')}</span>
              <button
                type="button"
                onClick={() => removeTarget(target.itemId)}
                className="text-archive-lead hover:text-archive-ivory ml-2"
              >
                ×
              </button>
            </div>
          )
        })}

        {targets.length > 0 && (
          <button
            type="button"
            onClick={clearTargets}
            className="text-xs text-archive-lead hover:text-archive-ivory self-start"
          >
            {t('factory.clearAll')}
          </button>
        )}
      </div>

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
