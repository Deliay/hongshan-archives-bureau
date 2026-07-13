import { PROFESSION_MAP, ELEMENT_MAP } from '../../data/constants'
import { Link } from 'react-router-dom'

export default function ProfessionOverview() {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">职业与属性</h2>

      <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">职业</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {Object.entries(PROFESSION_MAP).map(([id, name]) => (
          <Link
            key={id}
            to={`/archive/operators?profession=${name}`}
            className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23] hover:border-[#C9A96E]/40 transition-all"
          >
            <p className="text-sm text-[#E8E6E3]">{name}</p>
          </Link>
        ))}
      </div>

      <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">属性形态</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(ELEMENT_MAP).map(([id, el]) => (
          <Link
            key={id}
            to={`/archive/operators?element=${el.name}`}
            className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23] hover:border-[#C9A96E]/40 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: el.color }} />
              <span className="text-sm text-[#E8E6E3]">{el.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
