import { useState, useRef, useCallback } from 'react'
import { getAudioUrl } from '../lib/audio'

let currentAudio: HTMLAudioElement | null = null
let currentSetPlaying: ((v: boolean) => void) | null = null

interface VoicePlayerProps {
  voId: string
  locale: string
}

export default function VoicePlayer({ voId, locale }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopOther = useCallback(() => {
    if (currentAudio && currentAudio !== audioRef.current) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentSetPlaying?.(false)
      currentAudio = null
      currentSetPlaying = null
    }
  }, [])

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(getAudioUrl(voId, locale))
      audioRef.current.addEventListener('ended', () => {
        setPlaying(false)
        if (currentAudio === audioRef.current) {
          currentAudio = null
          currentSetPlaying = null
        }
      })
      audioRef.current.addEventListener('error', () => {
        setPlaying(false)
        if (currentAudio === audioRef.current) {
          currentAudio = null
          currentSetPlaying = null
        }
      })
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
      if (currentAudio === audioRef.current) {
        currentAudio = null
        currentSetPlaying = null
      }
    } else {
      stopOther()
      audioRef.current.play().catch(() => {
        setPlaying(false)
      })
      setPlaying(true)
      currentAudio = audioRef.current
      currentSetPlaying = setPlaying
    }
  }, [playing, voId, locale, stopOther])

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
      aria-label={playing ? 'Pause' : 'Play'}
    >
      {playing ? (
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
