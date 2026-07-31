import { Link } from 'react-router-dom'
import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useStoryRecap, usePrtsLibrary } from '../../hooks/useData'
import { useI18n } from '../../i18n'

export default function StoryOverview() {
  const { t } = useI18n()
  const { data: recap, loading: recapLoading } = useStoryRecap()
  const { data: library, loading: libLoading } = usePrtsLibrary()

  if (recapLoading || libLoading) return <PageSkeleton />

  const recapCount = recap?.stats.total ?? 0
  const libCount = library?.items.length ?? 0

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-display text-3xl font-bold text-archive-ivory">{t('nav.story')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.story}</Badge>
      </div>
      <p className="text-sm text-archive-dust mb-8">{t('nav.storyDesc')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/archive/story/recap"
          className="group p-6 rounded-lg border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors"
        >
          <div className="text-2xl font-mono text-archive-gold mb-1">{recapCount}<span className="text-sm ml-1">段</span></div>
          <h3 className="text-lg font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">{t('story.recap')}</h3>
          <p className="text-sm text-archive-dust mt-1">{t('story.recapDesc')}</p>
        </Link>
        <Link
          to="/archive/story/library"
          className="group p-6 rounded-lg border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors"
        >
          <div className="text-2xl font-mono text-archive-gold mb-1">{libCount}<span className="text-sm ml-1">条</span></div>
          <h3 className="text-lg font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">{t('story.library')}</h3>
          <p className="text-sm text-archive-dust mt-1">{t('story.libraryDesc')}</p>
        </Link>
      </div>

      <p className="text-xs text-archive-dust mt-6">{t('story.spoilerHint')}</p>
    </div>
  )
}
