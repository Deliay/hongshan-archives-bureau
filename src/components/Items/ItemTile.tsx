import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import RarityFrame from '../RarityFrame'
import ItemIcon from './ItemIcon'
import AmountBadge from './AmountBadge'
import ItemTooltipOverlay from './ItemTooltip'
import type { ReactNode } from 'react'

export type ItemTileSize = 'sm' | 'md' | 'lg' | 'xl'

const DISABLED_TIP_ITEMS = new Set(['item_cbp_exp'])

interface ItemTileProps {
  itemId: string
  size?: ItemTileSize
  name?: string
  rarity?: number
  amount?: number
  badge?: ReactNode
  showName?: boolean
  showTips?: boolean
  plain?: boolean
  href?: string
  className?: string
}

export default function ItemTile({
  itemId,
  size: _size = 'md',
  name: resolvedName,
  rarity: resolvedRarity,
  amount,
  badge,
  showName = true,
  showTips = true,
  plain = false,
  href,
  className: _className,
}: ItemTileProps) {
  const { locale } = useLocale()
  const [itemData, setItemData] = useState<any>(null)
  const [i18nMap, setI18nMap] = useState<Record<string, string> | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale)),
    ]).then(([raw, dict]) => {
      if (cancelled) return
      setItemData(raw[itemId] ?? null)
      setI18nMap(dict)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [itemId, locale])

  const name = resolvedName ?? (itemData?.name ? (i18nMap?.[String(itemData.name.id)] || itemData.name.text || itemId) : itemId)
  const rarity: number = resolvedRarity ?? itemData?.rarity ?? 1

  const tileContent = (
    <RarityFrame
      rarity={rarity}
      name={showName ? name : undefined}
      className="w-full h-full"
    >
      <ItemIcon itemId={itemId} className="w-full h-full" />
      {amount !== undefined && <AmountBadge amount={amount} />}
      {badge != null && badge !== false && <div className="absolute top-0.5 left-0.5">{badge}</div>}
    </RarityFrame>
  )

  if (plain) {
    return (
      <div className="w-full aspect-square rounded border border-archive-border bg-archive-file overflow-hidden">
        {tileContent}
      </div>
    )
  }

  if (href) {
    return (
      <Link to={href} className="w-full aspect-square rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors overflow-hidden">
        {tileContent}
      </Link>
    )
  }

  const canTip = showTips && !DISABLED_TIP_ITEMS.has(itemId)

  return (
    <>
      <button
        type="button"
        onClick={() => { if (canTip) setShowTooltip(v => !v) }}
        className={`w-full aspect-square rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors overflow-hidden ${canTip ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {tileContent}
      </button>
      {showTooltip && (
        <ItemTooltipOverlay itemId={itemId} onClose={() => setShowTooltip(false)} />
      )}
    </>
  )
}
