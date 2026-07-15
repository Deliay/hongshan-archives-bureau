import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLocale } from '../../lib/locale'
import { useI18nLocales } from '../../hooks/useData'

const NAV_ITEMS = [
  { label: '干员档案', path: '/archive/operators' },
  { label: '武器档案', path: '/archive/weapons' },
  { label: '种族一览', path: '/archive/races' },
  { label: '势力阵营', path: '/archive/factions' },
  { label: '地区地理', path: '/archive/geography' },
  { label: '敌人图鉴', path: '/archive/enemies' },
  { label: '装备系统', path: '/archive/equipment' },
  { label: '道具材料', path: '/archive/items' },
  { label: '工厂系统', path: '/archive/factory' },
  { label: '剧情记录', path: '/archive/story' },
  { label: '更新日志', path: '/archive/updates' },
]

const LOCALE_LABELS: Record<string, string> = {
  CN: '简中', TC: '繁中', EN: 'English',
  JP: '日本語', KR: '한국어', RU: 'Русский',
}

export default function TopNav() {
  const location = useLocation()
  const { locale, setLocale } = useLocale()
  const { data: locales } = useI18nLocales()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F0F12]/80 backdrop-blur-md border-b border-[#2A2A32]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/archive" className="text-[#C9A96E] font-bold text-lg tracking-wider shrink-0">
          宏山档案馆
        </Link>
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[#C9A96E] bg-[#C9A96E]/10'
                    : 'text-[#8B8982] hover:text-[#E8E6E3]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="px-2.5 py-1.5 rounded text-sm text-[#8B8982] hover:text-[#E8E6E3] border border-[#2A2A32] hover:border-[#5A5A62] transition-colors"
            >
              {LOCALE_LABELS[locale] || locale}
            </button>
            {open && locales && (
              <div className="absolute right-0 top-full mt-1 w-28 py-1 rounded border border-[#2A2A32] bg-[#1A1B23] shadow-lg">
                {locales.map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => { setLocale(l); setOpen(false) }}
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
          <button type="button" className="md:hidden text-[#8B8982] text-sm">菜单</button>
        </div>
      </div>
    </header>
  )
}
