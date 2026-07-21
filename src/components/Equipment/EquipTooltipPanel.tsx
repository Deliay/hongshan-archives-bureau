import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { resolveI18n } from '../../lib/adapter'
import { formatAttributeShow } from '../../lib/formatText'
import { getAttributeShowMap, resolveAttrShow } from '../../lib/attributeShow'
import { useI18n } from '../../i18n'
import type { EquipAttr } from '../../lib/types'

interface TooltipEquipAttr {
  attr: EquipAttr
  name: string
  valueFormat: string
  showPercent: boolean
}

interface TooltipEquip {
  partType: number
  rarity: number
  baseAttr: TooltipEquipAttr | null
  attrs: TooltipEquipAttr[]
  suitName: string
}

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

interface EquipTooltipPanelProps {
  itemId: string
  onNavigate?: () => void
}

export default function EquipTooltipPanel({ itemId, onNavigate }: EquipTooltipPanelProps) {
  const { locale } = useLocale()
  const { t } = useI18n()
  const [equipData, setEquipData] = useState<TooltipEquip | null>(null)
  const unknownFallback = t('common.unknownAttr')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [equipRaw, itemRaw, suitRaw, suitI18n, attrShowMap] = await Promise.all([
        getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
        getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
        getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EquipSuitTable`, () => fetchTableDictAll('EquipSuitTable', locale)),
        getAttributeShowMap(locale),
      ])
      if (cancelled) return

      const raw = equipRaw[itemId]
      if (!raw) return

      const rarity = itemRaw[itemId]?.rarity ?? 0
      const baseRaw = raw.displayBaseAttrModifier
      const baseAttrEquipAttr: EquipAttr | null = baseRaw ? {
        attrType: baseRaw.attrType ?? 0,
        value: baseRaw.attrValue ?? 0,
        enhancedValues: [],
        modifierType: baseRaw.modifierType ?? 0,
        compositeAttr: baseRaw.compositeAttr ?? '',
      } : null
      const baseAttr = baseAttrEquipAttr ? (() => {
        const info = resolveAttrShow(attrShowMap, baseAttrEquipAttr, unknownFallback)
        return { attr: baseAttrEquipAttr, name: info.name, valueFormat: info.valueFormat, showPercent: info.showPercent }
      })() : null

      const attrs: TooltipEquipAttr[] = (raw.displayAttrModifiers ?? []).map((a: any) => {
        const equipAttr: EquipAttr = {
          attrType: a.attrType ?? 0,
          value: a.attrValue ?? 0,
          enhancedValues: a.enhancedAttrValues ?? [],
          modifierType: a.modifierType ?? 0,
          compositeAttr: a.compositeAttr ?? '',
        }
        const info = resolveAttrShow(attrShowMap, equipAttr, unknownFallback)
        return { attr: equipAttr, name: info.name, valueFormat: info.valueFormat, showPercent: info.showPercent }
      })

      const suitId = raw.suitID
      let suitNameStr = ''
      if (suitId && suitRaw[suitId]) {
        suitNameStr = resolveI18n(suitRaw[suitId]?.list?.[0]?.suitName, suitI18n) || suitId
      }

      setEquipData({
        partType: raw.partType ?? 0,
        rarity,
        baseAttr,
        attrs,
        suitName: suitNameStr,
      })
    }
    load()
    return () => { cancelled = true }
  }, [itemId, locale])

  if (!equipData) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-archive-lead">{t(PART_NAMES[equipData.partType] ?? '')}</span>
        <span className="text-xs" style={{ color: RARITY_COLORS[equipData.rarity] || '#888' }}>
          {'★'.repeat(equipData.rarity)}
        </span>
      </div>

      {equipData.baseAttr && (
        <div className="text-[10px] text-archive-ivory">
          {equipData.baseAttr.name}: {formatAttributeShow({ valueFormat: equipData.baseAttr.valueFormat, showPercent: equipData.baseAttr.showPercent }, equipData.baseAttr.attr.value)}
        </div>
      )}

      {equipData.attrs.length > 0 && (
        <div className="space-y-1">
          {equipData.attrs.map((attr, i) => (
            <div key={`${attr.attr.attrType}-${i}`} className="text-[10px] text-archive-dust">
              {attr.name}: {formatAttributeShow({ valueFormat: attr.valueFormat, showPercent: attr.showPercent }, attr.attr.value)}
            </div>
          ))}
        </div>
      )}

      {equipData.suitName && (
        <div className="text-[10px] text-archive-gold">{equipData.suitName}</div>
      )}

      <Link
        to={`/archive/equipment/${itemId}`}
        onClick={onNavigate}
        className="block text-[10px] text-archive-gold hover:underline"
      >
        {t('equipment.viewDetail')}
      </Link>
    </div>
  )
}
