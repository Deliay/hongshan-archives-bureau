import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useI18n } from '../../i18n'
import { useFactoryData, useCraftingChain, useFactoryItemMeta } from '../../hooks/useData'
import ItemTile from '../../components/Items/ItemTile'
import ChainGraph from '../../components/Factory/ChainGraph'
import FactoryItemPickerDialog from '../../components/Factory/FactoryItemPickerDialog'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import type { ChainTarget } from '../../lib/factory/types'

export default function FactoryChains() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetsParam = searchParams.get('targets')

  const [targets, setTargets] = useState<ChainTarget[]>(() => {
    if (!targetsParam) return []
    // 重复 itemId 后者覆盖前者；非法/缺省 rate 先存 NaN，待数据加载后回退默认理论产速
    const map = new Map<string, number>()
    for (const part of targetsParam.split(',').filter(Boolean)) {
      const [itemId, rateStr] = part.split(':')
      if (!itemId) continue
      map.set(itemId, parseFloat(rateStr))
    }
    return Array.from(map, ([itemId, rate]) => ({ itemId, rate }))
  })

  const { data: factoryData, loading, error } = useFactoryData()
  const { data: graph } = useCraftingChain(targets)
  const [pickerOpen, setPickerOpen] = useState(false)

  const defaultRateOf = useCallback((itemId: string): number => {
    const recipe = factoryData?.index.asOutcome[itemId]?.[0]
    const outcome = recipe?.outcomes.find(o => o.itemId === itemId)
    return recipe ? (outcome?.count ?? 1) * 60000 / recipe.totalProgress : 0
  }, [factoryData])

  // 非法（NaN、负数）rate 回退为该物品默认配方的理论产出速率
  useEffect(() => {
    if (!factoryData) return
    if (!targets.some(t => !Number.isFinite(t.rate) || t.rate < 0)) return
    const fixed = targets.map(t =>
      !Number.isFinite(t.rate) || t.rate < 0 ? { ...t, rate: defaultRateOf(t.itemId) } : t,
    )
    updateTargets(fixed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryData])

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
    updateTargets([...targets, { itemId, rate: defaultRateOf(itemId) }])
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
      <FactoryItemPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        itemIds={itemIds}
        itemMeta={itemMeta}
        isSelected={id => targets.some(target => target.itemId === id)}
        onSelect={addTarget}
      />

      <div className="flex flex-wrap items-center gap-2">
        {targets.map(target => {
          const meta = itemMeta[target.itemId]
          return (
            <div key={target.itemId} className="flex items-center gap-2 bg-archive-gold/10 rounded px-3 py-2 w-fit">
              <ItemTile itemId={target.itemId} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
              <div className="flex flex-col gap-1">
                <span className="text-sm text-archive-gold">{meta?.name || target.itemId}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={target.rate}
                    onChange={(e) => updateRate(target.itemId, parseFloat(e.target.value) || 0)}
                    className="w-20 bg-archive-ink border border-archive-border rounded px-2 py-1 text-sm text-archive-ivory"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-archive-lead">{t('factory.unitPerMin')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeTarget(target.itemId)}
                className="text-archive-lead hover:text-archive-ivory ml-2 self-start"
              >
                ×
              </button>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 bg-archive-gold/10 rounded px-3 py-2 text-left w-fit hover:bg-archive-gold/20 transition-colors"
        >
          <span className="w-12 h-12 shrink-0 flex items-center justify-center rounded border border-dashed border-archive-gold/40 text-archive-gold text-xl leading-none">+</span>
          <span className="text-sm text-archive-gold">{t('factory.addTarget')}</span>
        </button>
      </div>

      {targets.length > 0 && (
        <button
          type="button"
          onClick={clearTargets}
          className="text-xs text-archive-lead hover:text-archive-ivory self-start"
        >
          {t('factory.clearAll')}
        </button>
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
