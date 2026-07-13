import { Link, useLocation } from 'react-router-dom'

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
]

export default function TopNav() {
  const location = useLocation()

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
        <button className="md:hidden ml-auto text-[#8B8982] text-sm">菜单</button>
      </div>
    </header>
  )
}
