import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import ItemIcon from './ItemIcon'
import ItemTooltipOverlay from './ItemTooltip'

const DISABLED_TIP_ITEMS = new Set(['item_cbp_exp'])

const RARITY_COLORS: Record<number, string> = {
  1: '#a0a0a0',
  2: '#dcdc00',
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

function toCountString(amount: number): string {
  return amount > 10000 ? `${(amount / 1000).toFixed(1)}k` : `${amount}`
}

interface ItemPanelProps {
  itemId: string
  amount?: number
  showAmount?: boolean
  showTips?: boolean
  showName?: boolean
  className?: string
  iconClassName?: string
}

export default function ItemPanel({
  itemId,
  amount,
  showAmount = true,
  showTips = true,
  showName = true,
  className,
  iconClassName,
}: ItemPanelProps) {
  const { locale } = useLocale()
  const [itemData, setItemData] = useState<any>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')).then((raw) => {
      if (cancelled) return
      setItemData(raw[itemId] ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [itemId])

  const name = itemData?.name
    ? (itemData.name[locale] || itemData.name.CN || itemData.text || '')
    : itemId
  const rarity: number = itemData?.rarity ?? 1

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (showTips && !DISABLED_TIP_ITEMS.has(itemId)) {
            setShowTooltip((v) => !v)
          }
        }}
        className={`flex flex-col items-center gap-1 p-2 rounded border border-[#2A2A32] bg-[#1A1B23] hover:border-[#C9A96E]/40 transition-colors text-left ${showTips && !DISABLED_TIP_ITEMS.has(itemId) ? 'cursor-pointer' : 'cursor-default'} ${className ?? ''}`}
      >
        <ItemIcon itemId={itemId} className={iconClassName ?? 'w-12 h-12'} />
        {showAmount && amount !== undefined && (
          <span className="text-[10px] text-[#8B8982] font-mono">{toCountString(amount)}</span>
        )}
        <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: RARITY_COLORS[rarity] || '#a0a0a0' }} />
        {showName && (
          <span className="text-[10px] text-[#E8E6E3] text-center leading-tight line-clamp-2">{name}</span>
        )}
      </button>

      {showTooltip && (
        <ItemTooltipOverlay
          itemId={itemId}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </>
  )
}
