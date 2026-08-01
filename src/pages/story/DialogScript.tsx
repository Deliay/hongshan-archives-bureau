import { useDialogScript } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import VoicePlayer from '../../components/VoicePlayer'

export function DialogScript({ dlgKey }: { dlgKey: string }) {
  const { t } = useI18n()
  const { locale } = useLocale()
  const { data, loading, error } = useDialogScript(dlgKey)

  if (loading) return <p className="text-sm text-archive-lead">{t('common.loadingArchive')}</p>
  if (error) return <p className="text-sm text-red-400">{t('common.loadFailed')}</p>
  if (!data || data.length === 0) return <p className="text-sm text-archive-lead italic">{t('story.noScene')}</p>

  return (
    <div className="space-y-3">
      {data.map(line => (
        <div key={line.key} className="flex gap-3">
          <div className="w-20 shrink-0 pt-0.5 text-right">
            <span className="text-xs font-medium text-archive-gold">{line.actorName}</span>
          </div>
          <div className="min-w-0 flex-1 border-l border-archive-gold/30 pl-3">
            <div className="flex items-center gap-1.5">
              {line.audioOverride && <VoicePlayer voId={line.audioOverride} locale={locale} />}
              <span className="font-mono text-[10px] text-archive-lead/70">{line.key}</span>
            </div>
            <p className="text-sm text-archive-ivory leading-relaxed mt-0.5">
              <RichText text={line.dialogText} />
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
