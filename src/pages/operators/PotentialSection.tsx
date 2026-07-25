import { RichText } from '../../lib/richText'
import ItemTile from '../../components/Items/ItemTile'
import type { PotentialLevel } from '../../lib/types'

interface PotentialSectionProps {
  levels: PotentialLevel[]
}

export default function PotentialSection({ levels }: PotentialSectionProps) {
  return (
    <div className="space-y-3">
      {levels.map((pl) => (
        <div key={pl.level} className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-archive-gold/20 text-archive-gold text-xs flex items-center justify-center shrink-0">
                {pl.level}
              </span>
              <span className="text-sm font-medium text-archive-ivory">
                {pl.name || `Potential ${pl.level}`}
              </span>
            </div>
            {pl.requiredItem.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pl.requiredItem.map((item) => (
                  <ItemTile key={item.id} itemId={item.id} amount={item.count} showName={false} size="sm" />
                ))}
              </div>
            )}
          </div>
          {pl.description && (
            <p className="text-xs text-archive-dust mb-2"><RichText text={pl.description} /></p>
          )}
          {pl.portraitUrl && (
            <img
              src={pl.portraitUrl}
              alt={pl.name}
              className="w-full rounded mt-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
