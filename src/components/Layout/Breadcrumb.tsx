import { Link, useLocation } from 'react-router-dom'
import { useOperator, useWeapon, useRaces, useFactions } from '../../hooks/useData'

const LIST_LABEL: Record<string, string> = {
  operators: '干员档案',
  weapons: '武器档案',
  races: '种族一览',
  factions: '势力阵营',
  geography: '地区地理',
  enemies: '敌人图鉴',
  equipment: '装备系统',
  items: '道具材料',
  factory: '工厂系统',
  story: '剧情记录',
}

function RaceName({ id }: { id: string }) {
  const { data: races } = useRaces()
  const race = races?.find(r => r.id === id)
  return <span className="text-[#E8E6E3]">{race?.name || id}</span>
}

function FactionName({ id }: { id: string }) {
  const { data: factions } = useFactions()
  const faction = factions?.find(f => f.id === id)
  return <span className="text-[#E8E6E3]">{faction?.name || id}</span>
}

function DetailLabel({ listKey, id }: { listKey: string; id: string }) {
  const { data: op } = useOperator(id)
  const { data: wpn } = useWeapon(id)
  if (listKey === 'operators') {
    return <span className="text-[#E8E6E3]">{op?.name || id}</span>
  }
  if (listKey === 'weapons') {
    return <span className="text-[#E8E6E3]">{wpn?.name || id}</span>
  }
  if (listKey === 'races') {
    return <RaceName id={id} />
  }
  if (listKey === 'factions') {
    return <FactionName id={id} />
  }
  return <span className="text-[#E8E6E3]">{id}</span>
}

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const listKey = segments[1]
  const detailId = segments[2]

  return (
    <nav className="text-sm text-[#8B8982] mb-4">
      <Link to="/archive" className="hover:text-[#C9A96E] transition-colors">档案馆</Link>
      {segments.length >= 2 && (
        <>
          <span className="mx-2">/</span>
          {segments.length === 2 ? (
            <span className="text-[#E8E6E3]">{LIST_LABEL[listKey] ?? listKey}</span>
          ) : (
            <Link to={`/archive/${listKey}`} className="hover:text-[#C9A96E] transition-colors">{LIST_LABEL[listKey] ?? listKey}</Link>
          )}
        </>
      )}
      {segments.length >= 3 && (
        <>
          <span className="mx-2">/</span>
          <DetailLabel listKey={listKey} id={detailId} />
        </>
      )}
    </nav>
  )
}
