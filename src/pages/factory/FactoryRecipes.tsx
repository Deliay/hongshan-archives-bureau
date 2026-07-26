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
import { ASSET_BASE } from '../../lib/adapter'
import type { FactoryRecipe } from '../../lib/factory/types'

const PAGE_SIZE = 20
const LIST_PAGE_SIZE = 50

export default function FactoryRecipes() {
  const { t } = useI18n()
  const { locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('item')
  const { data: factoryData, loading, error } = useFactoryData()
  const itemRecipes = useItemRecipes(selectedId)
  const [search, setSearch] = useState('')
  const [itemMeta, setItemMeta] = useState<Record<string, { name: string; rarity: number }>>({})
  const [listPage, setListPage] = useState(0)
  const [recipePage, setRecipePage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setRecipePage(0)
  }, [selectedId])

  useEffect(() => {
    setListPage(0)
  }, [search])

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
    return Array.from(ids).sort((a, b) => {
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
      <div className="md:w-72 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('factory.searchItem')}
          className="w-full px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 mb-3"
        />

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory"
          >
            {selectedMeta ? (
              <>
                <ItemTile itemId={selectedId!} size="sm" name={selectedMeta.name} rarity={selectedMeta.rarity} showTips={false} />
                <span className="truncate flex-1 text-left">{selectedMeta.name}</span>
              </>
            ) : (
              <span className="text-archive-lead flex-1 text-left">{t('factory.selectItemHint')}</span>
            )}
            <svg className={`w-4 h-4 text-archive-lead shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileOpen && (
            <div className="mt-1 max-h-[50vh] overflow-y-auto rounded border border-archive-border bg-archive-file">
              {pagedList.map(id => {
                const meta = itemMeta[id]
                const isSelected = id === selectedId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setSearchParams({ item: id }); setMobileOpen(false) }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-archive-gold/10 text-archive-gold'
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
              <button
                type="button"
                disabled={listPage === 0}
                onClick={() => setListPage(p => p - 1)}
                className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="text-archive-lead px-1">{listPage + 1}/{listTotalPages}</span>
              <button
                type="button"
                disabled={listPage >= listTotalPages - 1}
                onClick={() => setListPage(p => p + 1)}
                className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:block max-h-[70vh] overflow-y-auto space-y-0.5 pr-1">
          {pagedList.map(id => {
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
        {listTotalPages > 1 && (
          <div className="hidden md:flex items-center justify-center gap-1 text-xs mt-2">
            <button
              type="button"
              disabled={listPage === 0}
              onClick={() => setListPage(p => p - 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="text-archive-lead px-1">{listPage + 1}/{listTotalPages}</span>
            <button
              type="button"
              disabled={listPage >= listTotalPages - 1}
              onClick={() => setListPage(p => p + 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        )}
      </div>

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
