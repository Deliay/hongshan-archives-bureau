import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ASSET_BASE } from '../../lib/adapter'
import { useI18n } from '../../i18n'
import ItemTooltipOverlay from '../Items/ItemTooltip'
import type { Equip } from '../../lib/types'

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

const PART_NAMES: Record<number, string> = {
  0: 'equipment.partBody',
  1: 'equipment.partHand',
  2: 'equipment.partEdc',
}

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

interface EquipCardProps {
  equip: Equip
  interactive?: 'link' | 'tooltip'
}

export default function EquipCard({ equip, interactive = 'link' }: EquipCardProps) {
  const { t } = useI18n()
  const [showTooltip, setShowTooltip] = useState(false)

  const cardContent = (
    <>
      <img
        src={getItemIconUrl(equip.iconId)}
        alt=""
        className="w-12 h-12 object-cover bg-archive-border"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: RARITY_COLORS[equip.rarity] || '#a0a0a0' }} />
      <span className="text-[11px] text-archive-ivory text-center leading-tight line-clamp-2">{equip.name}</span>
      <span className="text-[9px] text-archive-lead">{t(PART_NAMES[equip.partType] ?? '')}</span>
    </>
  )

  if (interactive === 'tooltip') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowTooltip(v => !v)}
          className="flex flex-col items-center gap-1 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors cursor-pointer"
        >
          {cardContent}
        </button>
        {showTooltip && (
          <ItemTooltipOverlay
            itemId={equip.id}
            onClose={() => setShowTooltip(false)}
          />
        )}
      </>
    )
  }

  return (
    <Link
      to={`/archive/equipment/${equip.id}`}
      className="flex flex-col items-center gap-1 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors"
    >
      {cardContent}
    </Link>
  )
}
