import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useOperator, useWeapon, useRaces, useFactions, useEnemies, useEquips } from '../../hooks/useData'
import { Badge } from '../ui/Badge'

function useListLabel(): Record<string, string> {
  const { t } = useI18n()
  return {
    operators: t('nav.operators'),
    weapons: t('nav.weapons'),
    races: t('nav.races'),
    factions: t('nav.factions'),
    geography: t('nav.areas'),
    enemies: t('nav.enemies'),
    equipment: t('nav.equipment'),
    items: t('nav.items'),
    factory: t('nav.factory'),
    search: t('nav.search'),
    story: t('nav.story'),
    updates: t('nav.updates'),
    professions: t('profession.title'),
  }
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

function EquipmentName({ id }: { id: string }) {
  const { data } = useEquips()
  const equip = data?.equips.find(e => e.id === id)
  return <span className="text-archive-ivory">{equip?.name || id}</span>
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
  if (listKey === 'equipment') {
    return <EquipmentName id={id} />
  }
  return <span className="text-archive-ivory">{id}</span>
}

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const listLabel = useListLabel()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const listKey = segments[1]
  const detailId = segments[2]

  return (
    <nav className="text-sm text-archive-dust mb-4 flex items-center flex-wrap gap-1">
      <Link to="/archive" className="hover:text-archive-gold transition-colors">{t('nav.archive')}</Link>
      {segments.length >= 2 && (
        <>
          <span className="mx-1 text-archive-lead">›</span>
          {segments.length === 2 ? (
            <Badge variant="ghost">{listLabel[listKey] ?? listKey}</Badge>
          ) : (
            <Link to={`/archive/${listKey}`} className="hover:text-archive-gold transition-colors">{listLabel[listKey] ?? listKey}</Link>
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
