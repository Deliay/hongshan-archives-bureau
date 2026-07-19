import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MODULE_CODES } from '../data/archiveMeta'

const MODULES: { key: string; label: string; path: string; desc: string; subLinks?: { label: string; path: string }[] }[] = [
  {
    key: 'operators', label: '干员档案', path: '/archive/operators', desc: '可操作角色一览',
    subLinks: [
      { label: '干员种族', path: '/archive/races' },
      { label: '干员阵营', path: '/archive/factions' },
    ],
  },
  { key: 'weapons', label: '武器档案', path: '/archive/weapons', desc: '模块化武器记录' },
  { key: 'professions', label: '职业与属性', path: '/archive/professions', desc: '战斗定位与元素' },
  { key: 'geography', label: '地区地理', path: '/archive/geography', desc: '地域分布与探索' },
  { key: 'enemies', label: '敌人图鉴', path: '/archive/enemies', desc: '敌对生物与武装' },
  { key: 'equipment', label: '装备系统', path: '/archive/equipment', desc: '装备宝石套装' },
  { key: 'items', label: '道具材料', path: '/archive/items', desc: '物资与收集品' },
  { key: 'factory', label: '工厂系统', path: '/archive/factory', desc: '自动化生产线' },
  { key: 'story', label: '剧情记录', path: '/archive/story', desc: '叙事资料归档' },
  { key: 'updates', label: '更新日志', path: '/archive/updates', desc: '版本间数据变更' },
]

export default function ArchiveHome() {
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl font-bold text-archive-ivory mb-2">档案局总览</h2>
        <p className="text-sm text-archive-dust">选择一卷档案开始调阅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Card key={m.path} className="group">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="ghost" className="font-mono">{MODULE_CODES[m.key]}</Badge>
            </div>
            <Link to={m.path}>
              <h3 className="font-display text-lg font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
                {m.label}
              </h3>
              <p className="text-sm text-archive-lead mt-1">{m.desc}</p>
            </Link>
            {m.subLinks && (
              <div className="mt-4 pt-3 border-t border-archive-border space-y-2">
                {m.subLinks.map((sl) => (
                  <Link
                    key={sl.path}
                    to={sl.path}
                    className="block text-sm text-archive-dust hover:text-archive-gold transition-colors"
                  >
                    {sl.label}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
