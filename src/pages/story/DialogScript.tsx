import { useEffect, useMemo, useState } from 'react'
import { useDialogScript } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import { getAudioUrl, checkAudioUrl } from '../../lib/audio'
import { useDialogAudio, playFrom, togglePlay, type DialogAudioTrack } from '../../lib/dialogAudio'

export function DialogScript({ dlgKey }: { dlgKey: string }) {
  const { t } = useI18n()
  const { locale } = useLocale()
  const { data, loading, error } = useDialogScript(dlgKey)

  const lines = data ?? []
  const voIds = useMemo(
    () => lines.filter(l => l.audioOverride).map(l => l.audioOverride),
    [lines],
  )
  const available = useAudioAvailability(voIds, locale)

  const tracks = useMemo(
    () => lines
      .filter(l => l.audioOverride && available[l.audioOverride])
      .map(l => ({
        lineKey: l.key,
        voId: l.audioOverride!,
        locale,
        actorName: l.actorName,
        dialogText: l.dialogText,
      })),
    [lines, available, locale],
  )

  const { tracks: globalTracks, currentIndex } = useDialogAudio()
  const currentVoId = globalTracks[currentIndex]?.voId
  const currentLineKey = currentVoId ? lines.find(l => l.audioOverride === currentVoId)?.key : undefined

  if (loading) return <p className="text-sm text-archive-lead">{t('common.loadingArchive')}</p>
  if (error) return <p className="text-sm text-red-400">{t('common.loadFailed')}</p>
  if (!data || data.length === 0) return <p className="text-sm text-archive-lead italic">{t('story.noScene')}</p>

  return (
    <div className="space-y-3">
      {data.map(line => (
        <div
          key={line.key}
          data-active={currentLineKey === line.key}
          className={currentLineKey === line.key ? 'flex gap-3 rounded bg-archive-gold/10 px-1.5 py-1 -mx-1.5' : 'flex gap-3'}
        >
          <div className="w-20 shrink-0 pt-0.5 text-right">
            <span className="text-xs font-medium text-archive-gold">{line.actorName}</span>
          </div>
          <div className="min-w-0 flex-1 border-l border-archive-gold/30 pl-3">
            <div className="flex items-center gap-1.5">
              {line.audioOverride && available[line.audioOverride] && (
                <LinePlayButton lineKey={line.key} voId={line.audioOverride} tracks={tracks} />
              )}
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

function LinePlayButton({ lineKey, voId, tracks }: { lineKey: string; voId: string; tracks: DialogAudioTrack[] }) {
  const { tracks: globalTracks, currentIndex, playing } = useDialogAudio()
  const currentVoId = globalTracks[currentIndex]?.voId
  const isCurrent = currentVoId === voId
  const isPlaying = isCurrent && playing

  const handleClick = () => {
    if (isCurrent) {
      togglePlay()
    } else {
      const index = tracks.findIndex(tr => tr.voId === voId)
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
