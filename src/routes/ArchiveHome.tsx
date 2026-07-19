import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useI18n } from '../i18n'

function useModuleGroups() {
  const { t } = useI18n()
  return [
    {
      label: t('nav.personnel'),
      desc: t('nav.personnelDesc'),
      modules: [
        { label: t('nav.operators'), path: '/archive/operators', desc: t('nav.operatorsDesc') },
        { label: t('nav.races'), path: '/archive/races', desc: t('nav.racesDesc') },
        { label: t('nav.factions'), path: '/archive/factions', desc: t('nav.factionsDesc') },
      ],
    },
    {
      label: t('nav.threat'),
      desc: t('nav.threatDesc'),
      modules: [
        { label: t('nav.enemies'), path: '/archive/enemies', desc: t('nav.enemiesDesc') },
      ],
    },
    {
      label: t('nav.material'),
      desc: t('nav.materialDesc'),
      modules: [
        { label: t('nav.items'), path: '/archive/items', desc: t('nav.itemsDesc') },
        { label: t('nav.weapons'), path: '/archive/weapons', desc: t('nav.weaponsDesc') },
        { label: t('nav.equipment'), path: '/archive/equipment', desc: t('nav.equipmentDesc') },
        { label: t('nav.factory'), path: '/archive/factory', desc: t('nav.factoryDesc') },
      ],
    },
    {
      label: t('nav.geography'),
      desc: t('nav.geographyDesc'),
      modules: [
        { label: t('nav.areas'), path: '/archive/geography', desc: t('nav.areasDesc') },
      ],
    },
    {
      label: t('nav.chronicle'),
      desc: t('nav.chronicleDesc'),
      modules: [
        { label: t('nav.story'), path: '/archive/story', desc: t('nav.storyDesc') },
        { label: t('nav.updates'), path: '/archive/updates', desc: t('nav.updatesDesc') },
      ],
    },
  ]
}

export default function ArchiveHome() {
  const { t } = useI18n()
  const groups = useModuleGroups()
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl font-bold text-archive-ivory mb-2">{t('site.homeTitle')}</h2>
        <p className="text-sm text-archive-dust">{t('site.homeSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.label} className="group flex flex-col">
            <div className="mb-4">
              <h3 className="font-display text-lg font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
                {group.label}
              </h3>
              <p className="text-sm text-archive-lead mt-1">{group.desc}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-archive-border space-y-2">
              {group.modules.map((m) => (
                <Link
                  key={m.path}
                  to={m.path}
                  className="flex items-center justify-between text-sm text-archive-dust hover:text-archive-gold transition-colors"
                >
                  <span>{m.label}</span>
                  <span className="text-xs text-archive-lead">{m.desc}</span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
