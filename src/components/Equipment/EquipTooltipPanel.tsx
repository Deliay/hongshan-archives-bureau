import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { resolveI18n } from '../../lib/adapter'
import { useI18n } from '../../i18n'

interface TooltipEquipAttr {
  attrType: number
  name: string
  value: number
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [equipRaw, itemRaw, _itemI18n, suitRaw, suitI18n, attrMeta, showConfig, attrI18n] = await Promise.all([
        getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
        getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_ItemTable`, () => fetchTableDictAll('ItemTable', locale)),
        getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EquipSuitTable`, () => fetchTableDictAll('EquipSuitTable', locale)),
        getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')),
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', locale)),
      ])
      if (cancelled) return

      const raw = equipRaw[itemId]
      if (!raw) return

      const rarity = itemRaw[itemId]?.rarity ?? 0
      const baseRaw = raw.displayBaseAttrModifier
      const baseAttr = baseRaw ? {
        attrType: baseRaw.attrType ?? 0,
        name: (() => {
          const configItem = showConfig[String(baseRaw.attrType)]?.list?.[0]
          const nameId = String(configItem?.name?.id ?? '')
          return (nameId && attrI18n[nameId]) || attrMeta[String(baseRaw.attrType)]?.iconName?.replace('icon_attribute_', '') || ''
        })(),
        value: baseRaw.attrValue ?? 0,
      } : null

      const attrs = (raw.displayAttrModifiers ?? []).map((a: any) => {
        const configItem = showConfig[String(a.attrType)]?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        return {
          attrType: a.attrType ?? 0,
          name: (nameId && attrI18n[nameId]) || attrMeta[String(a.attrType)]?.iconName?.replace('icon_attribute_', '') || '',
          value: a.attrValue ?? 0,
        }
      })

      const suitId = raw.suitID
      let suitNameStr = ''
      if (suitId && suitRaw[suitId]) {
        suitNameStr = resolveI18n(suitRaw[suitId]?.list?.[0]?.suitName, suitI18n) || suitId
      }

      setEquipData({
        partType: raw.partType ?? 0,
        rarity,
        baseAttr: baseAttr ? { attrType: baseAttr.attrType, name: baseAttr.name, value: baseAttr.value } : null,
        attrs: attrs.map((a: any) => ({ attrType: a.attrType, name: a.name, value: a.value })),
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
          {equipData.baseAttr.name}: {equipData.baseAttr.value}
        </div>
      )}

      {equipData.attrs.length > 0 && (
        <div className="space-y-1">
          {equipData.attrs.map((attr, i) => (
            <div key={`${attr.attrType}-${i}`} className="text-[10px] text-archive-dust">
              {attr.name}: {attr.value}
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
