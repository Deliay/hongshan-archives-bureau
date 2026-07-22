import ItemBar from '../Items/ItemBar'
import type { Weapon } from '../../lib/types'

interface WeaponBarProps {
  weapon: Weapon
  skillNames: string[]
}

export default function WeaponBar({ weapon, skillNames }: WeaponBarProps) {
  const skills = skillNames.slice(0, 3)
  return (
    <ItemBar itemId={weapon.id} href={`/archive/weapons/${weapon.id}`} size="lg">
      <div className="flex flex-col gap-0.5">
        {skills.map((n, i) => (
          <span key={i} className={`truncate text-[11px] ${i === 2 ? 'text-archive-gold' : 'text-archive-dust'}`}>{n}</span>
        ))}
      </div>
    </ItemBar>
  )
}
