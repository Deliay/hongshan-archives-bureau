import { useLevelInfo } from '../../hooks/useData'
import { useI18n } from '../../i18n'

export default function LevelDisplay({ levelId }: { levelId: string }) {
  const { t } = useI18n()
  const { data, loading } = useLevelInfo(levelId)

  if (loading) return <span className="text-archive-lead">{t('common.loadingArchive')}</span>
  if (!data) return <span className="font-mono text-archive-lead">{levelId}</span>

  if (data.mapName) {
    return <span>{t('story.levelNameFormat', { mapName: data.mapName, levelName: data.levelName })}</span>
  }
  return <span className="font-mono text-archive-ivory">{data.levelName}</span>
}
