import ItemBar from '../Items/ItemBar'
import PartBadge from './PartBadge'
import { formatAttributeShow } from '../../lib/formatText'
import { resolveAttrShow } from '../../lib/attributeShow'
import { useI18n } from '../../i18n'
import type { Equip } from '../../lib/types'
import type { AttrShowMapEntry } from '../../lib/attributeShow'

interface EquipBarProps {
  equip: Equip
  attrShowMap: Record<string, AttrShowMapEntry>
}

export default function EquipBar({ equip, attrShowMap }: EquipBarProps) {
  const { t } = useI18n()
  const unknownFallback = t('common.unknownAttr')

  const baseFormatted = equip.baseAttr
    ? (() => {
      const info = resolveAttrShow(attrShowMap, equip.baseAttr, unknownFallback)
      return {
        name: info.name,
        value: formatAttributeShow({ valueFormat: info.valueFormat, showPercent: info.showPercent }, equip.baseAttr.value),
      }
    })()
    : null

  const attrs = equip.attrs.map(a => {
    const info = resolveAttrShow(attrShowMap, a, unknownFallback)
    return {
      name: info.name,
      value: formatAttributeShow({ valueFormat: info.valueFormat, showPercent: info.showPercent }, a.value),
    }
  })

  return (
    <ItemBar
      itemId={equip.id}
      href={`/archive/equipment/${equip.id}`}
      size="lg"
      badge={<PartBadge partType={equip.partType} />}
    >
      <div className="flex flex-col gap-0.5">
        {baseFormatted && (
          <span className="text-xs text-archive-ivory">{baseFormatted.name} +{baseFormatted.value}</span>
        )}
        {attrs.map((a, i) => (
          <span key={i} className="text-[10px] text-archive-dust">{a.name} +{a.value}</span>
        ))}
      </div>
    </ItemBar>
  )
}
