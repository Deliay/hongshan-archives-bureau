import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLocale } from '../../lib/locale'
import { useI18n } from '../../i18n'
import { useI18nLocales } from '../../hooks/useData'
import { ArchiveSeal } from '../ui/ArchiveSeal'
import { ASSET_BASE } from '../../lib/adapter'

const LANGUAGE_ICON_URL = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/settings/icon_settings_language.png`

type NavLink = {
  label: string
  path: string
}

type NavGroup = {
  label: string
  items: NavLink[]
}

function useNavGroups(): NavGroup[] {
  const { t } = useI18n()
  return [
    {
      label: t('nav.personnel'),
      items: [
        { label: t('nav.operators'), path: '/archive/operators' },
        { label: t('nav.races'), path: '/archive/races' },
        { label: t('nav.factions'), path: '/archive/factions' },
      ],
    },
    {
      label: t('nav.threat'),
      items: [
        { label: t('nav.enemies'), path: '/archive/enemies' },
      ],
    },
    {
      label: t('nav.material'),
      items: [
        { label: t('nav.items'), path: '/archive/items' },
        { label: t('nav.weapons'), path: '/archive/weapons' },
        { label: t('nav.equipment'), path: '/archive/equipment' },
        { label: t('nav.factory'), path: '/archive/factory' },
      ],
    },
    {
      label: t('nav.geography'),
      items: [
        { label: t('nav.areas'), path: '/archive/geography' },
      ],
    },
    {
      label: t('nav.chronicle'),
      items: [
        { label: t('nav.story'), path: '/archive/story' },
        { label: t('nav.updates'), path: '/archive/updates' },
      ],
    },
  ]
}

const LOCALE_LABELS: Record<string, string> = {
  CN: '简中',
  TC: '繁中',
  EN: 'English',
  JP: '日本語',
  KR: '한국어',
  RU: 'Русский',
  MX: 'Español (MX)',
  BR: 'Português',
  DE: 'Deutsch',
  FR: 'Français',
  VN: 'Tiếng Việt',
  TH: 'ไทย',
  ID: 'Bahasa Indonesia',
  IT: 'Italiano',
}

export default function Sidebar() {
  const location = useLocation()
  const { locale, setLocale } = useLocale()
  const { data: locales } = useI18nLocales()
  const [open, setOpen] = useState(false)
  const [localeOpen, setLocaleOpen] = useState(false)
  const { t } = useI18n()
  const navGroups = useNavGroups()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded border border-archive-border bg-archive-ink text-archive-ivory"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <aside className={`fixed top-0 left-0 z-40 h-full w-60 bg-archive-ink border-r border-archive-border flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 border-b border-archive-border">
          <Link to="/archive" className="flex items-center gap-3 text-archive-gold">
            <ArchiveSeal size={36} />
            <span className="font-display font-bold text-lg tracking-wider">{t('site.name')}</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1 text-xs font-medium tracking-wider text-archive-lead uppercase">
                {group.label}
              </div>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = location.pathname.startsWith(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                        active
                          ? 'text-archive-gold bg-archive-gold/10'
                          : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-file'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-archive-border relative">
          <button
            type="button"
            onClick={() => setLocaleOpen(v => !v)}
            className="w-full px-3 py-1.5 rounded text-sm text-archive-dust hover:text-archive-ivory border border-archive-border hover:border-archive-lead transition-colors text-left flex items-center gap-2"
          >
            <img
              src={LANGUAGE_ICON_URL}
              alt=""
              className="w-4 h-4 object-contain opacity-70"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {LOCALE_LABELS[locale] || locale}
          </button>
          {localeOpen && locales && (
            <div className="absolute bottom-full left-3 right-3 mb-1 py-1 rounded border border-archive-border bg-archive-file shadow-lg">
              {locales.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => { setLocale(l); setLocaleOpen(false) }}
                  className={`w-full px-3 py-1.5 text-sm text-left transition-colors flex items-center gap-2 ${
                    l === locale
                      ? 'text-archive-gold bg-archive-gold/10'
                      : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-border'
                  }`}
                >
                  <span className="w-4" />
                  {LOCALE_LABELS[l] || l}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
