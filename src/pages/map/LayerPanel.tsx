import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { MapTierView } from '../../hooks/useData'

interface LayerPanelProps {
  tiers: MapTierView[]
  activeTier: number | null
  onSelect: (tierId: number | null) => void
}

export default function LayerPanel({ tiers, activeTier, onSelect }: LayerPanelProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)
  if (tiers.length === 0) return null
  return (
    <div className="rounded border border-archive-border bg-archive-file/95 shadow-lg backdrop-blur" data-testid="layer-panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full px-3 py-1.5 text-xs font-medium tracking-wider text-archive-dust uppercase text-left hover:text-archive-ivory"
      >
        {t('map.layerPanelTitle')}
      </button>
      {open && (
        <div className="px-1 pb-1 space-y-0.5 max-h-64 overflow-y-auto">
          <button
            type="button"
            data-testid="layer-item"
            data-tier-id="all"
            onClick={() => onSelect(null)}
            className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
              activeTier === null
                ? 'text-archive-gold bg-archive-gold/10'
                : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-border'
            }`}
          >
            {t('map.layerAll')}
          </button>
          {tiers.map((tier) => (
            <button
              key={tier.tierId}
              type="button"
              data-testid="layer-item"
              data-tier-id={tier.tierId}
              onClick={() => onSelect(tier.tierId)}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                activeTier === tier.tierId
                  ? 'text-archive-gold bg-archive-gold/10'
                  : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-border'
              }`}
            >
              {tier.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
