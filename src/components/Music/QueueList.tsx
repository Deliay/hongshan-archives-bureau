import { useI18n } from '../../i18n'
import { useMusicPlayer, playAt, clearQueue } from '../../lib/musicPlayer'

interface QueueListProps {
  onItemClick?: () => void
}

function MicIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5z" />
      <rect x="11" y="17" width="2" height="4" />
    </svg>
  )
}

export default function QueueList({ onItemClick }: QueueListProps) {
  const { t } = useI18n()
  const { queue, currentIndex } = useMusicPlayer()

  return (
    <div data-testid="play-queue">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-archive-border">
        <h3 className="text-xs font-bold text-archive-ivory">{t('musicPlayer.queue')}</h3>
        {queue.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearQueue() }}
            className="ml-auto text-[10px] text-archive-lead hover:text-archive-ivory transition-colors"
          >
            {t('musicPlayer.clear')}
          </button>
        )}
      </div>
      {queue.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-archive-lead">{t('musicPlayer.queueEmpty')}</p>
      ) : (
        <ul>
          {queue.map((item, idx) => {
            const isCurrent = idx === currentIndex
            return (
              <li key={`${item.id}-${idx}`}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); playAt(idx); onItemClick?.() }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-archive-border/50 ${isCurrent ? 'bg-archive-gold/10' : ''}`}
                >
                  <span className={`w-4 shrink-0 text-right text-[10px] font-mono ${isCurrent ? 'text-archive-gold' : 'text-archive-lead'}`}>
                    {idx + 1}
                  </span>
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                  ) : (
                    <MicIcon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-archive-gold' : 'text-archive-lead'}`} />
                  )}
                  <span className={`flex-1 min-w-0 truncate text-xs ${isCurrent ? 'text-archive-gold' : 'text-archive-ivory'}`}>
                    {item.name}
                  </span>
                  <span className="shrink-0 max-w-[40%] truncate text-[10px] text-archive-lead">
                    {item.kind === 'voice' ? t('musicPlayer.voice') : item.albumName}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
