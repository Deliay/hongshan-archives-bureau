import { useI18n } from '../../i18n'

const PART_NAMES: Record<number, string> = {
  0: 'equipment.partBody',
  1: 'equipment.partHand',
  2: 'equipment.partEdc',
}

export function getPartName(partType: number): string {
  return PART_NAMES[partType] ?? ''
}

export const EQUIPMENT_PART_KEYS = PART_NAMES

interface PartBadgeProps {
  partType: number
}

export default function PartBadge({ partType }: PartBadgeProps) {
  const { t } = useI18n()
  return (
    <span className="rounded bg-archive-ink/80 px-0.5 text-[9px] text-archive-ivory">
      {t(PART_NAMES[partType] ?? '')}
    </span>
  )
}
