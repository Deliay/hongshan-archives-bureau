import { useState, useEffect, useRef } from 'react'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import ItemIcon from './ItemIcon'
import { resolveI18n, ASSET_BASE } from '../../lib/adapter'
import { ITEM_TYPE } from '../../data/constants'
import WeaponSkillPanel from '../Weapons/WeaponSkillPanel'
import RewardPanel from './RewardPanel'

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
  const [i18nMap, setI18nMap] = useState<Record<string, string> | null>(null)
  const [fullBottle, setFullBottle] = useState<{ liquidId: string; liquidCapacity: number } | null>(null)
  const [itemChest, setItemChest] = useState<{ rewardIdList?: string[] } | null>(null)
  const [rewardTable, setRewardTable] = useState<Record<string, any> | null>(null)
  const [obtainWayMap, setObtainWayMap] = useState<Record<string, any>>({})
  const [jumpI18nMap, setJumpI18nMap] = useState<Record<string, string> | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [itemRaw, i18nRaw, bottleRaw, chestRaw, jumpRaw, jumpI18nRaw] = await Promise.all([
        getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale)),
        getCachedData<Record<string, any>>('FullBottleTable', () => fetchTableAll('FullBottleTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('UsableItemChestTable', () => fetchTableAll('UsableItemChestTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('SystemJumpTable', () => fetchTableAll('SystemJumpTable').catch(() => ({}))),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_SystemJumpTable`, () => fetchTableDictAll('SystemJumpTable', locale)).catch(() => ({})),
      ])
      if (cancelled) return

      setItemData(itemRaw[itemId] ?? null)
      setI18nMap(i18nRaw)
      setJumpI18nMap(jumpI18nRaw)

      const bottle = bottleRaw[itemId]
      if (bottle?.liquidId) {
        setFullBottle({ liquidId: bottle.liquidId, liquidCapacity: bottle.liquidCapacity ?? 0 })
      }

      const chest = chestRaw[itemId]
      if (chest?.rewardIdList?.length) {
        setItemChest(chest)
        const rewardRaw = await getCachedData<Record<string, any>>('RewardTable', () => fetchTableAll('RewardTable'))
        if (!cancelled) setRewardTable(rewardRaw)
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
  }, [itemId, locale])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!itemData || !i18nMap) return null

  const name = resolveI18n(itemData.name, i18nMap) || itemId
  const rarity: number = itemData.rarity ?? 1
  const desc = resolveI18n(itemData.desc, i18nMap)
  const decoDesc = resolveI18n(itemData.decoDesc, i18nMap)
  const noObtainHint = resolveI18n(itemData.noObtainWayHint, i18nMap)
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
                  const wayDesc = resolveI18n(way.desc, jumpI18nMap ?? undefined)
                  return (
                    <li key={wayId} className="flex items-center gap-2 text-xs text-[#E8E6E3]">
                      {way.iconId && (
                        <img
                          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemtips/${way.iconId}.png`}
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

          {itemChest?.rewardIdList && itemChest.rewardIdList.length > 0 && rewardTable && (
            <RewardPanel rewardIds={itemChest.rewardIdList} rewardTable={rewardTable} />
          )}

          {itemData && Number(itemData.type) === ITEM_TYPE.Weapon && (
            <div>
              <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">武器技能</div>
              <WeaponSkillPanel weaponId={itemId} />
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
