import {
  getMusicPlayerSnapshot,
  playQueue,
  togglePlay as queueTogglePlay,
  playNext as queuePlayNext,
  playPrev as queuePlayPrev,
  stopMusic,
  useMusicPlayer,
  type MusicQueueItem,
} from './musicPlayer'

export interface DialogAudioTrack {
  lineKey: string
  voId: string
  locale: string
  actorName: string
  dialogText: string
}

export interface DialogAudioState {
  tracks: DialogAudioTrack[]
  currentIndex: number
  playing: boolean
  currentTime: number
  duration: number
}

function toQueueItem(track: DialogAudioTrack): MusicQueueItem {
  return {
    id: track.voId,
    name: track.actorName,
    albumName: track.lineKey,
    duration: 0,
    iconUrl: '',
    kind: 'voice',
    voice: {
      voId: track.voId,
      locale: track.locale,
      lineKey: track.lineKey,
      dialogText: track.dialogText,
    },
  }
}

function toDialogTrack(item: MusicQueueItem): DialogAudioTrack {
  return {
    lineKey: item.voice?.lineKey ?? '',
    voId: item.voice?.voId ?? '',
    locale: item.voice?.locale ?? '',
    actorName: item.name,
    dialogText: item.voice?.dialogText ?? '',
  }
}

function derive(): DialogAudioState {
  const s = getMusicPlayerSnapshot()
  return {
    tracks: s.queue.map(toDialogTrack),
    currentIndex: s.currentIndex,
    playing: s.playing,
    currentTime: s.currentTime,
    duration: s.duration,
  }
}

export function playFrom(trackList: DialogAudioTrack[], startIndex: number) {
  playQueue(trackList.map(toQueueItem), startIndex)
}

export function togglePlay() {
  queueTogglePlay()
}

export function playNext() {
  queuePlayNext()
}

export function playPrev() {
  queuePlayPrev()
}

export function stop() {
  stopMusic()
}

export function getSnapshot(): DialogAudioState {
  return derive()
}

export function useDialogAudio(): DialogAudioState {
  const s = useMusicPlayer()
  return {
    tracks: s.queue.map(toDialogTrack),
    currentIndex: s.currentIndex,
    playing: s.playing,
    currentTime: s.currentTime,
    duration: s.duration,
  }
}
