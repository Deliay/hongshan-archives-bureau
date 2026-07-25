import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Badge } from '../../components/ui/Badge'

export default function FactoryLayout() {
  const { t } = useI18n()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="gold">HSA-FAC</Badge>
        <h1 className="font-display text-2xl font-bold text-archive-ivory">{t('nav.factory')}</h1>
      </div>
      <nav className="flex gap-1 mb-6 border-b border-archive-border">
        <NavLink
          to="/archive/factory/recipes"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'text-archive-gold border-archive-gold'
                : 'text-archive-dust border-transparent hover:text-archive-ivory'
            }`
          }
          end
        >
          {t('factory.recipes')}
        </NavLink>
        <NavLink
          to="/archive/factory/chains"
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'text-archive-gold border-archive-gold'
                : 'text-archive-dust border-transparent hover:text-archive-ivory'
            }`
          }
        >
          {t('factory.chains')}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
