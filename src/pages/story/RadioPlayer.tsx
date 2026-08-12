import { useMemo } from 'react'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import { useDialogAudio, type DialogAudioTrack } from '../../lib/dialogAudio'
import { LinePlayButton, useAudioAvailability } from './LinePlayButton'

interface RadioScriptEntry {
  id: string
  speaker: string
  line: string
  voId: string
}

export function RadioPlayer({ script }: { script: RadioScriptEntry[] }) {
  const { t } = useI18n()
  const { locale } = useLocale()
  const voIds = useMemo(() => script.map(s => s.voId).filter(Boolean), [script])
  const available = useAudioAvailability(voIds, locale)

  const tracks = useMemo(
    () => script
      .filter(s => s.voId && available[s.voId])
      .map(s => ({
        lineKey: s.id,
        voId: s.voId,
        locale,
        actorName: s.speaker,
        dialogText: s.line,
      }) as DialogAudioTrack),
    [script, available, locale],
  )

  const { tracks: globalTracks, currentIndex } = useDialogAudio()
  const currentVoId = globalTracks[currentIndex]?.voId
  const currentLineKey = currentVoId ? script.find(s => s.voId === currentVoId)?.id : undefined

  return (
    <div>
      <h3 className="text-lg font-medium text-archive-ivory mt-6 mb-4">{t('story.audioTranscript')}</h3>
      {script.length === 0 && (
        <p className="text-archive-dust text-sm">{t('story.emptyContent')}</p>
      )}
      <div className="space-y-1">
        {script.map(entry => (
          <div
            key={entry.id}
            data-active={currentLineKey === entry.id}
            className={
              currentLineKey === entry.id
                ? 'flex gap-3 rounded bg-archive-gold/10 px-1.5 py-1 -mx-1.5'
                : 'flex gap-3'
            }
          >
            <div className="w-20 shrink-0 pt-0.5 text-right">
              <span className="text-xs font-medium text-archive-gold">{entry.speaker}</span>
            </div>
            <div className="min-w-0 flex-1 border-l border-archive-gold/30 pl-3">
              <div className="flex items-center gap-1.5">
                {entry.voId && available[entry.voId] && (
                  <LinePlayButton voId={entry.voId} lineKey={entry.id} tracks={tracks} />
                )}
                <span className="font-mono text-[10px] text-archive-lead/70">{entry.id}</span>
              </div>
              <p className="text-sm text-archive-ivory leading-relaxed mt-0.5">
                <RichText text={entry.line} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
