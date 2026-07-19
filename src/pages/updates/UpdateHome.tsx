import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { Link } from 'react-router-dom'
import { useManifest } from '../../hooks/useUpdateDiff'
import { useI18n } from '../../i18n'

export default function UpdateHome() {
  const { t } = useI18n()
  const { data: manifest, loading, error } = useManifest()

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!manifest || manifest.folders.length === 0) return <div className="text-archive-dust text-sm">{t('update.noUpdates')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('update.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.updates}</Badge>
      </div>
      <p className="text-sm text-archive-dust mb-6">
        {t('update.versionPair', { count: manifest.folders.length })} · {t('update.lastGenerated', { time: manifest.generatedAt })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {manifest.folders.toReversed().map((folder) => (
          <Link
            key={folder.name}
            to={`/archive/updates/${folder.name}`}
            className="block p-4 rounded border border-archive-border bg-archive-file
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <h3 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
              {t('update.generatedAt', { time: manifest.generatedAt })}
            </h3>
            <p className="text-xs text-archive-lead mt-1 font-mono">
              {folder.name.replace(/__/g, '  →  ')}
            </p>
            {folder.description && (
              <p className="text-xs text-archive-dust mt-1">{folder.description}</p>
            )}
            <p className="text-xs text-archive-lead mt-2">
              {t('update.tableChanged', { count: folder.fileCount })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
