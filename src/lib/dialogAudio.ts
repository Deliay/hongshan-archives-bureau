import { useSyncExternalStore } from 'react'
import { getAudioUrl } from './audio'

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

let state: DialogAudioState = { tracks: [], currentIndex: -1, playing: false, currentTime: 0, duration: 0 }
const listeners = new Set<() => void>()
let audio: HTMLAudioElement | null = null

function emit() {
  for (const l of listeners) l()
}

function setState(patch: Partial<DialogAudioState>) {
  state = { ...state, ...patch }
  emit()
}

export function getSnapshot(): DialogAudioState {
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

function playTrack(index: number) {
  const track = state.tracks[index]
  if (!track) return
  teardown()
  audio = new Audio(getAudioUrl(track.voId, track.locale))
  audio.addEventListener('loadedmetadata', () => {
    if (audio) setState({ duration: audio.duration })
  })
  audio.addEventListener('timeupdate', () => {
    if (audio) setState({ currentTime: audio.currentTime })
  })
  audio.addEventListener('ended', () => {
    const next = state.currentIndex + 1
    if (next < state.tracks.length) {
      playTrack(next)
      setState({ currentIndex: next, currentTime: 0, duration: 0 })
    } else {
      stop()
    }
  })
  audio.addEventListener('error', () => {
    const next = state.currentIndex + 1
    if (next < state.tracks.length) {
      playTrack(next)
      setState({ currentIndex: next, currentTime: 0, duration: 0 })
    } else {
      stop()
    }
  })
  audio.play().catch(() => {
    setState({ playing: false })
  })
}

export function playFrom(trackList: DialogAudioTrack[], startIndex: number) {
  state = { tracks: trackList, currentIndex: startIndex, playing: false, currentTime: 0, duration: 0 }
  playTrack(startIndex)
  setState({ playing: true })
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
  const next = state.currentIndex + 1
  if (next < state.tracks.length) {
    playTrack(next)
    setState({ currentIndex: next, playing: true, currentTime: 0, duration: 0 })
  }
}

export function playPrev() {
  const prev = state.currentIndex - 1
  if (prev >= 0) {
    playTrack(prev)
    setState({ currentIndex: prev, playing: true, currentTime: 0, duration: 0 })
  }
}

export function stop() {
  teardown()
  setState({ tracks: [], currentIndex: -1, playing: false, currentTime: 0, duration: 0 })
}

export function useDialogAudio(): DialogAudioState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
