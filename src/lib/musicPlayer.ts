import { useSyncExternalStore } from 'react'
import { getAudioUrl, getMusicUrl } from './audio'

export interface VoicePayload {
  voId: string
  locale: string
  lineKey: string
  dialogText: string
}

export interface MusicQueueItem {
  id: string
  name: string
  albumName: string
  duration: number
  iconUrl: string
  kind?: 'music' | 'voice'
  voice?: VoicePayload
}

export type PlayMode = 'loop' | 'shuffle' | 'repeat'

export interface MusicPlayerState {
  queue: MusicQueueItem[]
  currentIndex: number
  playing: boolean
  currentTime: number
  duration: number
  playMode: PlayMode
}

let state: MusicPlayerState = { queue: [], currentIndex: -1, playing: false, currentTime: 0, duration: 0, playMode: 'loop' }
const listeners = new Set<() => void>()
let audio: HTMLAudioElement | null = null

function emit() {
  for (const l of listeners) l()
}

function setState(patch: Partial<MusicPlayerState>) {
  state = { ...state, ...patch }
  emit()
}

export function getMusicPlayerSnapshot(): MusicPlayerState {
  return state
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function teardown() {
  if (audio) {
    audio.pause()
    audio = null
  }
}

function randomIndex(from: number, length: number): number {
  if (length <= 1) return from
  let i = from
  while (i === from) i = Math.floor(Math.random() * length)
  return i
}

function trackUrl(track: MusicQueueItem): string {
  if (track.kind === 'voice' && track.voice) return getAudioUrl(track.voice.voId, track.voice.locale)
  return getMusicUrl(track.id)
}

function playTrack(index: number) {
  const track = state.queue[index]
  if (!track) return
  teardown()
  audio = new Audio(trackUrl(track))
  audio.addEventListener('loadedmetadata', () => {
    if (audio) setState({ duration: audio.duration })
  })
  audio.addEventListener('timeupdate', () => {
    if (audio) setState({ currentTime: audio.currentTime })
  })
  const onEnded = () => {
    const len = state.queue.length
    if (len === 0) {
      teardown()
      setState({ currentIndex: -1, playing: false, currentTime: 0, duration: 0 })
      return
    }
    if (state.playMode === 'repeat') {
      playTrack(state.currentIndex)
      setState({ currentTime: 0, duration: 0 })
      return
    }
    const next = state.playMode === 'shuffle' ? randomIndex(state.currentIndex, len) : (state.currentIndex + 1) % len
    playTrack(next)
    setState({ currentIndex: next, currentTime: 0, duration: 0 })
  }
  const onError = () => {
    // 错误始终顺序跳过且不绕回，避免全队列错误时死循环
    const next = state.currentIndex + 1
    if (next < state.queue.length) {
      playTrack(next)
      setState({ currentIndex: next, currentTime: 0, duration: 0 })
    } else {
      teardown()
      setState({ currentIndex: -1, playing: false, currentTime: 0, duration: 0 })
    }
  }
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)
  audio.play().catch(() => {
    setState({ playing: false })
  })
}

export function appendAndPlay(items: MusicQueueItem[]) {
  if (items.length === 0) return
  const startIndex = state.queue.length
  state = { ...state, queue: [...state.queue, ...items], currentIndex: startIndex, playing: false, currentTime: 0, duration: 0 }
  playTrack(startIndex)
  setState({ playing: true })
}

export function playQueue(items: MusicQueueItem[], startIndex: number) {
  if (items.length === 0) return
  state = { ...state, queue: items, currentIndex: startIndex, playing: false, currentTime: 0, duration: 0 }
  playTrack(startIndex)
  setState({ playing: true })
}

export function playAt(index: number) {
  if (index < 0 || index >= state.queue.length) return
  playTrack(index)
  setState({ currentIndex: index, playing: true, currentTime: 0, duration: 0 })
}

export function togglePlay() {
  if (!audio) return
  if (state.playing) {
    audio.pause()
    setState({ playing: false })
  } else {
    audio.play().catch(() => {
      setState({ playing: false })
    })
    setState({ playing: true })
  }
}

export function playNext() {
  const len = state.queue.length
  if (len === 0) return
  const next = state.playMode === 'shuffle' ? randomIndex(state.currentIndex, len) : (state.currentIndex + 1) % len
  playTrack(next)
  setState({ currentIndex: next, playing: true, currentTime: 0, duration: 0 })
}

export function playPrev() {
  const len = state.queue.length
  if (len === 0) return
  const prev = (state.currentIndex - 1 + len) % len
  playTrack(prev)
  setState({ currentIndex: prev, playing: true, currentTime: 0, duration: 0 })
}

const MODE_ORDER: PlayMode[] = ['loop', 'shuffle', 'repeat']

export function cyclePlayMode() {
  const idx = MODE_ORDER.indexOf(state.playMode)
  setState({ playMode: MODE_ORDER[(idx + 1) % MODE_ORDER.length] })
}

export function pauseMusic() {
  if (audio && state.playing) {
    audio.pause()
    setState({ playing: false })
  }
}

export function stopMusic() {
  teardown()
  setState({ queue: [], currentIndex: -1, playing: false, currentTime: 0, duration: 0 })
}

export const clearQueue = stopMusic

export function useMusicPlayer(): MusicPlayerState {
  return useSyncExternalStore(subscribe, getMusicPlayerSnapshot)
}
