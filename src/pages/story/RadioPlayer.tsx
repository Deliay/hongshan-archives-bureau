import { useMemo, useState, useEffect } from 'react'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import { getAudioUrl, checkAudioUrl } from '../../lib/audio'
import { useDialogAudio, playFrom, togglePlay, type DialogAudioTrack } from '../../lib/dialogAudio'

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

  const { currentIndex } = useDialogAudio()
  const currentLineKey = tracks[currentIndex]?.lineKey

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
                  <LinePlayButton lineKey={entry.id} tracks={tracks} />
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

function LinePlayButton({ lineKey, tracks }: { lineKey: string; tracks: DialogAudioTrack[] }) {
  const { currentIndex, playing } = useDialogAudio()
  const current = tracks[currentIndex]
  const isCurrent = current?.lineKey === lineKey
  const isPlaying = isCurrent && playing

  const handleClick = () => {
    if (isCurrent) {
      togglePlay()
    } else {
      const index = tracks.findIndex(tr => tr.lineKey === lineKey)
      if (index >= 0) playFrom(tracks, index)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-5 h-5 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
      aria-label={isPlaying ? 'Pause' : 'Play'}
      data-testid={`line-play-${lineKey}`}
    >
      {isPlaying ? (
        <svg className="w-3 h-3 text-archive-gold" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </button>
  )
}

function useAudioAvailability(voIds: string[], locale: string): Record<string, boolean> {
  const [map, setMap] = useState<Record<string, boolean>>({})
  const key = voIds.join('|')
  useEffect(() => {
    let cancelled = false
    const ids = key ? key.split('|') : []
    const next: Record<string, boolean> = {}
    Promise.all(ids.map(async id => {
      const ok = await checkAudioUrl(getAudioUrl(id, locale))
      next[id] = ok
      if (!cancelled) setMap({ ...next })
    })).catch(() => {})
    return () => { cancelled = true }
  }, [key, locale])
  return map
}
