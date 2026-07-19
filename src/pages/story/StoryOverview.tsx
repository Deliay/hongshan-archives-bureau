import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useDocuments } from '../../hooks/useData'
import { useI18n } from '../../i18n'

export default function StoryOverview() {
  const { t } = useI18n()
  const { data: docs, loading, error } = useDocuments()
  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!docs || docs.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('story.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.story}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {docs.map((doc) => (
          <div key={doc.id} className="p-3 rounded border border-archive-border bg-archive-file">
            <p className="text-sm text-archive-ivory">{doc.title || doc.id}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
