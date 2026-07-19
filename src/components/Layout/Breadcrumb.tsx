import { Link, useLocation } from 'react-router-dom'
import { useOperator, useWeapon, useRaces, useFactions, useEnemies } from '../../hooks/useData'
import { Badge } from '../ui/Badge'

const LIST_LABEL: Record<string, string> = {
  operators: '干员档案',
  weapons: '武器档案',
  races: '干员种族',
  factions: '干员阵营',
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
  return <span className="text-archive-ivory">{race?.name || id}</span>
}

function FactionName({ id }: { id: string }) {
  const { data: factions } = useFactions()
  const faction = factions?.find(f => f.id === id)
  return <span className="text-archive-ivory">{faction?.name || id}</span>
}

function EnemyName({ id }: { id: string }) {
  const { data: enemies } = useEnemies()
  const enemy = enemies?.find(e => e.id === id)
  return <span className="text-archive-ivory">{enemy?.name || id}</span>
}

function DetailLabel({ listKey, id }: { listKey: string; id: string }) {
  const { data: op } = useOperator(id)
  const { data: wpn } = useWeapon(id)
  if (listKey === 'operators') {
    return <span className="text-archive-ivory">{op?.name || id}</span>
  }
  if (listKey === 'weapons') {
    return <span className="text-archive-ivory">{wpn?.name || id}</span>
  }
  if (listKey === 'races') {
    return <RaceName id={id} />
  }
  if (listKey === 'factions') {
    return <FactionName id={id} />
  }
  if (listKey === 'enemies') {
    return <EnemyName id={id} />
  }
  return <span className="text-archive-ivory">{id}</span>
}

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const listKey = segments[1]
  const detailId = segments[2]

  return (
    <nav className="text-sm text-archive-dust mb-4 flex items-center flex-wrap gap-1">
      <Link to="/archive" className="hover:text-archive-gold transition-colors">档案局</Link>
      {segments.length >= 2 && (
        <>
          <span className="mx-1 text-archive-lead">›</span>
          {segments.length === 2 ? (
            <Badge variant="ghost">{LIST_LABEL[listKey] ?? listKey}</Badge>
          ) : (
            <Link to={`/archive/${listKey}`} className="hover:text-archive-gold transition-colors">{LIST_LABEL[listKey] ?? listKey}</Link>
          )}
        </>
      )}
      {segments.length >= 3 && (
        <>
          <span className="mx-1 text-archive-lead">›</span>
          <DetailLabel listKey={listKey} id={detailId} />
        </>
      )}
    </nav>
  )
}
