import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useOperatorDetail } from '../../hooks/useData'
import Rarity from '../../components/Rarity'
import { ASSET_BASE } from '../../lib/adapter'

type TabName = '精英化' | '装备适配' | '能力值提升' | '干员天赋'

const TABS: TabName[] = ['精英化', '装备适配', '能力值提升', '干员天赋']

export default function OperatorDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: detail, loading, error } = useOperatorDetail(id ?? '')
  const [activeTab, setActiveTab] = useState<TabName>('精英化')

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
                  <p className="text-xs text-[#8B8982] mb-2">{node.description}</p>
                  {node.requiredItem.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {node.requiredItem.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#2A2A32] text-[#B0ACA6]">
                          {item.id.replace(/^item_/, '')} ×{item.count}
                        </span>
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
                      <span key={wid} className="text-xs px-2 py-1 rounded border border-[#2A2A32] bg-[#1A1B23] text-[#B0ACA6]">
                        {wid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {wpnRecommend.weaponIds2.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">推荐武器·第二组</h4>
                  <div className="flex flex-wrap gap-2">
                    {wpnRecommend.weaponIds2.map((wid) => (
                      <span key={wid} className="text-xs px-2 py-1 rounded border border-[#2A2A32] bg-[#1A1B23] text-[#B0ACA6]">
                        {wid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {wpnRecommend.weaponIds3.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#C9A96E] mb-2 tracking-wider">推荐武器·第三组</h4>
                  <div className="flex flex-wrap gap-2">
                    {wpnRecommend.weaponIds3.map((wid) => (
                      <span key={wid} className="text-xs px-2 py-1 rounded border border-[#2A2A32] bg-[#1A1B23] text-[#B0ACA6]">
                        {wid}
                      </span>
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
                        <p className="text-xs text-[#8B8982]">{node.description}</p>
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
                      {node.requiredItem.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#2A2A32] text-[#B0ACA6]">
                          {item.id.replace(/^item_/, '')} ×{item.count}
                        </span>
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
                    {node.iconId && (
                      <img
                        src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/talenticon/${node.iconId}.png`}
                        alt=""
                        className="w-6 h-6"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <span className="text-sm font-medium text-[#E8E6E3]">{node.name}</span>
                    <span className="text-xs text-[#C9A96E]">Lv.{node.level}</span>
                  </div>
                  <p className="text-xs text-[#8B8982] mb-2">{node.description || '暂无描述'}</p>
                  {node.requiredItem.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {node.requiredItem.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#2A2A32] text-[#B0ACA6]">
                          {item.id.replace(/^item_/, '')} ×{item.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 档案记录 */}
      {op.profileRecords.length > 0 && (
        <section className="mb-5">
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">档案记录</h3>
          <div className="space-y-3">
            {op.profileRecords.map((record, i) => (
              <p key={i} className="text-sm text-[#B0ACA6] leading-relaxed">{record}</p>
            ))}
          </div>
        </section>
      )}

      {/* 语音记录 */}
      {op.voiceLines.length > 0 && (
        <section className="mb-5">
          <h3 className="text-sm font-medium text-[#C9A96E] mb-2 tracking-wider">语音记录</h3>
          <div className="space-y-2">
            {op.voiceLines.slice(0, 10).map((vl, i) => (
              <div key={i} className="p-3 rounded border border-[#2A2A32] bg-[#1A1B23]">
                <p className="text-xs text-[#5A5A62] mb-1">{vl.title || `语音 ${i + 1}`}</p>
                <p className="text-sm text-[#B0ACA6]">{vl.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}


