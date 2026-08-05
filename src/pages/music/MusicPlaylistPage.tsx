import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { useMusicAlbums } from '../../hooks/useData'
import { getMusicUrl, checkAudioUrl } from '../../lib/audio'
import { appendAndPlay, useMusicPlayer, type MusicQueueItem } from '../../lib/musicPlayer'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import QueueList from '../../components/Music/QueueList'
import type { MusicTrack } from '../../lib/types'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function toQueueItem(track: MusicTrack, albumName: string): MusicQueueItem {
  return { id: track.id, name: track.name, albumName, duration: track.duration, iconUrl: track.iconUrl }
}

function PlayIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PlayingIndicator() {
  return (
    <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
      <span className="w-0.5 bg-archive-gold animate-pulse" style={{ height: '60%' }} />
      <span className="w-0.5 bg-archive-gold animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
      <span className="w-0.5 bg-archive-gold animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
    </span>
  )
}

export default function MusicPlaylistPage() {
  const { t } = useI18n()
  const { data: albums, loading, error } = useMusicAlbums()
  const { queue, currentIndex, playing } = useMusicPlayer()
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const currentId = currentIndex >= 0 ? queue[currentIndex]?.id : null

  useEffect(() => {
    if (!albums) return
    for (const album of albums) {
      for (const track of album.tracks) {
        checkAudioUrl(getMusicUrl(track.id)).then((ok) =>
          setAvailability((prev) => (prev[track.id] === ok ? prev : { ...prev, [track.id]: ok })),
        )
      }
    }
  }, [albums])

  if (loading) return <ListSkeleton filters={0} cards={6} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!albums || albums.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('musicPlayer.title')}</h2>
      </div>
      <section className="rounded border border-archive-border bg-archive-file overflow-hidden mb-6">
        <QueueList />
      </section>
      <h3 className="text-sm font-bold text-archive-dust mb-3">{t('musicPlayer.playlists')}</h3>
      <div className="space-y-6">
        {albums.map((album) => (
          <section key={album.id} className="rounded border border-archive-border bg-archive-file overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-archive-border">
              <img src={album.coverUrl} alt="" className="w-16 h-16 rounded object-contain shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-archive-ivory truncate">{album.name}</h3>
                <p className="text-xs text-archive-lead mt-0.5">{album.tracks.length}</p>
              </div>
              <button
                type="button"
                aria-label={t('musicPlayer.playAlbum')}
                onClick={() => appendAndPlay(album.tracks.map((tr) => toQueueItem(tr, album.name)))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-archive-border text-sm text-archive-gold hover:border-archive-gold hover:bg-archive-gold/10 transition-colors shrink-0"
              >
                <PlayIcon className="w-3 h-3" />
                {t('musicPlayer.playAlbum')}
              </button>
            </div>
            <ul>
              {album.tracks.map((track, idx) => {
                const isCurrent = currentId === track.id
                const unavailable = availability[track.id] === false
                return (
                  <li
                    key={track.id}
                    className={`flex items-center gap-3 px-4 py-2 border-b border-archive-border last:border-b-0 ${isCurrent ? 'bg-archive-gold/10' : ''}`}
                  >
                    <span className={`w-6 text-right text-xs font-mono shrink-0 ${isCurrent ? 'text-archive-gold' : 'text-archive-lead'}`}>
                      {idx + 1}
                    </span>
                    <img src={track.iconUrl} alt="" className="w-6 h-6 rounded object-contain shrink-0" />
                    <span className={`flex-1 min-w-0 truncate text-sm ${isCurrent ? 'text-archive-gold' : 'text-archive-ivory'}`}>
                      {track.name}
                    </span>
                    {isCurrent && playing && <PlayingIndicator />}
                    <span className="text-xs font-mono text-archive-lead shrink-0">{formatDuration(track.duration)}</span>
                    <button
                      type="button"
                      aria-label={t('musicPlayer.play')}
                      disabled={unavailable}
                      title={unavailable ? t('musicPlayer.unavailable') : undefined}
                      onClick={() => appendAndPlay([toQueueItem(track, album.name)])}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-archive-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent shrink-0"
                    >
                      <PlayIcon className={`w-3 h-3 ${isCurrent ? 'text-archive-gold' : 'text-archive-dust'}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
