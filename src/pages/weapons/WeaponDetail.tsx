import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWeapon } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import { formatBlackboard } from '../../lib/formatText'

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

export default function WeaponDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: weapon, loading, error } = useWeapon(id ?? '')

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!weapon) return <div className="text-[#8B8982] text-sm">未找到武器</div>

  return (
    <div>
      <div className="mb-4">
        <Link to="/archive/weapons" className="text-xs text-[#5A5A62] hover:text-[#C9A96E] transition-colors">&larr; 返回武器列表</Link>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <img
          src={getItemIconUrl(weapon.iconId)}
          alt=""
          className="w-20 h-20 object-cover bg-[#2A2A32] rounded border border-[#2A2A32]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#E8E6E3]">{weapon.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-[#8B8982]">{weapon.type}</span>
            <span className="text-xs text-[#5A5A62]">·</span>
            <span className="text-sm" style={{ color: RARITY_COLORS[weapon.rarity] || '#888' }}>
              {'★'.repeat(weapon.rarity)}
            </span>
          </div>
          <div className="h-0.5 w-24 rounded-full mt-2" style={{ backgroundColor: RARITY_COLORS[weapon.rarity] || '#a0a0a0' }} />
        </div>
      </div>

      {weapon.lore && (
        <div className="mb-4 p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">物品描述</div>
          <div className="text-xs text-[#8B8982] italic leading-relaxed">
            <RichText text={weapon.lore} />
          </div>
        </div>
      )}

      {weapon.itemDesc && (
        <div className="mb-4 p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">道具说明</div>
          <div className="text-xs text-[#E8E6E3] leading-relaxed">
            <RichText text={weapon.itemDesc} />
          </div>
        </div>
      )}

      <WeaponSkills weaponId={weapon.id} skillIds={weapon.skills} />

      <div className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
        <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">基本信息</div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-[#5A5A62]">武器 ID</dt>
          <dd className="text-[#E8E6E3] font-mono">{weapon.id}</dd>
          <dt className="text-[#5A5A62]">最大等级</dt>
          <dd className="text-[#E8E6E3]">{weapon.maxLevel}</dd>
          <dt className="text-[#5A5A62]">突破模板</dt>
          <dd className="text-[#E8E6E3] font-mono text-[10px]">{weapon.breakthroughTemplateId}</dd>
          <dt className="text-[#5A5A62]">升级模板</dt>
          <dd className="text-[#E8E6E3] font-mono text-[10px]">{weapon.levelTemplateId}</dd>
        </dl>
      </div>

      {weapon.description && (
        <div className="mb-4 p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">武器说明</div>
          <div className="text-xs text-[#E8E6E3] leading-relaxed">
            <RichText text={weapon.description} />
          </div>
        </div>
      )}
    </div>
  )
}

function WeaponSkills({ skillIds }: { weaponId?: string; skillIds: string[] }) {
  const { locale } = useLocale()
  const [skillPatches, setSkillPatches] = useState<Record<string, {
    level: number
    skillName: string
    description: string
    iconId: string
    blackboard: Record<string, number>
  }[]>>({})
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [patchRaw, patchI18n] = await Promise.all([
        getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')),
        getTableI18nDict('SkillPatchTable', locale),
      ])
      if (cancelled) return

      const result: Record<string, { level: number; skillName: string; description: string; iconId: string; blackboard: Record<string, number> }[]> = {}
      const defaultLevels: Record<string, number> = {}

      for (const skillId of skillIds) {
        const entry = patchRaw[skillId]
        if (entry?.SkillPatchDataBundle) {
          result[skillId] = entry.SkillPatchDataBundle.map((p: any) => {
            const bb: Record<string, number> = {}
            for (const b of (p.blackboard ?? [])) {
              bb[b.key] = b.value ?? 0
            }
            return {
              level: p.level,
              skillName: resolveI18n(p.skillName, patchI18n) || '',
              description: resolveI18n(p.description, patchI18n) || '',
              iconId: p.iconId ?? '',
              blackboard: bb,
            }
          })
          defaultLevels[skillId] = result[skillId].length
        }
      }
      setSkillPatches(result)
      setLevels(defaultLevels)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [locale, skillIds.join(',')])

  if (loading) return <div className="text-[#8B8982] text-sm mb-4 p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">加载技能…</div>
  if (Object.keys(skillPatches).length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      <h3 className="text-sm font-medium text-[#C9A96E]">武器技能</h3>
      {Object.entries(skillPatches).map(([skillId, patches]) => {
        const level = levels[skillId] ?? patches.length
        const current = patches.find(p => p.level === level) ?? patches[patches.length - 1]
        const sorted = [...patches].sort((a, b) => a.level - b.level)
        return (
          <div key={skillId} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {current.iconId && (
                    <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${current.iconId}.png`}
                      alt="" className="w-8 h-8 object-contain bg-[#0F0F12] rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <div>
                    <div className="text-sm font-medium text-[#E8E6E3]">{current.skillName || skillId}</div>
                    <div className="text-[10px] text-[#5A5A62] font-mono">Lv.{current.level}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#E8E6E3] leading-relaxed">
                  <RichText text={formatBlackboard(current.description, current.blackboard)} />
                </div>
              </div>
            </div>
            {sorted.length > 1 && (
              <div className="mt-3">
                <input
                  type="range"
                  min={sorted[0].level}
                  max={sorted[sorted.length - 1].level}
                  value={level}
                  onChange={(e) => setLevels(m => ({ ...m, [skillId]: Number(e.target.value) }))}
                  className="w-full h-1 rounded-full appearance-none bg-[#2A2A32] accent-[#C9A96E] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#5A5A62] mt-1">
                  <span>Lv.{sorted[0].level}</span>
                  <span>Lv.{sorted[sorted.length - 1].level}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

async function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  return getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale))
}
