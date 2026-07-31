import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStoryRecap } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { ListSkeleton } from '../../components/ui/ListSkeleton'

const CHAPTER_TYPES = ['e', 'sm', 'c', 'f', 'gm', 'a', 'db', 'm', 'other']

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

  useEffect(() => {
    if (!data || !missionParam) return
    const el = document.getElementById(`mission-${missionParam}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data, missionParam])

  if (loading) return <ListSkeleton cards={12} />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!data) return null

  const handleNavClick = (missionId: string) => {
    const el = document.getElementById(`mission-${missionId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-archive-ink border-b border-archive-border px-6 py-3 flex items-center gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setSearchParams(e.target.value ? { type: e.target.value } : {})}
          className="bg-archive-file border border-archive-border text-archive-ivory text-sm rounded px-3 py-1.5"
        >
          <option value="">{t('story.typeAll')}</option>
          {CHAPTER_TYPES.map(ct => (
            <option key={ct} value={ct}>{t(`story.chapterType.${ct}`)}</option>
          ))}
        </select>
        <span className="text-xs text-archive-dust">{t('story.spoilerHint')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-6">
        <nav className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto space-y-4">
          {filteredChapters.map(ch => (
            <div key={ch.chapterId}>
              <div className="text-xs font-mono text-archive-gold uppercase mb-1">
                {t(`story.chapterType.${ch.chapterType}`)} {ch.chapterId.toUpperCase()}
              </div>
              {ch.missions.map(m => (
                <button
                  key={m.missionId}
                  type="button"
                  onClick={() => handleNavClick(m.missionId)}
                  className="block pl-4 text-sm text-archive-dust hover:text-archive-gold cursor-pointer w-full text-left"
                >
                  <span className="break-words">{m.name} <span className="font-mono text-[11px] text-archive-dust/70">{m.missionId}</span></span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-6">
          {filteredChapters.map(ch => (
            <div key={ch.chapterId}>
              {ch.missions.map(m => (
                  <div key={m.missionId} id={`mission-${m.missionId}`} className="mb-8">
                    <div className="flex items-baseline gap-2 whitespace-nowrap border-b border-archive-border pb-2 mb-4">
                      <Link
                        to={`/archive/story/mission/${m.missionId}`}
                        className="text-sm text-archive-ivory hover:text-archive-gold transition-colors"
                      >
                        {m.name}
                      </Link>
                      <span className="font-mono text-xs text-archive-gold">{m.missionId}</span>
                    </div>
                  {m.scenes.map(scene => (
                    <div key={scene.id} className="relative pl-6 border-l-2 border-archive-gold/30 mb-4">
                      <div className="font-mono text-xs text-archive-gold mb-1">{scene.code}</div>
                      <p className="text-sm text-archive-ivory leading-relaxed">{scene.text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {filteredChapters.length === 0 && (
            <div className="text-center text-archive-dust py-12">{t('common.empty')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
