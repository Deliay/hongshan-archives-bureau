import { Link, useLocation } from 'react-router-dom'

const LABEL_MAP: Record<string, string> = {
  archive: '档案馆',
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

export default function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs: { label: string; path: string }[] = []
  let acc = ''
  for (const seg of segments) {
    acc += '/' + seg
    const label = LABEL_MAP[seg] ?? seg
    crumbs.push({ label, path: acc })
  }

  return (
    <nav className="text-sm text-[#8B8982] mb-4">
      <Link to="/archive" className="hover:text-[#C9A96E] transition-colors">档案馆</Link>
      {crumbs.slice(1).map((crumb, i) => (
        <span key={crumb.path}>
          <span className="mx-2">/</span>
          {i < crumbs.slice(1).length - 1 || crumbs.length === 2 ? (
            <Link to={crumb.path} className="hover:text-[#C9A96E] transition-colors">{crumb.label}</Link>
          ) : (
            <span className="text-[#E8E6E3]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
