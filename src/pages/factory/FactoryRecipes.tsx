import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useFactoryData, useItemRecipes } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import ItemTile from '../../components/Items/ItemTile'
import RecipeCard from '../../components/Craft/RecipeCard'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { useEffect } from 'react'

export default function FactoryRecipes() {
  const { t } = useI18n()
  const { locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('item')
  const { data: factoryData, loading, error } = useFactoryData()
  const itemRecipes = useItemRecipes(selectedId)
  const [search, setSearch] = useState('')
  const [itemMeta, setItemMeta] = useState<Record<string, { name: string; rarity: number }>>({})

  useEffect(() => {
    if (!factoryData) return
    const allIds = new Set<string>([
      ...Object.keys(factoryData.index.asIngredient),
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
    const ids = new Set<string>([
      ...Object.keys(factoryData.index.asIngredient),
      ...Object.keys(factoryData.index.asOutcome),
    ])
    return Array.from(ids).sort()
  }, [factoryData])

  const filteredIds = useMemo(() => {
    if (!search.trim()) return itemIds
    const q = search.toLowerCase()
    return itemIds.filter(id => {
      const meta = itemMeta[id]
      return meta?.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    })
  }, [itemIds, itemMeta, search])

  if (loading) return <ListSkeleton />
  if (error) return <div className="text-center py-12 text-archive-lead">{error}</div>

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-72 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('factory.searchItem')}
          className="w-full px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 mb-3"
        />
        <div className="max-h-[70vh] overflow-y-auto space-y-0.5 pr-1">
          {filteredIds.map(id => {
            const meta = itemMeta[id]
            const isSelected = id === selectedId
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSearchParams({ item: id })}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  isSelected
                    ? 'bg-archive-gold/10 text-archive-gold'
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
      </div>

      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="text-center py-16 text-archive-lead text-sm">{t('factory.selectItemHint')}</div>
        ) : itemRecipes.asProduct.length === 0 && itemRecipes.asMaterial.length === 0 ? (
          <div className="text-center py-16 text-archive-lead text-sm">{t('factory.noRecipes')}</div>
        ) : (
          <div className="space-y-6">
            {itemRecipes.asProduct.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-archive-gold mb-3">{t('factory.asProduct')}</h3>
                <div className="flex flex-wrap gap-3">
                  {itemRecipes.asProduct.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      machine={factoryData?.machines[recipe.machineId]}
                      highlightItemId={selectedId ?? undefined}
                    />
                  ))}
                </div>
              </div>
            )}
            {itemRecipes.asMaterial.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-archive-lead mb-3">{t('factory.asMaterial')}</h3>
                <div className="flex flex-wrap gap-3">
                  {itemRecipes.asMaterial.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      machine={factoryData?.machines[recipe.machineId]}
                      highlightItemId={selectedId ?? undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
