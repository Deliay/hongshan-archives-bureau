import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStoryRecap } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { MissionDetailContent } from './StoryMissionDetail'

const CHAPTER_TYPES = ['a', 'c', 'db', 'dm', 'e', 'f', 'gm', 'hidden', 'm', 'sm', 'other']

const chapterTypeLabel = (ct: string) => (ct === 'other' ? 'OTHER' : ct.toUpperCase())

export default function StoryRecap() {
  const { t } = useI18n()
  const { data, loading, error } = useStoryRecap()
  const [searchParams, setSearchParams] = useSearchParams()
  const typeFilter = searchParams.get('type') || ''
  const missionParam = searchParams.get('mission') || ''

  const filteredChapters = useMemo(() => {
    if (!data) return []
    if (!typeFilter) return data.chapters
    return data.chapters.filter(c => c.chapterType === typeFilter)
  }, [data, typeFilter])

  const allMissions = useMemo(
    () => (data ? data.chapters.flatMap(ch => ch.missions) : []),
    [data],
  )

  const selectedMission = useMemo(() => {
    if (!missionParam) return allMissions[0] ?? null
    return allMissions.find(m => m.missionId === missionParam) ?? null
  }, [missionParam, allMissions])

  useEffect(() => {
    if (!missionParam && allMissions.length > 0) {
      setSearchParams({ mission: allMissions[0].missionId }, { replace: true })
    }
  }, [missionParam, allMissions, setSearchParams])

  if (loading) return <ListSkeleton cards={12} />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!data) return null

  const handleNavClick = (missionId: string) => {
    const next: Record<string, string> = { mission: missionId }
    if (typeFilter) next.type = typeFilter
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-archive-ink border-b border-archive-border px-6 py-3 flex items-center gap-4">
        <select
          value={typeFilter}
          onChange={(e) => {
            const next: Record<string, string> = {}
            if (e.target.value) next.type = e.target.value
            if (selectedMission) next.mission = selectedMission.missionId
            setSearchParams(next)
          }}
          className="bg-archive-file border border-archive-border text-archive-ivory text-sm rounded px-3 py-1.5"
        >
          <option value="">{t('story.typeAll')}</option>
          {CHAPTER_TYPES.map(ct => (
            <option key={ct} value={ct}>{chapterTypeLabel(ct)}</option>
          ))}
        </select>
        <span className="text-xs text-archive-dust">{t('story.spoilerHint')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-6">
        <nav className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto space-y-4">
          {filteredChapters.map(ch => (
            <div key={ch.chapterId}>
              <div className="text-xs font-mono text-archive-gold uppercase mb-1">
                {ch.chapterId.toUpperCase()}
              </div>
              {ch.missions.map(m => {
                const active = selectedMission?.missionId === m.missionId
                return (
                  <button
                    key={m.missionId}
                    type="button"
                    onClick={() => handleNavClick(m.missionId)}
                    className={`block pl-4 text-sm w-full text-left cursor-pointer transition-colors ${active ? 'text-archive-gold border-l-2 border-archive-gold' : 'text-archive-dust hover:text-archive-gold'}`}
                  >
                    <span className="break-words">{m.name} <span className="font-mono text-[11px] text-archive-dust/70">{m.missionId}</span></span>
                  </button>
                )
              })}
            </div>
          ))}
          {filteredChapters.length === 0 && (
            <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
          )}
        </nav>

        <div className="min-w-0">
          {selectedMission ? (
            <MissionDetailContent missionId={selectedMission.missionId} embedded />
          ) : (
            <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
