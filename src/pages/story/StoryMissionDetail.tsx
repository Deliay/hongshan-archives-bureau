import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMissionDetail } from '../../hooks/useData'
import type { MissionConditionArgResolver } from '../../hooks/useData'
import type { ActivityStageDetail } from '../../lib/missionConditionNames'
import { useI18n } from '../../i18n'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { Badge } from '../../components/ui/Badge'
import { RichText } from '../../lib/richText'
import { buildMissionQuestTree } from '../../lib/adapter'
import { ObjectiveCondition } from './ObjectiveCondition'
import type { MissionQuestTreeNode } from '../../lib/types'

export default function StoryMissionDetail() {
  const { missionId } = useParams<{ missionId: string }>()
  const { t } = useI18n()
  const { data, loading, error } = useMissionDetail(missionId || '')
  const mission = data?.mission ?? null
  const resolveArg = data?.conditionResolver?.resolveArg
  const stageDetail = data?.conditionResolver?.stageDetail
  const rewardTable = data?.conditionResolver?.rewardTable

  const tree = useMemo(
    () => (mission ? buildMissionQuestTree(mission.mainPathQuests, mission.quests) : []),
    [mission],
  )

  if (loading) return <DetailSkeleton />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!mission) return <div className="text-archive-dust text-sm p-6">{t('common.empty')}</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link
        to="/archive/story/recap"
        className="text-sm text-archive-dust hover:text-archive-gold transition-colors mb-4 inline-block"
      >
        &larr; {t('story.backToRecap')}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="ghost" className="text-xs font-mono">{mission.missionId}</Badge>
          <Badge variant="gold" className="text-xs">Type {mission.missionType}</Badge>
          {mission.isWrapperMission && <Badge variant="seal" className="text-xs">wrapper</Badge>}
        </div>
        <h2 className="font-display text-2xl font-bold text-archive-ivory mt-2">{mission.name || mission.missionId}</h2>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
        {mission.charId && (
          <div className="flex gap-2">
            <dt className="text-archive-dust shrink-0">{t('story.relatedOperator')}</dt>
            <dd className="text-archive-ivory font-mono">{mission.charId}</dd>
          </div>
        )}
        {mission.levelId && (
          <div className="flex gap-2">
            <dt className="text-archive-dust shrink-0">{t('story.relatedLevel')}</dt>
            <dd className="text-archive-ivory font-mono">{mission.levelId}</dd>
          </div>
        )}
      </dl>

      <section className="mb-8">
        <h3 className="text-xs font-mono text-archive-gold uppercase mb-2">{t('story.missionDesc')}</h3>
        {mission.description ? (
          <p className="text-sm text-archive-ivory leading-relaxed">
            <RichText text={mission.description} />
          </p>
        ) : (
          <p className="text-sm text-archive-dust">{t('story.noDescription')}</p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-mono text-archive-gold uppercase mb-3">{t('story.missionObjectives')}</h3>
        {tree.length === 0 && <p className="text-archive-dust text-sm">{t('common.empty')}</p>}
        <div className="space-y-3">
          {tree.map(root => (
            <QuestNode key={root.questId} node={root} resolveArg={resolveArg} stageDetail={stageDetail} rewardTable={rewardTable} />
          ))}
        </div>
      </section>
    </div>
  )
}

function QuestNode({
  node,
  resolveArg,
  stageDetail,
  rewardTable,
}: {
  node: MissionQuestTreeNode
  resolveArg?: MissionConditionArgResolver
  stageDetail?: (stageId: string) => ActivityStageDetail | null
  rewardTable?: Record<string, any>
}) {
  const { t } = useI18n()
  return (
    <div>
      <div className="border border-archive-border rounded-md p-3 bg-archive-file/40">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-archive-gold">{node.questId}</span>
          {node.inMainPath && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-archive-gold/20 text-archive-gold">{t('story.mainPath')}</span>
          )}
        </div>
        {node.description && (
          <p className="text-sm text-archive-ivory leading-relaxed mt-1"><RichText text={node.description} /></p>
        )}
        {node.objectives.length > 0 && (
          <ul className="list-none text-sm text-archive-dust space-y-1 mt-1">
            {node.objectives.map(o => (
              <li key={o.description || o.condition?.type || node.questId} className="flex flex-col">
                <span>{o.description ? <RichText text={o.description} /> : '·'}</span>
                {o.condition && <ObjectiveCondition condition={o.condition} resolveArg={resolveArg} stageDetail={stageDetail} rewardTable={rewardTable} />}
              </li>
            ))}
          </ul>
        )}
        {node.prevQuestIds.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 border-l-2 border-archive-gold/40 pl-2">
            <Badge variant="ghost" className="text-[10px]">{t('story.prevQuest')}</Badge>
            <span className="text-[11px] font-mono text-archive-lead">{node.prevQuestIds.join(', ')}</span>
          </div>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="ml-3 mt-1 pl-3 border-l border-archive-gold/20 space-y-3">
          {node.children.map(child => (
            <QuestNode key={child.questId} node={child} resolveArg={resolveArg} stageDetail={stageDetail} rewardTable={rewardTable} />
          ))}
        </div>
      )}
    </div>
  )
}
