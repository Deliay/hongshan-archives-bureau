import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useOperatorDetail } from '../../hooks/useData'
import { useLocale } from '../../lib/locale'
import Rarity from '../../components/Rarity'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import ItemPanel from '../../components/Items/ItemPanel'
import { formatBlackboard } from '../../lib/formatText'
import type { SkillGroup, SkillPatchData } from '../../lib/types'

type TabName = '技能' | '精英化' | '装备适配' | '能力值提升' | '干员天赋' | '后勤技能' | '档案记录' | '语音记录'

const TABS: TabName[] = ['技能', '精英化', '装备适配', '能力值提升', '干员天赋', '后勤技能', '档案记录', '语音记录']

const SKILL_TYPE_LABELS: Record<number, string> = {
  0: '普通攻击',
  1: '主动技能',
  2: '必杀技能',
  3: '连携技能',
}

export default function OperatorDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: detail, loading, error } = useOperatorDetail(id ?? '')
  const [activeTab, setActiveTab] = useState<TabName>('技能')

  const breakCostMap = detail?.breakCostMap ?? {}
  const talentNodeMap = detail?.talentNodeMap ?? {}

  const breakNodes = useMemo(
    () => Object.values(breakCostMap).filter(n => n.nodeType === 1).sort((a, b) => a.breakStage - b.breakStage),
    [breakCostMap],
  )
  const equipBreakNodes = useMemo(
    () => Object.values(breakCostMap).filter(n => n.nodeType === 2).sort((a, b) => a.breakStage - b.breakStage),
    [breakCostMap],
  )
  const talentNodes = useMemo(
    () => Object.values(talentNodeMap).filter(n => n.nodeType === 4).sort((a, b) => a.breakStage - b.breakStage),
    [talentNodeMap],
  )
  const attrNodes = useMemo(
    () => Object.values(talentNodeMap).filter(n => n.nodeType === 3).sort((a, b) => a.breakStage - b.breakStage),
    [talentNodeMap],
  )

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!detail) return <div className="text-[#8B8982] text-sm">干员档案未找到</div>

  const { op, wpnRecommend } = detail

  return (
    <div className="max-w-3xl">
      {/* 基础信息 */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-20 h-20 rounded border border-[#2A2A32] bg-[#1A1B23] overflow-hidden shrink-0">
          {op.portrait ? (
            <img src={op.portrait} alt={op.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-[#5A5A62]">?</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#E8E6E3]">{op.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[#8B8982]">
            <img src={op.professionIcon} alt="" className="w-4 h-4" />
            <span>{op.profession}</span>
            <span>·</span>
            <img src={op.elementIcon} alt="" className="w-4 h-4" />
            <span style={{ color: op.elementColor }}>{op.element}</span>
            <span>·</span>
            <Rarity level={op.rarity} />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {op.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">{tag}</span>
            ))}
          </div>
          {/* 主能力 & 副能力 */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
            {op.mainAttr.icon && (
              <div className="flex items-center gap-1.5 text-[#B0ACA6]">
                <img src={op.mainAttr.icon} alt="" className="w-4 h-4" />
                <span className="text-[#C9A96E]">主能力</span>
                <span>{op.mainAttr.name}</span>
              </div>
            )}
            {op.subAttr.icon && (
              <div className="flex items-center gap-1.5 text-[#B0ACA6]">
                <img src={op.subAttr.icon} alt="" className="w-4 h-4" />
                <span className="text-[#C9A96E]">副能力</span>
                <span>{op.subAttr.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="mb-4">
        <div className="flex border-b border-[#2A2A32]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[#C9A96E] border-b-2 border-[#C9A96E]'
                  : 'text-[#8B8982] hover:text-[#B0ACA6]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      {activeTab === '技能' && (
        <section>
          {detail.skillGroups.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无技能数据</p>
          ) : (
            <div className="space-y-4">
              {[...detail.skillGroups].sort((a, b) => {
                const order = [0, 1, 3, 2]
                return order.indexOf(a.skillGroupType) - order.indexOf(b.skillGroupType)
              }).map((group) => (
                <SkillGroupCard
                  key={group.skillGroupId}
                  group={group}
                  skillPatchMap={detail.skillPatchMap}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '精英化' && (
        <section>
          {breakNodes.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无精英化数据</p>
          ) : (
            <div className="space-y-3">
              {breakNodes.map((node) => (
                <div key={node.nodeId} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#E8E6E3]">{node.name}</span>
                    <span className="text-xs text-[#5A5A62]">等级上限提升至 Lv.{node.equipTierLimit * 20}</span>
                  </div>
                  <p className="text-xs text-[#8B8982] mb-2"><RichText text={node.description} /></p>
                  {node.requiredItem.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {node.requiredItem.map((item) => (
                        <ItemPanel key={item.id} itemId={item.id} amount={item.count} showName={false} iconClassName="w-8 h-8" className="w-16" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '装备适配' && (
        <section>
          {!wpnRecommend ? (
            <p className="text-sm text-[#5A5A62]">暂无装备适配数据</p>
          ) : (
            <div className="space-y-4">
              {wpnRecommend.weaponIds1.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">推荐武器·第一组</h4>
                  <div className="flex flex-wrap gap-2">
                    {wpnRecommend.weaponIds1.map((wid) => (
                      <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                    ))}
                  </div>
                </div>
              )}
              {wpnRecommend.weaponIds2.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">推荐武器·第二组</h4>
                  <div className="flex flex-wrap gap-2">
                    {wpnRecommend.weaponIds2.map((wid) => (
                      <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                    ))}
                  </div>
                </div>
              )}
              {wpnRecommend.weaponIds3.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">推荐武器·第三组</h4>
                  <div className="flex flex-wrap gap-2">
                    {wpnRecommend.weaponIds3.map((wid) => (
                      <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                    ))}
                  </div>
                </div>
              )}
              {equipBreakNodes.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">装备突破</h4>
                  <div className="space-y-2">
                    {equipBreakNodes.map((node) => (
                      <div key={node.nodeId} className="p-2 rounded border border-[#2A2A32] bg-[#1A1B23]">
                        <span className="text-xs text-[#E8E6E3]">{node.name}</span>
                        <p className="text-xs text-[#8B8982]"><RichText text={node.description} /></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === '能力值提升' && (
        <section>
          {attrNodes.length === 0 && breakNodes.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无能力值提升数据</p>
          ) : (
            <div className="space-y-3">
              {attrNodes.map((node) => (
                <div key={node.nodeId} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#E8E6E3]">{node.name || `突破节点`}</span>
                    <span className="text-xs text-[#C9A96E]">好感度 +{node.breakStage * 100}</span>
                  </div>
                  {node.requiredItem.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {node.requiredItem.map((item) => (
                        <ItemPanel key={item.id} itemId={item.id} amount={item.count} showName={false} iconClassName="w-8 h-8" className="w-16" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '干员天赋' && (
        <section>
          {talentNodes.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无天赋数据</p>
          ) : (
            <div className="space-y-3">
              {talentNodes.map((node) => (
                <div key={node.nodeId} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      let iconUrl = ''
                      if (node.nodeType === 4 && node.iconId) {
                        iconUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${node.iconId}.png`
                      } else if (node.nodeType === 3 && node.attrType !== undefined) {
                        iconUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/talenttreeicon/icon_talenttree_${node.attrType}.png`
                      } else if ((node.nodeType === 1 || node.nodeType === 2) && node.iconId) {
                        iconUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/talenticon/${node.iconId}.png`
                      }
                      if (!iconUrl) return null
                      return (
                        <img src={iconUrl} alt="" className="w-6 h-6"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )
                    })()}
                    <span className="text-sm font-medium text-[#E8E6E3]">{node.name}</span>
                    <span className="text-xs text-[#C9A96E]">Lv.{node.level}</span>
                  </div>
                  <p className="text-xs text-[#8B8982] mb-2"><RichText text={node.description} /></p>
                  {node.requiredItem.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {node.requiredItem.map((item) => (
                        <ItemPanel key={item.id} itemId={item.id} amount={item.count} showName={false} iconClassName="w-8 h-8" className="w-16" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '后勤技能' && (
        <section>
          {detail.factorySkills.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无后勤技能数据</p>
          ) : (
            <div className="space-y-3">
              {detail.factorySkills.map((fs) => (
                <div key={fs.skillId} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0 flex items-center justify-center">
                      {fs.icon ? (
                        <img
                          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/spaceship/spaceshipskillicon/${fs.icon}.png`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-xs text-[#5A5A62]">?</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#E8E6E3]">{fs.name || fs.skillId}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#5A5A62]">
                        {fs.roomType > 0 && <span>房间 {fs.roomType}</span>}
                        <span>Lv.{fs.level}</span>
                      </div>
                      {fs.desc && (
                        <div className="text-xs text-[#B0ACA6] leading-relaxed mt-1"><RichText text={fs.desc} /></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '档案记录' && (
        <section>
          {op.profileRecords.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无档案记录</p>
          ) : (
            <div className="space-y-3">
              {op.profileRecords.map((record, i) => (
                <p key={i} className="text-sm text-[#B0ACA6] leading-relaxed"><RichText text={record} /></p>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === '语音记录' && (
        <section>
          {op.voiceLines.length === 0 ? (
            <p className="text-sm text-[#5A5A62]">暂无语音记录</p>
          ) : (
            <div className="space-y-2">
              {op.voiceLines.slice(0, 10).map((vl, i) => (
                <div key={i} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                  <p className="text-xs text-[#5A5A62] mb-1">{vl.title || `语音 ${i + 1}`}</p>
                  <p className="text-sm text-[#B0ACA6]"><RichText text={vl.text} /></p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function getPatchesAtLevel(group: SkillGroup, skillPatchMap: Record<string, SkillPatchData[]>, level: number): SkillPatchData[] {
  const patches: SkillPatchData[] = []
  for (const skillId of group.skillIdList) {
    const bundle = skillPatchMap[skillId]
    if (!bundle) continue
    const patch = bundle.find(p => p.level === level)
    if (patch) patches.push(patch)
  }
  return patches
}

function collectBlackboards(patches: SkillPatchData[]): Record<string, number> {
  const bb: Record<string, number> = {}
  for (const patch of patches) {
    for (const b of patch.blackboard) {
      if (!(b.key in bb)) bb[b.key] = b.value
    }
  }
  return bb
}

function localeText(obj: unknown, locale: string, fallback?: string): string {
  if (!obj) return fallback ?? ''
  if (typeof obj === 'string') return obj
  const dict = obj as Record<string, string>
  return dict[locale] || dict.CN || (obj as any).text || fallback || ''
}

function SkillGroupCard({ group, skillPatchMap }: { group: SkillGroup; skillPatchMap: Record<string, SkillPatchData[]> }) {
  const [level, setLevel] = useState(12)
  const { locale } = useLocale()

  const patches = useMemo(() => getPatchesAtLevel(group, skillPatchMap, level), [group, skillPatchMap, level])

  const typeName = SKILL_TYPE_LABELS[group.skillGroupType] ?? `类型${group.skillGroupType}`
  const groupName = localeText(group.name, locale)
  const groupDesc = localeText(group.desc, locale)

  const blackboards = useMemo(() => collectBlackboards(patches), [patches])

  const descText = useMemo(() => {
    if (!groupDesc) return ''
    if (Object.keys(blackboards).length === 0) return groupDesc
    return formatBlackboard(groupDesc, blackboards)
  }, [groupDesc, blackboards])

  return (
    <div className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded border border-[#2A2A32] bg-[#0F0F12] overflow-hidden shrink-0 flex items-center justify-center">
          {group.icon ? (
            <img
              src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${group.icon}.png`}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-xs text-[#5A5A62]">?</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C9A96E]/20 text-[#C9A96E] font-mono">{typeName}</span>
            <span className="text-sm font-medium text-[#E8E6E3] truncate">{groupName || group.skillGroupId}</span>
          </div>

          {patches.length > 0 && (() => {
            const p = patches[0]
            return (
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#5A5A62] mt-1">
                {p.costType !== undefined && p.costValue > 0 && (
                  <span>SP {p.costValue}</span>
                )}
                {p.coolDown > 0 && (
                  <span>CD {p.coolDown}s</span>
                )}
                <span>Lv.{level}</span>
                {level === 12 && <span className="text-[10px] text-[#C9A96E]">M3</span>}
              </div>
            )
          })()}

          {descText && (
            <div className="text-xs text-[#B0ACA6] leading-relaxed mt-2">
              <RichText text={descText} />
            </div>
          )}

          {patches.length > 0 && patches[0].subDescNameList?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patches[0].subDescNameList.map((sub, i) => {
                const subName = localeText(sub, locale)
                if (!subName) return null
                const subVal = patches[0].subDescList?.[i] ?? ''
                return (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A32] text-[#8B8982]">
                    {subName}: {subVal}
                  </span>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-1 mt-3">
            <span className="text-[10px] text-[#5A5A62]">等级</span>
            <input
              type="range"
              min={1}
              max={12}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="flex-1 h-1 accent-[#C9A96E]"
            />
            <span className="text-[10px] text-[#C9A96E] font-mono w-6 text-right">
              {level}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


