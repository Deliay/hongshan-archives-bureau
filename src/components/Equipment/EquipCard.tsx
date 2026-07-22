import type { Equip } from '../../lib/types'
import ItemTile from '../Items/ItemTile'
import { getPartName } from './PartBadge'
import { useI18n } from '../../i18n'

interface EquipCardProps {
  equip: Equip
  interactive?: 'link' | 'tooltip'
}

export default function EquipCard({ equip, interactive = 'link' }: EquipCardProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-1">
      <ItemTile
        itemId={equip.iconId}
        size="md"
        showName={false}
        href={interactive === 'link' ? `/archive/equipment/${equip.id}` : undefined}
        showTips={interactive === 'tooltip'}
      />
      <span className="text-[11px] text-archive-ivory text-center leading-tight line-clamp-2">{equip.name}</span>
      <span className="text-[9px] text-archive-lead">{t(getPartName(equip.partType))}</span>
    </div>
  )
}
