import ItemTile from '../Items/ItemTile'
import { useI18n } from '../../i18n'
import { ASSET_BASE } from '../../lib/adapter'
import { perMinute } from '../../lib/factory/chain'
import type { FactoryRecipe, FactoryMachine } from '../../lib/factory/types'

interface RecipeCardProps {
  recipe: FactoryRecipe
  machine?: FactoryMachine
  highlightItemId?: string
}

export default function RecipeCard({ recipe, machine, highlightItemId }: RecipeCardProps) {
  const { t } = useI18n()
  const pm = recipe.totalProgress > 0
    ? recipe.outcomes.map(o => ({ itemId: o.itemId, count: perMinute(o.count, recipe.totalProgress) }))
    : []
  const cm = recipe.totalProgress > 0
    ? recipe.ingredients.map(i => ({ itemId: i.itemId, count: perMinute(i.count, recipe.totalProgress) }))
    : []

  return (
    <div className="p-3 rounded border border-archive-border bg-archive-file w-fit max-w-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[10px] text-archive-gold uppercase tracking-wide font-medium">{t('factory.asProduct')}</span>
        <div className="flex flex-wrap gap-1.5">
          {recipe.outcomes.map(o => (
            <div key={o.itemId} className="relative">
              <ItemTile
                itemId={o.itemId}
                amount={o.count}
                size="lg"
                className={highlightItemId === o.itemId ? 'ring-1 ring-archive-gold' : ''}
              />
              {pm.find(p => p.itemId === o.itemId) && (
                <div className="absolute -bottom-1 -right-1 bg-archive-gold/90 text-archive-ink text-[9px] font-bold rounded px-0.5 leading-tight">
                  {pm.find(p => p.itemId === o.itemId)!.count.toFixed(1)}/m
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[10px] text-archive-lead uppercase tracking-wide">{t('factory.asMaterial')}</span>
        <div className="flex flex-wrap gap-1.5">
          {recipe.ingredients.map(i => (
            <div key={i.itemId} className="relative">
              <ItemTile
                itemId={i.itemId}
                amount={i.count}
                size="lg"
                className={highlightItemId === i.itemId ? 'ring-1 ring-archive-gold' : ''}
              />
              {cm.find(c => c.itemId === i.itemId) && (
                <div className="absolute -bottom-1 -right-1 bg-archive-lead/90 text-archive-ink text-[9px] font-bold rounded px-0.5 leading-tight">
                  {cm.find(c => c.itemId === i.itemId)!.count.toFixed(1)}/m
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-archive-dust">
        {machine && (
          <div className="flex items-center gap-1.5">
            {machine.iconId && (
              <img
                src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${machine.iconId}.png`}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span>{machine.name}</span>
          </div>
        )}
        <span>{t('factory.craftTime')}: {(recipe.totalProgress / 1000).toFixed(1)}s</span>
      </div>
    </div>
  )
}
