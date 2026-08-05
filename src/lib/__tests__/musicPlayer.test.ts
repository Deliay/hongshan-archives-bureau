import { describe, it, expect, beforeEach, vi } from 'vitest'

class MockAudio {
  static instances: MockAudio[] = []
  src = ''
  paused = true
  currentTime = 0
  duration = 0
  private handlers = new Map<string, (() => void)[]>()
  constructor(src?: string) {
    this.src = src ?? ''
    MockAudio.instances.push(this)
  }
  addEventListener(type: string, fn: () => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), fn])
  }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  emit(type: string) { for (const fn of this.handlers.get(type) ?? []) fn() }
}
vi.stubGlobal('Audio', MockAudio)

const { appendAndPlay, playQueue, playAt, clearQueue, playNext, playPrev, togglePlay, stopMusic, getMusicPlayerSnapshot } = await import('../musicPlayer')

function track(id: string) {
  return { id, name: id, albumName: 'a', duration: 100, iconUrl: '' }
}

describe('musicPlayer store', () => {
  beforeEach(() => {
    MockAudio.instances = []
    stopMusic()
  })

  it('appendAndPlay 追加到队列末尾并播放追加的第一首', () => {
    appendAndPlay([track('m1'), track('m2')])
    appendAndPlay([track('m3')])
    const s = getMusicPlayerSnapshot()
    expect(s.queue.map(t => t.id)).toEqual(['m1', 'm2', 'm3'])
    expect(s.currentIndex).toBe(2)
    expect(s.playing).toBe(true)
  })

  it('ended 自动播放下一首，队列播完回到入口状态', () => {
    appendAndPlay([track('m1'), track('m2')])
    MockAudio.instances[0].emit('ended')
    expect(getMusicPlayerSnapshot().currentIndex).toBe(1)
    MockAudio.instances[1].emit('ended')
    expect(getMusicPlayerSnapshot().currentIndex).toBe(-1)
    expect(getMusicPlayerSnapshot().playing).toBe(false)
  })

  it('error 跳过当前曲目播放下一首', () => {
    appendAndPlay([track('m1'), track('m2')])
    MockAudio.instances[0].emit('error')
    expect(getMusicPlayerSnapshot().currentIndex).toBe(1)
  })

  it('playNext/playPrev 边界无响应', () => {
    appendAndPlay([track('m1')])
    playNext()
    expect(getMusicPlayerSnapshot().currentIndex).toBe(0)
    playPrev()
    expect(getMusicPlayerSnapshot().currentIndex).toBe(0)
  })

  it('togglePlay 切换播放状态', () => {
    appendAndPlay([track('m1')])
    togglePlay()
    expect(getMusicPlayerSnapshot().playing).toBe(false)
    togglePlay()
    expect(getMusicPlayerSnapshot().playing).toBe(true)
  })

  it('playQueue 替换整个队列并从指定位置播放', () => {
    appendAndPlay([track('m1'), track('m2')])
    playQueue([track('v1'), track('v2'), track('v3')], 1)
    const s = getMusicPlayerSnapshot()
    expect(s.queue.map(t => t.id)).toEqual(['v1', 'v2', 'v3'])
    expect(s.currentIndex).toBe(1)
    expect(s.playing).toBe(true)
  })

  it('playAt 跳转队列内指定条目', () => {
    appendAndPlay([track('m1'), track('m2'), track('m3')])
    playAt(2)
    expect(getMusicPlayerSnapshot().currentIndex).toBe(2)
    playAt(5)
    expect(getMusicPlayerSnapshot().currentIndex).toBe(2)
    playAt(-1)
    expect(getMusicPlayerSnapshot().currentIndex).toBe(2)
  })

  it('clearQueue 清空队列并停止播放', () => {
    appendAndPlay([track('m1')])
    clearQueue()
    const s = getMusicPlayerSnapshot()
    expect(s.queue).toEqual([])
    expect(s.currentIndex).toBe(-1)
    expect(s.playing).toBe(false)
  })

  it('voice 条目使用语音 URL 播放', () => {
    playQueue([
      { id: 'au_x', name: '角色', albumName: 'line_1', duration: 0, iconUrl: '', kind: 'voice' as const,
        voice: { voId: 'au_x', locale: 'CN', lineKey: 'line_1', dialogText: 'text' } },
    ], 0)
    expect(MockAudio.instances[0].src).toContain('au_x')
    expect(getMusicPlayerSnapshot().playing).toBe(true)
  })
})
