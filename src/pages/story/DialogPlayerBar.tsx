import { useDialogAudio, playNext, playPrev, togglePlay, stop } from '../../lib/dialogAudio'
import { useI18n } from '../../i18n'
import { RichText } from '../../lib/richText'

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function DialogPlayerBar() {
  const { t } = useI18n()
  const { tracks, currentIndex, playing, currentTime, duration } = useDialogAudio()
  const track = tracks[currentIndex]
  if (!track) return null
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  return (
    <div
      data-testid="dialog-player-bar"
      className="sticky top-0 z-30 mb-3 rounded border border-archive-gold/30 bg-archive-file/95 px-3 py-2 shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-archive-dust shrink-0">{t('story.audioNowPlaying')}</span>
        <span className="text-xs font-medium text-archive-gold truncate">{track.actorName}</span>
        <span className="font-mono text-[10px] text-archive-lead/70 shrink-0">{track.lineKey}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={playPrev}
          aria-label="Previous"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
        >
          <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19,20 9,12 19,4" />
            <rect x="5" y="4" width="2" height="16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
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
          onClick={playNext}
          aria-label="Next"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
        >
          <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20" />
            <rect x="17" y="4" width="2" height="16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label="Stop"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
        >
          <svg className="w-2.5 h-2.5 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" />
          </svg>
        </button>
        <div className="flex-1 h-1.5 rounded bg-archive-border overflow-hidden">
          <div className="h-full bg-archive-gold/70" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-archive-lead shrink-0">
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>
      </div>
      {track.dialogText && (
        <div className="mt-1 text-xs text-archive-ivory leading-relaxed line-clamp-2">
          <RichText text={track.dialogText} />
        </div>
      )}
    </div>
  )
}
