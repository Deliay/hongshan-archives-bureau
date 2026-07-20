import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTableDiff } from '../../hooks/useUpdateDiff'
import { getTableDiffComponent } from '../../components/DiffViewer/registry'
import { useI18n } from '../../i18n'

export default function UpdateTableDiff() {
  const { versionName, tableFile } = useParams<{ versionName: string; tableFile: string }>()
  const decodedFile = tableFile ? decodeURIComponent(tableFile) : ''
  const { data: diff, loading, error } = useTableDiff(versionName ?? '', decodedFile)

  const tableName = decodedFile.replace('.json', '')
  const DiffComponent = useMemo(() => getTableDiffComponent(tableName), [tableName])

  const { t } = useI18n()

  if (!versionName || !tableFile) {
    return <div className="text-red-400 text-sm">{t('common.missingParam')}</div>
  }

  if (loading) return <PageSkeleton lines={4} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!diff) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/archive/updates/${versionName}`}
          className="text-sm text-archive-dust hover:text-archive-gold transition-colors"
        >
          ← {t('update.backToSummary')}
        </Link>
        <h2 className="text-xl font-bold text-archive-ivory mt-2 mb-1 font-mono break-all">
          {tableName}
        </h2>
        <p className="text-sm text-archive-lead">
          {t('update.versionLabel', { old: diff.versionOld, new: diff.versionNew })}
        </p>
      </div>

      <DiffComponent diff={diff} />
    </div>
  )
}
