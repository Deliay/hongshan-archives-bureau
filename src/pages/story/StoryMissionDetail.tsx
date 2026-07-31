import { Link, useParams } from 'react-router-dom'
import { useMissionDetail } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { Badge } from '../../components/ui/Badge'

export default function StoryMissionDetail() {
  const { missionId } = useParams<{ missionId: string }>()
  const { t } = useI18n()
  const { data: mission, loading, error } = useMissionDetail(missionId || '')

  if (loading) return <DetailSkeleton />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!mission) return <div className="text-archive-dust text-sm p-6">{t('common.empty')}</div>

  const mainPath = mission.quests.filter(q => q.inMainPath)
  const branch = mission.quests.filter(q => !q.inMainPath)

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
        <p className="text-sm text-archive-ivory leading-relaxed">
          {mission.description || t('story.noDescription')}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-mono text-archive-gold uppercase mb-3">{t('story.missionObjectives')}</h3>
        {mission.quests.length === 0 && <p className="text-archive-dust text-sm">{t('common.empty')}</p>}
        {mainPath.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-archive-dust mb-2">{t('story.mainPath')}</div>
            <div className="space-y-3">
              {mainPath.map(q => (
                <QuestCard key={q.questId} quest={q} />
              ))}
            </div>
          </div>
        )}
        {branch.length > 0 && (
          <div>
            <div className="text-xs text-archive-dust mb-2">{t('story.branch')}</div>
            <div className="space-y-3">
              {branch.map(q => (
                <QuestCard key={q.questId} quest={q} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

interface QuestCardProps {
  quest: {
    questId: string
    questType: number
    description: string
    objectives: { description: string }[]
    prevQuestIds: string[]
  }
}

function QuestCard({ quest }: QuestCardProps) {
  return (
    <div className="border border-archive-border rounded-lg p-3 bg-archive-file">
      <div className="font-mono text-xs text-archive-gold mb-1">{quest.questId}</div>
      {quest.description && (
        <p className="text-sm text-archive-ivory leading-relaxed mb-2">{quest.description}</p>
      )}
      {quest.objectives.length > 0 && (
        <ul className="list-disc list-inside text-sm text-archive-dust space-y-0.5">
          {quest.objectives.map(o => (
            <li key={o.description || quest.questId}>{o.description || '·'}</li>
          ))}
        </ul>
      )}
      {quest.prevQuestIds.length > 0 && (
        <div className="mt-2 text-[11px] font-mono text-archive-lead">
          {'← '}{quest.prevQuestIds.join(', ')}
        </div>
      )}
    </div>
  )
}
