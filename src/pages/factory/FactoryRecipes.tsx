import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useFactoryData, useItemRecipes, useFactoryItemMeta } from '../../hooks/useData'
import ItemTile from '../../components/Items/ItemTile'
import RecipeCard from '../../components/Craft/RecipeCard'
import FactoryItemSidebar from '../../components/Factory/FactoryItemSidebar'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { ASSET_BASE } from '../../lib/adapter'
import type { FactoryRecipe } from '../../lib/factory/types'

const PAGE_SIZE = 20

export default function FactoryRecipes() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('item')
  const { data: factoryData, loading, error } = useFactoryData()
  const itemRecipes = useItemRecipes(selectedId)
  const [recipePage, setRecipePage] = useState(0)

  useEffect(() => {
    setRecipePage(0)
  }, [selectedId])

  const baseIds = useMemo(() => {
    if (!factoryData) return []
    return Array.from(new Set([
      ...Object.keys(factoryData.index.asIngredient),
      ...Object.keys(factoryData.index.asOutcome),
    ]))
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

  const allRecipes = useMemo(() => {
    const map = new Map<string, FactoryRecipe>()
    for (const r of itemRecipes.asProduct) map.set(r.id, r)
    for (const r of itemRecipes.asMaterial) map.set(r.id, r)
    return Array.from(map.values())
  }, [itemRecipes])

  const groupedByMachine = useMemo(() => {
    const groups = new Map<string, FactoryRecipe[]>()
    for (const r of allRecipes) {
      const key = r.machineId || '__unknown__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }
    return Array.from(groups.entries())
  }, [allRecipes])

  const recipeTotalPages = Math.max(1, Math.ceil(groupedByMachine.length / PAGE_SIZE))
  const pagedGroups = groupedByMachine.slice(recipePage * PAGE_SIZE, (recipePage + 1) * PAGE_SIZE)

  const selectedMeta = selectedId ? itemMeta[selectedId] : null

  if (loading) return <ListSkeleton />
  if (error) return <div className="text-center py-12 text-archive-lead">{error}</div>

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <FactoryItemSidebar
        itemIds={itemIds}
        itemMeta={itemMeta}
        searchPlaceholder={t('factory.searchItem')}
        toggleLabel={
          selectedMeta ? (
            <>
              <ItemTile itemId={selectedId!} size="sm" name={selectedMeta.name} rarity={selectedMeta.rarity} showTips={false} />
              <span className="truncate">{selectedMeta.name}</span>
            </>
          ) : (
            <span className="text-archive-lead">{t('factory.selectItemHint')}</span>
          )
        }
        isSelected={id => id === selectedId}
        onSelect={id => setSearchParams({ item: id })}
      />

      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="text-center py-16 text-archive-lead text-sm">{t('factory.selectItemHint')}</div>
        ) : allRecipes.length === 0 ? (
          <div className="text-center py-16 text-archive-lead text-sm">{t('factory.noRecipes')}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-archive-lead">{allRecipes.length} {t('factory.recipes')}</span>
              {recipeTotalPages > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    disabled={recipePage === 0}
                    onClick={() => setRecipePage(p => p - 1)}
                    className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <span className="text-archive-lead px-1">{recipePage + 1}/{recipeTotalPages}</span>
                  <button
                    type="button"
                    disabled={recipePage >= recipeTotalPages - 1}
                    onClick={() => setRecipePage(p => p + 1)}
                    className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            {pagedGroups.map(([machineId, recipes]) => {
              const machine = factoryData?.machines[machineId]
              return (
                <div key={machineId}>
                  {machine && (
                    <div className="flex items-center gap-2 mb-2">
                      {machine.iconId && (
                        <img
                          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/${machine.iconId}.png`}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <span className="text-sm font-medium text-archive-ivory">{machine.name}</span>
                      <span className="text-[10px] text-archive-lead">({recipes.length})</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {recipes.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        machine={machine}
                        highlightItemId={selectedId ?? undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
