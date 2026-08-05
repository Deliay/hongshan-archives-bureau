import { describe, it, expect, vi, beforeEach } from 'vitest'

class MockAudio {
  static instances: MockAudio[] = []
  static endedHandler: (() => void) | null = null
  paused = true
  currentTime = 0
  duration = 10
  addEventListener: any
  play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause = vi.fn(() => {
    this.paused = true
  })

  constructor(src: string) {
    this.src = src
    MockAudio.instances.push(this)
    MockAudio.endedHandler = null
    this.addEventListener = vi.fn((type: string, cb: () => void) => {
      if (type === 'ended') MockAudio.endedHandler = cb
    })
  }

  src: string

  static fireEnded() {
    MockAudio.endedHandler?.()
  }
}

vi.stubGlobal('Audio', MockAudio)

import {
  playFrom,
  togglePlay,
  playNext,
  playPrev,
  stop,
  getSnapshot,
  type DialogAudioTrack,
} from '../dialogAudio'

const mk = (key: string): DialogAudioTrack => ({
  lineKey: key,
  voId: `au_${key}`,
  locale: 'CN',
  actorName: key,
  dialogText: `text-${key}`,
})

describe('dialogAudio queue controller', () => {
  beforeEach(() => {
    stop()
    MockAudio.instances = []
    MockAudio.endedHandler = null
  })

  it('playFrom sets current track and starts playback', () => {
    playFrom([mk('a'), mk('b'), mk('c')], 1)
    const s = getSnapshot()
    expect(s.tracks.map(t => t.lineKey)).toEqual(['a', 'b', 'c'])
    expect(s.currentIndex).toBe(1)
    expect(s.playing).toBe(true)
    expect(MockAudio.instances.length).toBe(1)
    expect(MockAudio.instances[0].src).toContain('au_b')
  })

  it('auto-advances to next track on ended', () => {
    playFrom([mk('a'), mk('b'), mk('c')], 0)
    MockAudio.fireEnded()
    const s = getSnapshot()
    expect(s.currentIndex).toBe(1)
    expect(MockAudio.instances.length).toBe(2)
    expect(MockAudio.instances[1].src).toContain('au_b')
  })

  it('wraps to first track after last ends (default loop mode)', () => {
    playFrom([mk('a'), mk('b')], 0)
    MockAudio.fireEnded()
    expect(getSnapshot().currentIndex).toBe(1)
    MockAudio.fireEnded()
    const s = getSnapshot()
    expect(s.currentIndex).toBe(0)
    expect(s.tracks.map(t => t.lineKey)).toEqual(['a', 'b'])
    expect(s.playing).toBe(true)
  })

  it('togglePlay pauses and resumes', () => {
    playFrom([mk('a'), mk('b')], 0)
    togglePlay()
    expect(getSnapshot().playing).toBe(false)
    expect(MockAudio.instances[0].paused).toBe(true)
    togglePlay()
    expect(getSnapshot().playing).toBe(true)
  })

  it('playNext / playPrev navigate the queue', () => {
    playFrom([mk('a'), mk('b'), mk('c')], 1)
    playNext()
    expect(getSnapshot().currentIndex).toBe(2)
    playPrev()
    expect(getSnapshot().currentIndex).toBe(1)
    playPrev()
    expect(getSnapshot().currentIndex).toBe(0)
  })
})
