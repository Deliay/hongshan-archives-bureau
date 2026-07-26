import ItemTile from '../Items/ItemTile'
import { ASSET_BASE } from '../../lib/adapter'
import type { FactoryRecipe, FactoryMachine } from '../../lib/factory/types'

interface RecipeRowProps {
  recipe: FactoryRecipe
  machine?: FactoryMachine
  highlightItemId?: string
}

export default function RecipeCard({ recipe, machine, highlightItemId }: RecipeRowProps) {
  const timeSec = (recipe.totalProgress / 1000).toFixed(1)

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded border border-archive-border bg-archive-file">
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {recipe.ingredients.map(i => (
          <ItemTile
            key={i.itemId}
            itemId={i.itemId}
            amount={i.count}
            size="md"
            className={highlightItemId === i.itemId ? 'ring-1 ring-archive-gold' : ''}
          />
        ))}
      </div>

      <div className="flex flex-col items-center shrink-0 min-w-[60px]">
        <div className="flex items-center gap-1 text-archive-gold">
          <span className="text-[10px]">→</span>
        </div>
        <span className="text-[10px] text-archive-lead whitespace-nowrap">{timeSec}s</span>
        {machine && (
          <div className="flex items-center gap-0.5">
            {machine.iconId && (
              <img
                src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/${machine.iconId}.png`}
                alt=""
                className="w-3 h-3 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span className="text-[9px] text-archive-lead truncate max-w-[60px]">{machine.name}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {recipe.outcomes.map(o => (
          <ItemTile
            key={o.itemId}
            itemId={o.itemId}
            amount={o.count}
            size="md"
            className={highlightItemId === o.itemId ? 'ring-1 ring-archive-gold' : ''}
          />
        ))}
      </div>
    </div>
  )
}
