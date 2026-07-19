import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PROFESSION_MAP, ELEMENT_MAP } from '../../data/constants'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'

export default function ProfessionOverview() {
  const { t } = useI18n()
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('profession.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.professions}</Badge>
      </div>

      <h3 className="text-sm font-medium text-archive-gold mb-2 tracking-wider">{t('profession.profession')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {Object.entries(PROFESSION_MAP).map(([id, name]) => (
          <Link
            key={id}
            to={`/archive/operators?profession=${name}`}
            className="p-3 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-all"
          >
            <p className="text-sm text-archive-ivory">{name}</p>
          </Link>
        ))}
      </div>

      <h3 className="text-sm font-medium text-archive-gold mb-2 tracking-wider">{t('profession.element')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(ELEMENT_MAP).map(([id, el]) => (
          <Link
            key={id}
            to={`/archive/operators?element=${el.name}`}
            className="p-3 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: el.color }} />
              <span className="text-sm text-archive-ivory">{el.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
