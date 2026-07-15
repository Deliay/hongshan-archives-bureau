import { useState, useEffect, useRef } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import ItemIcon from './ItemIcon'

const RARITY_COLORS: Record<number, string> = {
  1: '#a0a0a0',
  2: '#dcdc00',
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

interface ItemTooltipOverlayProps {
  itemId: string
  onClose: () => void
}

export default function ItemTooltipOverlay({ itemId, onClose }: ItemTooltipOverlayProps) {
  const { locale } = useLocale()
  const [itemData, setItemData] = useState<any>(null)
  const [fullBottle, setFullBottle] = useState<{ liquidId: string; liquidCapacity: number } | null>(null)
  const [itemChest, setItemChest] = useState<{ rewardIdList?: string[] } | null>(null)
  const [obtainWayMap, setObtainWayMap] = useState<Record<string, any>>({})
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [itemRaw, bottleRaw, chestRaw, jumpRaw] = await Promise.all([
        getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
        getCachedData<Record<string, any>>('FullBottleTable', () => fetchTableAll('FullBottleTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('UsableItemChestTable', () => fetchTableAll('UsableItemChestTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('SystemJumpTable', () => fetchTableAll('SystemJumpTable').catch(() => ({}))),
      ])
      if (cancelled) return

      setItemData(itemRaw[itemId] ?? null)

      const bottle = bottleRaw[itemId]
      if (bottle?.liquidId) {
        setFullBottle({ liquidId: bottle.liquidId, liquidCapacity: bottle.liquidCapacity ?? 0 })
      }

      const chest = chestRaw[itemId]
      if (chest?.rewardIdList?.length) {
        setItemChest(chest)
      }

      const map: Record<string, any> = {}
      const entry = itemRaw[itemId]
      if (entry?.obtainWayIds) {
        for (const wayId of entry.obtainWayIds) {
          const way = jumpRaw[wayId]
          if (way) map[wayId] = way
        }
      }
      setObtainWayMap(map)
    }

    load()
    return () => { cancelled = true }
  }, [itemId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!itemData) return null

  function localeText(ref: any): string {
    if (!ref) return ''
    if (ref[locale]) return ref[locale]
    if (ref.CN) return ref.CN
    if (ref.text) return ref.text
    return ''
  }

  const name = localeText(itemData.name) || itemId
  const rarity: number = itemData.rarity ?? 1
  const desc = localeText(itemData.desc)
  const decoDesc = localeText(itemData.decoDesc)
  const noObtainHint = localeText(itemData.noObtainWayHint)
  const obtainWayIds: string[] = itemData.obtainWayIds ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={overlayRef}
        className="max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto rounded border border-[#2A2A32] bg-[#1A1B23] shadow-2xl"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="sticky top-0 bg-[#1A1B23] border-b border-[#2A2A32] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ItemIcon itemId={itemId} className="w-10 h-10" />
            <div>
              <h3 className="text-sm font-medium text-[#E8E6E3]">{name}</h3>
              <div className="h-0.5 w-full rounded-full mt-1" style={{ backgroundColor: RARITY_COLORS[rarity] || '#a0a0a0', width: `${rarity * 12}px` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5A5A62] hover:text-[#E8E6E3] transition-colors text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {fullBottle && (
            <div className="flex items-center gap-2 p-2 rounded bg-[#0F0F12] border border-[#2A2A32]">
              <ItemIcon itemId={fullBottle.liquidId} className="w-8 h-8" />
              <span className="text-xs text-[#8B8982]">
                已装盛 {fullBottle.liquidCapacity} 单位
              </span>
            </div>
          )}

          {desc && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">物品效果</div>
              <div className="text-xs text-[#E8E6E3] leading-relaxed">
                <RichText text={desc} />
              </div>
            </div>
          )}

          {decoDesc && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">物品描述</div>
              <div className="text-xs text-[#8B8982] italic leading-relaxed">
                <RichText text={decoDesc} />
              </div>
            </div>
          )}

          {noObtainHint && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">制作方式</div>
              <div className="text-xs text-[#5A5A62] leading-relaxed">{noObtainHint}</div>
            </div>
          )}

          {obtainWayIds.length > 0 && Object.keys(obtainWayMap).length > 0 && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">获取方式</div>
              <ul className="space-y-1">
                {obtainWayIds.map((wayId) => {
                  const way = obtainWayMap[wayId]
                  if (!way) return null
                  const wayDesc = localeText(way.desc)
                  return (
                    <li key={wayId} className="flex items-center gap-2 text-xs text-[#E8E6E3]">
                      {way.iconId && (
                        <img
                          src={`${'https://endfield-assets.fffdan.com/vfs/Bundle/file'}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemtips/${way.iconId}`}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <span>{wayDesc}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {itemChest?.rewardIdList && itemChest.rewardIdList.length > 0 && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">包含内容</div>
              <div className="flex flex-wrap gap-2">
                {itemChest.rewardIdList.map((rewardId) => (
                  <span key={rewardId} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#5A5A62] font-mono">
                    {rewardId}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-[#5A5A62] font-mono pt-1 border-t border-[#2A2A32]">
            {itemId}
          </div>
        </div>
      </div>
    </div>
  )
}
