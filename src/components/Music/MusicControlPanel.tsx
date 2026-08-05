import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useMusicPlayer, togglePlay, playNext, playPrev } from '../../lib/musicPlayer'
import QueueList from './QueueList'

interface MusicControlPanelProps {
  onNavigate?: () => void
}

export default function MusicControlPanel({ onNavigate }: MusicControlPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { queue, currentIndex, playing, currentTime, duration } = useMusicPlayer()
  const [queueOpen, setQueueOpen] = useState(false)
  const current = currentIndex >= 0 ? queue[currentIndex] : null

  const goPlaylist = () => {
    navigate('/archive/music')
    onNavigate?.()
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const queueButton = (
    <button
      type="button"
      aria-label={t('musicPlayer.queue')}
      title={t('musicPlayer.queue')}
      onClick={(e) => { e.stopPropagation(); setQueueOpen(v => !v) }}
      className="w-5 h-5 flex items-center justify-center rounded hover:bg-archive-border transition-colors shrink-0"
    >
      <svg className={`w-3.5 h-3.5 ${queueOpen ? 'text-archive-gold' : 'text-archive-dust'}`} viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="5" width="18" height="2" />
        <rect x="3" y="11" width="18" height="2" />
        <rect x="3" y="17" width="18" height="2" />
      </svg>
    </button>
  )

  return (
    <div className="relative">
      {queueOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-auto rounded border border-archive-border bg-archive-file shadow-lg z-40">
          <QueueList onItemClick={() => setQueueOpen(false)} />
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={goPlaylist}
        onKeyDown={(e) => { if (e.key === 'Enter') goPlaylist() }}
        className="w-full rounded border border-archive-border bg-archive-file px-3 py-2 cursor-pointer hover:border-archive-lead transition-colors"
      >
        {!current ? (
          <div className="flex items-center gap-2 text-sm text-archive-dust">
            <svg className="w-4 h-4 shrink-0 text-archive-lead" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
            <span>{t('musicPlayer.title')}</span>
            <span className="text-xs text-archive-lead ml-auto">{t('musicPlayer.empty')}</span>
            {queueButton}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {current.iconUrl ? (
                <img src={current.iconUrl} alt="" className="w-6 h-6 rounded shrink-0 object-contain" />
              ) : (
                <svg className="w-4 h-4 shrink-0 text-archive-gold" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5z" />
                  <rect x="11" y="17" width="2" height="4" />
                </svg>
              )}
              <div className="min-w-0">
                <p className="text-xs text-archive-ivory truncate">{current.name}</p>
                <p className="text-[10px] text-archive-lead truncate">
                  {current.kind === 'voice' ? `${t('musicPlayer.voice')} · ${current.albumName}` : current.albumName}
                </p>
              </div>
              <div className="ml-auto">{queueButton}</div>
            </div>
            <div className="h-0.5 rounded bg-archive-border overflow-hidden">
              <div className="h-full bg-archive-gold transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label={t('musicPlayer.previous')}
                onClick={(e) => { e.stopPropagation(); playPrev() }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
              >
                <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="19,20 9,12 19,4" />
                  <rect x="5" y="4" width="2" height="16" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={playing ? t('musicPlayer.pause') : t('musicPlayer.play')}
                onClick={(e) => { e.stopPropagation(); togglePlay() }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
              >
                {playing ? (
                  <svg className="w-3 h-3 text-archive-gold" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-archive-gold" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                aria-label={t('musicPlayer.next')}
                onClick={(e) => { e.stopPropagation(); playNext() }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
              >
                <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,4 15,12 5,20" />
                  <rect x="17" y="4" width="2" height="16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
