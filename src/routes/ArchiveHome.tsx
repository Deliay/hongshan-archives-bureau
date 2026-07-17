import { Link } from 'react-router-dom'

const MODULES: { label: string; path: string; desc: string; subLinks?: { label: string; path: string }[] }[] = [
  {
    label: '干员档案', path: '/archive/operators', desc: '可操作角色一览',
    subLinks: [
      { label: '干员种族', path: '/archive/races' },
      { label: '干员阵营', path: '/archive/factions' },
    ],
  },
  { label: '武器档案', path: '/archive/weapons', desc: '模块化武器记录' },
  { label: '职业与属性', path: '/archive/professions', desc: '战斗定位与元素' },
  { label: '地区地理', path: '/archive/geography', desc: '地域分布与探索' },
  { label: '敌人图鉴', path: '/archive/enemies', desc: '敌对生物与武装' },
  { label: '装备系统', path: '/archive/equipment', desc: '装备宝石套装' },
  { label: '道具材料', path: '/archive/items', desc: '物资与收集品' },
  { label: '工厂系统', path: '/archive/factory', desc: '自动化生产线' },
  { label: '剧情记录', path: '/archive/story', desc: '叙事资料归档' },
  { label: '更新日志', path: '/archive/updates', desc: '版本间数据变更' },
]

export default function ArchiveHome() {
  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-[#E8E6E3] mb-2">欢迎阅览</h2>
        <p className="text-sm text-[#8B8982]">选择一卷档案开始查阅</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {MODULES.map((m) => (
          <div
            key={m.path}
            className="p-4 rounded border border-[#2A2A32] bg-[#1A1B23] group
                       hover:border-[#C9A96E]/40 transition-all duration-200"
          >
            <Link to={m.path}>
              <h3 className="text-sm font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors">
                {m.label}
              </h3>
              <p className="text-xs text-[#5A5A62] mt-1">{m.desc}</p>
            </Link>
            {m.subLinks && (
              <div className="mt-2 pt-2 border-t border-[#2A2A32] space-y-1">
                {m.subLinks.map((sl) => (
                  <Link
                    key={sl.path}
                    to={sl.path}
                    className="block text-xs text-[#8B8982] hover:text-[#C9A96E] transition-colors pl-1"
                  >
                    {sl.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
