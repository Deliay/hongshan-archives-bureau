import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

const MODULE_GROUPS: {
  label: string
  desc: string
  modules: { label: string; path: string; desc: string }[]
}[] = [
  {
    label: '人事档案',
    desc: '干员、种族与阵营',
    modules: [
      { label: '干员档案', path: '/archive/operators', desc: '可操作角色一览' },
      { label: '干员种族', path: '/archive/races', desc: '种族资料归集' },
      { label: '干员阵营', path: '/archive/factions', desc: '势力归属梳理' },
    ],
  },
  {
    label: '威胁档案',
    desc: '敌对生物与武装情报',
    modules: [
      { label: '敌人图鉴', path: '/archive/enemies', desc: '敌对生物与武装' },
    ],
  },
  {
    label: '物资档案',
    desc: '道具、武器、装备与生产',
    modules: [
      { label: '道具材料', path: '/archive/items', desc: '物资与收集品' },
      { label: '武器档案', path: '/archive/weapons', desc: '模块化武器记录' },
      { label: '装备系统', path: '/archive/equipment', desc: '装备宝石套装' },
      { label: '工厂系统', path: '/archive/factory', desc: '自动化生产线' },
    ],
  },
  {
    label: '地理档案',
    desc: '塔卫二区域与探索',
    modules: [
      { label: '地区地理', path: '/archive/geography', desc: '地域分布与探索' },
    ],
  },
  {
    label: '大事记',
    desc: '叙事与版本变更记录',
    modules: [
      { label: '剧情记录', path: '/archive/story', desc: '叙事资料归档' },
      { label: '更新日志', path: '/archive/updates', desc: '版本间数据变更' },
    ],
  },
]

export default function ArchiveHome() {
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl font-bold text-archive-ivory mb-2">档案局总览</h2>
        <p className="text-sm text-archive-dust">选择一卷档案开始调阅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_GROUPS.map((group) => (
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
