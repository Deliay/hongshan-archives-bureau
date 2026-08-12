import { useEffect, useState } from 'react'
import { checkAudioUrl, getAudioUrl } from '../../lib/audio'
import { playFrom, togglePlay, useDialogAudio, type DialogAudioTrack } from '../../lib/dialogAudio'

export function LinePlayButton({ voId, lineKey, tracks }: { voId: string; lineKey: string; tracks: DialogAudioTrack[] }) {
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

export function useAudioAvailability(voIds: string[], locale: string): Record<string, boolean> {
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
