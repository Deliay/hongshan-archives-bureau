import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useOperatorDetail } from '../../hooks/useData'
import { useLocale } from '../../lib/locale'
import { useI18n } from '../../i18n'
import Rarity from '../../components/Rarity'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import ItemPanel from '../../components/Items/ItemPanel'
import { formatBlackboard } from '../../lib/formatText'
import type { SkillGroup, SkillPatchData } from '../../lib/types'

const SKILL_TYPE_LABELS: Record<number, string> = {
  0: 'operator.skillType.0',
  1: 'operator.skillType.1',
  2: 'operator.skillType.2',
  3: 'operator.skillType.3',
}

export default function OperatorDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { data: detail, loading, error } = useOperatorDetail(id ?? '')

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

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!detail) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('operator.title') })}</div>

  const { op, wpnRecommend } = detail

  return (
    <div className="max-w-3xl space-y-6">
      {/* 基础信息 */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded border border-archive-border bg-archive-file overflow-hidden shrink-0">
          {op.portrait ? (
            <img src={op.portrait} alt={op.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-archive-lead">?</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-archive-ivory">{op.name}</h2>
            <Badge variant="ghost" className="font-mono">{MODULE_CODES.operators}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-archive-dust">
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
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-archive-border text-archive-dust">{tag}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
            {op.mainAttr.icon && (
              <div className="flex items-center gap-1.5 text-archive-dust">
                <img src={op.mainAttr.icon} alt="" className="w-4 h-4" />
                <span className="text-archive-gold">{t('operator.mainAttr')}</span>
                <span>{op.mainAttr.name}</span>
              </div>
            )}
            {op.subAttr.icon && (
              <div className="flex items-center gap-1.5 text-archive-dust">
                <img src={op.subAttr.icon} alt="" className="w-4 h-4" />
                <span className="text-archive-gold">{t('operator.subAttr')}</span>
                <span>{op.subAttr.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 技能 */}
      <section>
        <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.skill')}</h3>
        {detail.skillGroups.length === 0 ? (
          <p className="text-sm text-archive-lead">{t('common.empty')}</p>
        ) : (
          <div className="space-y-3">
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

      {/* 干员天赋 */}
      {talentNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.talent')}</h3>
          <div className="space-y-3">
            {talentNodes.map((node) => (
              <div key={node.nodeId} className="p-3 rounded border border-archive-border bg-archive-file">
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
                  <span className="text-sm font-medium text-archive-ivory">{node.name}</span>
                  <span className="text-xs text-archive-gold">Lv.{node.level}</span>
                </div>
                <p className="text-xs text-archive-dust mb-2"><RichText text={node.description} /></p>
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
        </section>
      )}

      {/* 后勤技能 */}
      {detail.factorySkills.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.factorySkill')}</h3>
          <div className="space-y-3">
            {detail.factorySkills.map((fs) => (
              <div key={fs.skillId} className="p-3 rounded border border-archive-border bg-archive-file">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0 flex items-center justify-center">
                    {fs.icon ? (
                      <img
                        src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/spaceship/spaceshipskillicon/${fs.icon}.png`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <span className="text-xs text-archive-lead">?</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-archive-ivory">{fs.name || fs.skillId}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-archive-lead">
                      {fs.roomType > 0 && <span>房间 {fs.roomType}</span>}
                      <span>Lv.{fs.level}</span>
                    </div>
                    {fs.desc && (
                      <div className="text-xs text-archive-dust leading-relaxed mt-1"><RichText text={fs.desc} /></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 精英化 */}
      {breakNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.break')}</h3>
          <div className="space-y-3">
            {breakNodes.map((node) => (
              <div key={node.nodeId} className="p-3 rounded border border-archive-border bg-archive-file">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-archive-ivory">{node.name}</span>
                </div>
                <p className="text-xs text-archive-dust mb-2"><RichText text={node.description} /></p>
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
        </section>
      )}

      {/* 能力值提升 */}
      {attrNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.attrBoost')}</h3>
          <div className="space-y-3">
            {attrNodes.map((node) => (
              <div key={node.nodeId} className="p-3 rounded border border-archive-border bg-archive-file">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-archive-ivory">{node.name || `突破节点`}</span>
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
        </section>
      )}

      {/* 装备适配 */}
      {wpnRecommend && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.equipFit')}</h3>
          <div className="space-y-4">
            {wpnRecommend.weaponIds1.length > 0 && (
              <div>
                <h4 className="text-xs text-archive-gold mb-2 tracking-wider">{t('operator.equipFit')} I</h4>
                <div className="flex flex-wrap gap-2">
                  {wpnRecommend.weaponIds1.map((wid) => (
                    <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                  ))}
                </div>
              </div>
            )}
            {wpnRecommend.weaponIds2.length > 0 && (
              <div>
                <h4 className="text-xs text-archive-gold mb-2 tracking-wider">{t('operator.equipFit')} II</h4>
                <div className="flex flex-wrap gap-2">
                  {wpnRecommend.weaponIds2.map((wid) => (
                    <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                  ))}
                </div>
              </div>
            )}
            {wpnRecommend.weaponIds3.length > 0 && (
              <div>
                <h4 className="text-xs text-archive-gold mb-2 tracking-wider">{t('operator.equipFit')} III</h4>
                <div className="flex flex-wrap gap-2">
                  {wpnRecommend.weaponIds3.map((wid) => (
                    <ItemPanel key={wid} itemId={wid} showName={false} iconClassName="w-10 h-10" className="w-20" />
                  ))}
                </div>
              </div>
            )}
            {equipBreakNodes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs text-archive-gold mb-2 tracking-wider">{t('operator.break')}</h4>
                <div className="space-y-2">
                  {equipBreakNodes.map((node) => (
                    <div key={node.nodeId} className="p-2 rounded border border-archive-border bg-archive-file">
                      <span className="text-xs text-archive-ivory">{node.name}</span>
                      <p className="text-xs text-archive-dust"><RichText text={node.description} /></p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 档案记录 */}
      {op.profileRecords.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.profileRecords')}</h3>
          <div className="space-y-3">
            {op.profileRecords.map((record, i) => (
              <p key={i} className="text-sm text-archive-dust leading-relaxed"><RichText text={record} /></p>
            ))}
          </div>
        </section>
      )}

      {/* 语音记录 */}
      {op.voiceLines.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.voiceRecords')}</h3>
          <div className="space-y-2">
            {op.voiceLines.slice(0, 10).map((vl, i) => (
              <div key={i} className="p-3 rounded border border-archive-border bg-archive-file">
                <p className="text-xs text-archive-lead mb-1">{vl.title || `${t('operator.voiceRecords')} ${i + 1}`}</p>
                <p className="text-sm text-archive-dust"><RichText text={vl.text} /></p>
              </div>
            ))}
          </div>
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

function getPatchesForSkill(skillId: string, skillPatchMap: Record<string, SkillPatchData[]>, level: number): SkillPatchData[] {
  const bundle = skillPatchMap[skillId]
  if (!bundle) return []
  return bundle.filter(p => p.level === level)
}

function collectBlackboards(patches: SkillPatchData[]): Record<string, number> {
  const bb: Record<string, number> = {}
  for (const patch of patches) {
    for (const b of patch.blackboard) {
      bb[b.key] = b.value
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

function SkillFormColumn({
  icon,
  name,
  patches,
  postDescText,
  conditionId,
  condDesc,
  condDescInactive,
}: {
  icon: string
  name: string
  patches: SkillPatchData[]
  postDescText: string
  conditionId: string
  condDesc?: string
  condDescInactive?: string
}) {
  return (
    <div className="flex-1 min-w-0 p-2.5 rounded border border-archive-border bg-archive-ink">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded border border-archive-border bg-archive-file overflow-hidden shrink-0 flex items-center justify-center">
          {icon ? (
            <img
              src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${icon}.png`}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-xs text-archive-lead">?</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-archive-ivory truncate leading-tight">{name}</div>
          {condDesc && (
            <div className="text-[10px] text-archive-dust leading-tight mt-0.5">
              <RichText text={condDesc} />
              {condDescInactive && (
                <div className="text-archive-lead mt-0.5">
                  <RichText text={condDescInactive} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {patches.length > 0 && (() => {
        const p = patches[0]
        return (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-archive-lead mb-2">
            {p.costType !== undefined && p.costValue > 0 && (
              <span>SP {p.costValue}</span>
            )}
            {p.coolDown > 0 && (
              <span>CD {p.coolDown}s</span>
            )}
          </div>
        )
      })()}

      {postDescText && (
        <div className="text-xs text-archive-dust leading-relaxed mt-1.5 border-t border-archive-border pt-1.5">
          <RichText text={postDescText} />
        </div>
      )}

      {patches.length > 0 && (() => {
        const allSubDescs = patches.flatMap(p => p.subDescDataList)
          .filter(s => !conditionId || s.conditionId === conditionId || s.conditionId === '')
        if (allSubDescs.length === 0) return null
        return (
          <div className="flex flex-wrap gap-1 mt-2">
            {allSubDescs.map((s, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                {s.name?.text || s.name?.id || ''}: {s.desc}
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function SkillGroupCard({ group, skillPatchMap }: { group: SkillGroup; skillPatchMap: Record<string, SkillPatchData[]> }) {
  const [level, setLevel] = useState(13)
  const { locale } = useLocale()
  const { t } = useI18n()

  const isDual = !!(group.condition1 && group.condition2 && group.condition1.conditionId)

  const typeName = t(SKILL_TYPE_LABELS[group.skillGroupType]) ?? t('common.unknown')
  const groupName = localeText(group.name, locale)
  const groupDesc = localeText(group.desc, locale)

  /* --- patches for each condition (dual) or all (single) --- */
  const singlePatches = useMemo(() => getPatchesAtLevel(group, skillPatchMap, level), [group, skillPatchMap, level])
  const singleBlackboards = useMemo(() => collectBlackboards(singlePatches), [singlePatches])

  const condPatches1 = useMemo(() => {
    if (!isDual) return singlePatches
    return getPatchesForSkill(group.skillIdList[0], skillPatchMap, level)
  }, [isDual, group, skillPatchMap, level, singlePatches])

  const condPatches2 = useMemo(() => {
    if (!isDual) return []
    const skillId = group.condition2?.skillId || group.skillIdList[0]
    return getPatchesForSkill(skillId, skillPatchMap, level)
  }, [isDual, group, skillPatchMap, level])

  const condBB1 = useMemo(() => collectBlackboards(condPatches1), [condPatches1])
  const condBB2 = useMemo(() => collectBlackboards(condPatches2), [condPatches2])

  /* --- main description: shared group.desc with blackboard --- */
  const mainDescText = useMemo(() => {
    if (!groupDesc) return ''
    return formatBlackboard(groupDesc, singleBlackboards)
  }, [groupDesc, singleBlackboards])

  /* --- condition-specific post-desc --- */
  const cond1 = group.condition1!
  const cond2 = group.condition2!

  const postDescText1 = useMemo(() => {
    if (!cond1?.postDesc || !isDual) return ''
    const bb = Object.keys(condBB1).length > 0 ? condBB1 : singleBlackboards
    return formatBlackboard(cond1.postDesc, bb)
  }, [cond1?.postDesc, condBB1, singleBlackboards, isDual])

  const postDescText2 = useMemo(() => {
    if (!cond2?.postDesc || !isDual) return ''
    const bb = Object.keys(condBB2).length > 0 ? condBB2 : singleBlackboards
    return formatBlackboard(cond2.postDesc, bb)
  }, [cond2?.postDesc, condBB2, singleBlackboards, isDual])

  const condDesc1 = useMemo(() => {
    if (!cond1?.desc || !isDual) return ''
    const bb = Object.keys(condBB1).length > 0 ? condBB1 : singleBlackboards
    return formatBlackboard(cond1.desc, bb)
  }, [cond1?.desc, condBB1, singleBlackboards, isDual])

  const condDesc2 = useMemo(() => {
    if (!cond2?.desc || !isDual) return ''
    const bb = Object.keys(condBB2).length > 0 ? condBB2 : singleBlackboards
    return formatBlackboard(cond2.desc, bb)
  }, [cond2?.desc, condBB2, singleBlackboards, isDual])

  const condInactive1 = useMemo(() => {
    if (!cond1?.descInactive || !isDual) return ''
    const bb = Object.keys(condBB1).length > 0 ? condBB1 : singleBlackboards
    return formatBlackboard(cond1.descInactive, bb)
  }, [cond1?.descInactive, condBB1, singleBlackboards, isDual])

  const condInactive2 = useMemo(() => {
    if (!cond2?.descInactive || !isDual) return ''
    const bb = Object.keys(condBB2).length > 0 ? condBB2 : singleBlackboards
    return formatBlackboard(cond2.descInactive, bb)
  }, [cond2?.descInactive, condBB2, singleBlackboards, isDual])

  return (
    <div className="p-3 rounded border border-archive-border bg-archive-file">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-archive-gold/20 text-archive-gold font-mono">{typeName}</span>
        <span className="text-sm font-medium text-archive-ivory truncate">{groupName || group.skillGroupId}</span>
      </div>

      {isDual ? (
        <>
          {mainDescText && (
            <div className="text-xs text-archive-dust leading-relaxed mb-3">
              <RichText text={mainDescText} />
            </div>
          )}
          <div className="flex gap-3">
            <SkillFormColumn
              icon={cond1.icon || group.icon}
              name={cond1.name}
              patches={condPatches1}
              postDescText={postDescText1}
              conditionId={cond1.conditionId}
              condDesc={condDesc1}
              condDescInactive={condInactive1}
            />
            <SkillFormColumn
              icon={cond2.icon || group.icon}
              name={cond2.name}
              patches={condPatches2}
              postDescText={postDescText2}
              conditionId={cond2.conditionId}
              condDesc={condDesc2}
              condDescInactive={condInactive2}
            />
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded border border-archive-border bg-archive-ink overflow-hidden shrink-0 flex items-center justify-center">
            {group.icon ? (
              <img
                src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/skillicon/${group.icon}.png`}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span className="text-xs text-archive-lead">?</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {singlePatches.length > 0 && (() => {
              const p = singlePatches[0]
              return (
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-archive-lead mt-1">
                  {p.costType !== undefined && p.costValue > 0 && (
                    <span>SP {p.costValue}</span>
                  )}
                  {p.coolDown > 0 && (
                    <span>CD {p.coolDown}s</span>
                  )}
                  <span>Lv.{level}</span>
                  {level === 13 && <span className="text-[10px] text-archive-gold">M3</span>}
                </div>
              )
            })()}

            {mainDescText && (
              <div className="text-xs text-archive-dust leading-relaxed mt-2">
                <RichText text={mainDescText} />
              </div>
            )}

            {singlePatches.length > 0 && (() => {
              const allSubDescs = singlePatches.flatMap(p => p.subDescDataList).filter(s => !s.conditionId)
              if (allSubDescs.length === 0) return null
              return (
                <div className="flex flex-wrap gap-1 mt-2">
                  {allSubDescs.map((s, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                      {s.name?.text || s.name?.id || ''}: {s.desc}
                    </span>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 mt-3">
        <span className="text-[10px] text-archive-lead">{t('common.level', { level: '' }).replace(/\d+/, '')}</span>
        <input
          type="range"
          min={1}
          max={13}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="flex-1 h-1 accent-archive-gold"
        />
        <span className="text-[10px] text-archive-gold font-mono w-6 text-right">
          {level}
        </span>
      </div>
    </div>
  )
}
