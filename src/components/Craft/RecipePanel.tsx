import ItemPanel from '../Items/ItemPanel'
import { useI18n } from '../../i18n'
import type { RecipeEntry } from '../../lib/types'

interface RecipePanelProps {
  recipes: RecipeEntry[]
  className?: string
}

export default function RecipePanel({ recipes, className }: RecipePanelProps) {
  const { t } = useI18n()

  if (recipes.length === 0) return null

  return (
    <div className={`flex flex-wrap items-start gap-3 ${className ?? ''}`}>
      {recipes.map((recipe) => (
          <div key={recipe.chainId || `${recipe.formulaId}-${recipe.level}`} className="p-3 rounded border border-archive-border bg-archive-file w-fit max-w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-archive-dust uppercase tracking-wide">{recipe.level}</span>
            {recipe.isDefault && (
              <span className="text-[10px] text-archive-gold">{t('equipment.recipeDefault')}</span>
            )}
          </div>
          {recipe.materials.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {recipe.materials.map((mat, i) => (
                <ItemPanel
                  key={`${mat.itemId}-${i}`}
                  itemId={mat.itemId}
                  amount={mat.count}
                  showName={false}
                  iconClassName="w-8 h-8"
                  className="w-16"
                />
              ))}
            </div>
          )}
          {recipe.goldId && recipe.goldCount > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <ItemPanel
                itemId={recipe.goldId}
                amount={recipe.goldCount}
                showName={false}
                iconClassName="w-5 h-5"
                className="w-12"
              />
            </div>
          )}
          {recipe.unlockType !== 0 && (
            <div className="text-[10px] text-archive-lead">{t('equipment.recipeUnlock')}</div>
          )}
        </div>
      ))}
    </div>
  )
}
