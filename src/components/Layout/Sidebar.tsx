import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLocale } from '../../lib/locale'
import { useI18nLocales } from '../../hooks/useData'

const NAV_ITEMS = [
  { label: '干员档案', path: '/archive/operators' },
  { label: '武器档案', path: '/archive/weapons' },
  { label: '敌人图鉴', path: '/archive/enemies' },
  { label: '道具材料', path: '/archive/items' },
  { label: '种族一览', path: '/archive/races' },
  { label: '势力阵营', path: '/archive/factions' },
  { label: '地区地理', path: '/archive/geography' },
  { label: '装备系统', path: '/archive/equipment' },
  { label: '工厂系统', path: '/archive/factory' },
  { label: '剧情记录', path: '/archive/story' },
  { label: '更新日志', path: '/archive/updates' },
]

const LOCALE_LABELS: Record<string, string> = {
  CN: '简中',
  TC: '繁中',
  EN: 'English',
  JP: '日本語',
  KR: '한국어',
  RU: 'Русский',
}

export default function Sidebar() {
  const location = useLocation()
  const { locale, setLocale } = useLocale()
  const { data: locales } = useI18nLocales()
  const [open, setOpen] = useState(false)
  const [localeOpen, setLocaleOpen] = useState(false)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded border border-[#2A2A32] bg-[#0F0F12] text-[#E8E6E3]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <aside className={`fixed top-0 left-0 z-40 h-full w-56 bg-[#0F0F12] border-r border-[#2A2A32] flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 border-b border-[#2A2A32]">
          <Link to="/archive" className="text-[#C9A96E] font-bold text-lg tracking-wider">
            宏山档案馆
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'text-[#C9A96E] bg-[#C9A96E]/10'
                    : 'text-[#8B8982] hover:text-[#E8E6E3] hover:bg-[#1A1B23]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[#2A2A32] relative">
          <button
            type="button"
            onClick={() => setLocaleOpen(v => !v)}
            className="w-full px-3 py-1.5 rounded text-sm text-[#8B8982] hover:text-[#E8E6E3] border border-[#2A2A32] hover:border-[#5A5A62] transition-colors text-left"
          >
            {LOCALE_LABELS[locale] || locale}
          </button>
          {localeOpen && locales && (
            <div className="absolute bottom-full left-3 right-3 mb-1 py-1 rounded border border-[#2A2A32] bg-[#1A1B23] shadow-lg">
              {locales.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => { setLocale(l); setLocaleOpen(false) }}
                  className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                    l === locale
                      ? 'text-[#C9A96E] bg-[#C9A96E]/10'
                      : 'text-[#8B8982] hover:text-[#E8E6E3] hover:bg-[#2A2A32]'
                  }`}
                >
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
