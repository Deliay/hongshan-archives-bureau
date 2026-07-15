import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEnemies } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import Rarity from '../../components/Rarity'

const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }
const ENEMY_TYPE_LABELS: Record<number, string> = {
  0: '普通',
  1: '精英',
  2: '首领',
  3: '进阶',
  4: '领袖',
}

const ATTR_TYPE_NAMES: Record<number, string> = {
  0: '等级', 1: '生命值', 2: '攻击力', 3: '防御力',
  8: '暴击率', 9: '暴击伤害', 10: '暴击抵抗', 11: '暴击伤害抵抗',
  12: '命中率', 15: '穿透力',
  20: '移动速度', 21: '攻击速度',
  27: '索敌范围',
  80: '物理伤害抗性', 81: '灼热伤害抗性', 82: '寒冷伤害抗性',
  83: '电磁伤害抗性', 84: '自然伤害抗性', 85: '超域伤害抗性',
}

export default function EnemyDetail() {
  const { id } = useParams<{ id: string }>()
  const { locale } = useLocale()
  const { data: enemies, loading } = useEnemies()

  const [abilities, setAbilities] = useState<{ name: string; description: string }[]>([])
  const [attrTemplate, setAttrTemplate] = useState<any>(null)
  const [attrLevel, setAttrLevel] = useState(1)
  const [extraLoading, setExtraLoading] = useState(true)

  const enemy = useMemo(() => enemies?.find(e => e.id === id), [enemies, id])

  useEffect(() => {
    if (!enemy) return
    let cancelled = false
    async function load() {
      const [abilityRaw, abilityI18n, attrRaw] = await Promise.all([
        getCachedData<Record<string, any>>('EnemyAbilityDescTable', () => fetchTableAll('EnemyAbilityDescTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyAbilityDescTable`, () => fetchTableDictAll('EnemyAbilityDescTable', locale)),
        getCachedData<Record<string, any>>('EnemyAttributeTemplateTable', () => fetchTableAll('EnemyAttributeTemplateTable')),
      ])
      if (cancelled) return

      const abilityList: { name: string; description: string }[] = []
      const displayInfo = Object.values(enemies ?? []).find((e: any) => e.templateId === enemy.templateId) as any
      const abilityIds: string[] = displayInfo?.abilityDescIds ?? []
      for (const aid of abilityIds) {
        const entry = abilityRaw[aid]
        if (entry) {
          abilityList.push({
            name: resolveI18n(entry.name, abilityI18n) || aid,
            description: resolveI18n(entry.description, abilityI18n),
          })
        }
      }
      setAbilities(abilityList)

      const attrEntry = attrRaw[enemy.templateId]
      if (attrEntry) {
        setAttrTemplate(attrEntry)
        setAttrLevel(attrEntry.levelDependentAttributes?.length ?? 1)
      }
      setExtraLoading(false)
    }
    setExtraLoading(true)
    load()
    return () => { cancelled = true }
  }, [enemy, locale, enemies])

  if (loading || !enemy) {
    if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
    return <div className="text-[#8B8982] text-sm">未找到敌人</div>
  }

  const stars = ENEMY_STARS[enemy.displayType] ?? 1
  const levelAttrs = attrTemplate?.levelDependentAttributes ?? []
  const currentLevelAttrs = levelAttrs[attrLevel - 1]?.attrs ?? []
  const fixedAttrs = attrTemplate?.levelIndependentAttributes?.attrs ?? []

  return (
    <div className="max-w-2xl space-y-4">
      <div><Link to="/archive/enemies" className="text-xs text-[#5A5A62] hover:text-[#C9A96E] transition-colors">&larr; 返回敌人图鉴</Link></div>

      <div className="flex items-start gap-4">
        <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/${enemy.templateId}.png`} alt=""
          className="w-20 h-20 object-cover bg-[#2A2A32] rounded border border-[#2A2A32]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#E8E6E3]">{enemy.name}</h2>
          {enemy.nickname && <p className="text-sm text-[#8B8982] mt-0.5">{enemy.nickname}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#5A5A62]">{ENEMY_TYPE_LABELS[enemy.displayType] || `类型${enemy.displayType}`}</span>
            <Rarity level={stars} />
            {enemy.wikiGroup && <span className="text-xs text-[#5A5A62]">· {enemy.wikiGroup}</span>}
          </div>
          {enemy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {enemy.tags.map((t, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {enemy.description && (
        <div className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">描述</div>
          <div className="text-xs text-[#E8E6E3] leading-relaxed"><RichText text={enemy.description} /></div>
        </div>
      )}

      {!extraLoading && abilities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2">技能</h3>
          <div className="space-y-2">
            {abilities.map((ab, i) => (
              <div key={i} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                {ab.name && <div className="text-xs font-medium text-[#E8E6E3] mb-1">{ab.name}</div>}
                {ab.description && <div className="text-xs text-[#B0ACA6] leading-relaxed"><RichText text={ab.description} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!extraLoading && attrTemplate && levelAttrs.length > 0 && (
        <div className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2">属性（等级 {attrLevel}）</h3>
          <input type="range" min={1} max={levelAttrs.length} value={attrLevel}
            onChange={(e) => setAttrLevel(Number(e.target.value))}
            className="w-full h-1 accent-[#C9A96E] mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentLevelAttrs.map((attr: any) => (
              <div key={attr.attrType} className="flex justify-between text-xs">
                <span className="text-[#5A5A62]">{ATTR_TYPE_NAMES[attr.attrType] || `属性${attr.attrType}`}</span>
                <span className="text-[#E8E6E3] font-mono">{attr.attrType === 80 || attr.attrType === 81 || attr.attrType === 82 || attr.attrType === 83 || attr.attrType === 84 || attr.attrType === 85 ? `${(attr.attrValue * 100).toFixed(0)}%` : attr.attrValue}</span>
              </div>
            ))}
          </div>

          {fixedAttrs.length > 0 && (
            <>
              <div className="text-[10px] text-[#5A5A62] mt-3 mb-1">固定属性</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fixedAttrs.map((attr: any) => (
                  <div key={attr.attrType} className="flex justify-between text-xs">
                    <span className="text-[#5A5A62]">{ATTR_TYPE_NAMES[attr.attrType] || `属性${attr.attrType}`}</span>
                    <span className="text-[#E8E6E3] font-mono">{attr.attrValue}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {attrTemplate.physicalDmgResistScalar !== undefined && (
            <div className="mt-3 pt-3 border-t border-[#2A2A32]">
              <div className="text-[10px] text-[#5A5A62] mb-1">抗性</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <ResistRow label="物理" value={attrTemplate.physicalDmgResistScalar} />
                <ResistRow label="灼热" value={attrTemplate.fireDmgResistScalar} />
                <ResistRow label="寒冷" value={attrTemplate.crystDmgResistScalar} />
                <ResistRow label="电磁" value={attrTemplate.pulseDmgResistScalar} />
                <ResistRow label="自然" value={attrTemplate.naturalDmgResistScalar} />
              </div>
            </div>
          )}

          {attrTemplate.maxResilience !== undefined && (
            <div className="mt-3 pt-3 border-t border-[#2A2A32]">
              <div className="text-[10px] text-[#5A5A62] mb-1">韧性</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-[#5A5A62]">最大值</span><span className="text-[#E8E6E3] font-mono">{attrTemplate.maxResilience}</span></div>
                <div className="flex justify-between"><span className="text-[#5A5A62]">受伤减少</span><span className="text-[#E8E6E3] font-mono">{attrTemplate.resilienceDecreaseWhenHurt}</span></div>
                <div className="flex justify-between"><span className="text-[#5A5A62]">回复量/秒</span><span className="text-[#E8E6E3] font-mono">{attrTemplate.resilienceRecover}</span></div>
                <div className="flex justify-between"><span className="text-[#5A5A62]">回复间隔</span><span className="text-[#E8E6E3] font-mono">{attrTemplate.resilienceRecoverInterval}s</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {!extraLoading && (
        <div className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
          <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">基本信息</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-[#5A5A62]">ID</dt>
            <dd className="text-[#E8E6E3] font-mono">{enemy.id}</dd>
            <dt className="text-[#5A5A62]">模板 ID</dt>
            <dd className="text-[#E8E6E3] font-mono text-[10px]">{enemy.templateId}</dd>
            {attrTemplate && <><dt className="text-[#5A5A62]">最大等级</dt><dd className="text-[#E8E6E3]">{levelAttrs.length}</dd></>}
          </dl>
        </div>
      )}
    </div>
  )
}

function ResistRow({ label, value }: { label: string; value: number }) {
  const pct = ((1 - value) * 100).toFixed(0)
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[#5A5A62]">{label}</span>
      <span className="text-[#E8E6E3] font-mono">{pct}%</span>
    </div>
  )
}
