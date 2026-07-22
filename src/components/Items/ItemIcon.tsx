import { useState, useEffect } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll } from '../../lib/api'
import { getItemIconUrl } from '../../lib/icons'

interface FullBottleData {
  liquidId?: string
  liquidCapacity?: number
}

interface ItemIconProps {
  itemId: string
  className?: string
  imgClassName?: string
  liquidClassName?: string
}

export default function ItemIcon({ itemId, className, imgClassName, liquidClassName }: ItemIconProps) {
  const [iconId, setIconId] = useState<string | null>(null)
  const [liquidId, setLiquidId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')).then((raw) => {
      if (cancelled) return
      const entry = raw[itemId]
      if (entry) {
        setIconId(entry.iconId ?? entry.iconCompositeId ?? itemId)
      } else {
        setIconId(itemId)
      }
    }).catch(() => {
      if (!cancelled) setIconId(itemId)
    })

    getCachedData<Record<string, any>>('FullBottleTable', () => fetchTableAll('FullBottleTable').catch(() => ({}))).then((raw) => {
      if (cancelled) return
      const bottle = raw[itemId] as FullBottleData | undefined
      if (bottle?.liquidId) {
        setLiquidId(bottle.liquidId)
      }
    }).catch(() => {})

    return () => { cancelled = true }
  }, [itemId])

  if (!iconId) return <div className={`bg-archive-border animate-pulse ${className ?? 'w-12 h-12'}`} />

  return (
    <div className={`relative ${className ?? 'w-12 h-12'}`}>
      <img
        src={getItemIconUrl(iconId)}
        alt=""
        className={`w-full h-full object-cover bg-archive-border ${imgClassName ?? ''}`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {liquidId && (
        <img
          src={getItemIconUrl(liquidId)}
          alt=""
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain ${liquidClassName ?? 'w-1/2'}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
    </div>
  )
}
