---
description: 音乐播放与全局控制中心实现方案 — 数据适配、全局播放队列 store、控制面板与播放列表页
type: Fleeting
---

# 音乐播放与全局控制中心 - 实现方案

**对应产品文档**: [[20260804-music-player|音乐播放与全局控制中心 PRD]]
**对应技术方案**: [[20260804-music-player|音乐播放与全局控制中心技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-08-04
**作者**: MiMoCode
**开发分支**: `feat/music-player`

## 1. 概述

### 1.1 目标

1. 数据层：接入 `SpaceshipAlbumTable` / `SpaceshipAlbumMusicTable` / `SpaceshipMusicTable` + ItemTable，产出 `MusicAlbum[]`。
2. 播放内核：新建 `src/lib/musicPlayer.ts` 全局播放队列 store（复用 `dialogAudio.ts` 模式），并与语音播放双向互斥。
3. UI：导航栏底部（语言切换上方）挂载音乐控制面板；新增 `/archive/music` 播放列表页。
4. i18n：新增 `musicPlayer.*` 命名空间，14 语言全翻。
5. 测试：单元测试（adapter + store）+ E2E。

### 1.2 范围

- **做**：上述目标全部内容，含 `docs/engineering/references/data-mapping-tables.md` 补充三张新表映射。
- **不做**：侧边导航分组项与首页模块卡片（入口仅控制面板）、队列编辑（移除/排序）、队列持久化、音量控制、进度拖拽、播放模式（循环/随机）。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/musicPlayer.ts` | 全局播放队列 store |
| `src/lib/__tests__/musicPlayer.test.ts` | 队列 store 单元测试 |
| `src/components/Music/MusicControlPanel.tsx` | 导航栏音乐控制面板 |
| `src/pages/music/MusicPlaylistPage.tsx` | 播放列表页 |
| `tests/e2e/src/music-player.spec.ts` | E2E 测试 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 新增 `MusicTrack` / `MusicAlbum` |
| `src/lib/adapter.ts` | 新增 `adaptMusicAlbums()` |
| `src/lib/audio.ts` | 新增 `getMusicUrl()` |
| `src/lib/dialogAudio.ts` | 新增 `setOnBeforePlay` 回调，语音播放前暂停音乐 |
| `src/hooks/useData.ts` | 新增 `useMusicAlbums()` |
| `src/components/Layout/Sidebar.tsx` | 语言切换上方挂载控制面板 |
| `src/App.tsx` | 注册 `/archive/music` 路由 |
| `src/components/Layout/Breadcrumb.tsx` | `music` 面包屑映射 |
| `scripts/i18n-custom.json` | 新增 `musicPlayer.*` keys（14 语言） |
| `src/lib/__tests__/adapter.test.ts` | 新增 `adaptMusicAlbums` 测试 |
| `docs/engineering/references/data-mapping-tables.md` | 补充三张 Spaceship 音乐表映射 |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 类型定义

**`src/lib/types.ts`** — 追加：

```typescript
export interface MusicTrack {
  id: string
  name: string
  duration: number
  order: number
  albumId: string
  iconUrl: string
}

export interface MusicAlbum {
  id: string
  name: string
  coverUrl: string
  order: number
  tracks: MusicTrack[]
}
```

### 3.2 音频 URL

**`src/lib/audio.ts`** — 追加：

```typescript
const MUSIC_BASE_URL = 'https://endfield-assets.fffdan.com/audios/music/spaceship'

export function getMusicUrl(itemId: string): string {
  return `${MUSIC_BASE_URL}/${itemId}`
}
```

### 3.3 数据适配层

**`src/lib/adapter.ts`** — 追加 `adaptMusicAlbums()`：

```typescript
export function adaptMusicAlbums(
  rawAlbums: Record<string, any>,
  rawAlbumMusic: Record<string, any>,
  rawMusic: Record<string, any>,
  albumI18nMap: Record<string, string>,
  itemMap: Record<string, any>,
  itemI18nMap: Record<string, string>,
): MusicAlbum[] {
  return Object.values(rawAlbums)
    .map((album: any) => {
      const id: string = album.albumId
      const musicIds: string[] = rawAlbumMusic[id]?.musicList ?? []
      const tracks = musicIds
        .map((musicId, idx): MusicTrack | null => {
          const m = rawMusic[musicId]
          if (!m) return null
          const item = itemMap[musicId]
          return {
            id: musicId,
            name: (item && resolveI18n(item.name, itemI18nMap)) || musicId,
            duration: m.duration ?? 0,
            order: m.order ?? idx + 1,
            albumId: id,
            iconUrl: getSpriteUrl(`itemicon/${item?.iconId ?? 'item_spaceship_music'}`),
          }
        })
        .filter((t): t is MusicTrack => t !== null)
      return {
        id,
        name: resolveI18n(album.albumName, albumI18nMap) || id,
        coverUrl: getSpriteUrl(`musicplayer/${album.icon}`),
        order: album.order ?? 0,
        tracks,
      }
    })
    .sort((a, b) => a.order - b.order)
}
```

**要点**：
- 曲目顺序以 `SpaceshipAlbumMusicTable.musicList` 为准；`musicList` 中在 `SpaceshipMusicTable` 缺失的 id 跳过。
- 曲目名来自 **ItemTable** 条目 + ItemTable 字典；专辑名来自专辑字典（`albumName.id` 为 19 位整数，`resolveI18n` 内 `String(field.id)` 查字典）。
- 封面固定拼 `musicplayer/` 子目录。

**测试** — `src/lib/__tests__/adapter.test.ts` 追加：

```typescript
describe('adaptMusicAlbums', () => {
  it('按 order 排序专辑，按 musicList 排序曲目，名称来自 ItemTable 字典', () => {
    const rawAlbums = {
      b: { albumId: 'b', albumName: { id: '9007199254740993001', text: '' }, icon: 'icon_b', order: 2 },
      a: { albumId: 'a', albumName: { id: '9007199254740993002', text: '' }, icon: 'icon_a', order: 1 },
    }
    const rawAlbumMusic = { a: { musicList: ['m2', 'm1', 'm_missing'] } }
    const rawMusic = {
      m1: { id: 'm1', duration: 100, order: 2, albumId: 'a' },
      m2: { id: 'm2', duration: 200, order: 1, albumId: 'a' },
    }
    const albumI18n = { '9007199254740993001': '专辑B', '9007199254740993002': '专辑A' }
    const itemMap = { m1: { name: { id: 11, text: '' }, iconId: 'item_spaceship_music' }, m2: { name: { id: 22, text: '' } } }
    const itemI18n = { '11': '曲目一', '22': '曲目二' }
    const result = adaptMusicAlbums(rawAlbums, rawAlbumMusic, rawMusic, albumI18n, itemMap, itemI18n)
    expect(result.map(a => a.id)).toEqual(['a', 'b'])
    expect(result[0].name).toBe('专辑A')
    expect(result[0].tracks.map(t => t.id)).toEqual(['m2', 'm1'])
    expect(result[0].tracks[0].name).toBe('曲目二')
    expect(result[0].tracks[1].iconUrl).toContain('itemicon/item_spaceship_music.png')
  })

  it('ItemTable 条目缺失时曲目名回退为 id', () => {
    const result = adaptMusicAlbums(
      { a: { albumId: 'a', albumName: { text: '' }, icon: 'i', order: 1 } },
      { a: { musicList: ['m1'] } },
      { m1: { id: 'm1', duration: 60, order: 1, albumId: 'a' } },
      {}, {}, {},
    )
    expect(result[0].tracks[0].name).toBe('m1')
    expect(result[0].name).toBe('a')
  })
})
```

### 3.4 全局播放队列 store

**`src/lib/musicPlayer.ts`**（新建，结构镜像 `dialogAudio.ts`）：

```typescript
import { useSyncExternalStore } from 'react'
import { getMusicUrl } from './audio'
import { stop as stopDialogAudio, setOnBeforePlay } from './dialogAudio'

export interface MusicQueueItem {
  id: string
  name: string
  albumName: string
  duration: number
  iconUrl: string
}

export interface MusicPlayerState {
  queue: MusicQueueItem[]
  currentIndex: number
  playing: boolean
  currentTime: number
  duration: number
}

let state: MusicPlayerState = { queue: [], currentIndex: -1, playing: false, currentTime: 0, duration: 0 }
const listeners = new Set<() => void>()
let audio: HTMLAudioElement | null = null

function emit() {
  for (const l of listeners) l()
}

function setState(patch: Partial<MusicPlayerState>) {
  state = { ...state, ...patch }
  emit()
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
  const track = state.queue[index]
  if (!track) return
  teardown()
  audio = new Audio(getMusicUrl(track.id))
  audio.addEventListener('loadedmetadata', () => {
    if (audio) setState({ duration: audio.duration })
  })
  audio.addEventListener('timeupdate', () => {
    if (audio) setState({ currentTime: audio.currentTime })
  })
  const advance = () => {
    const next = state.currentIndex + 1
    if (next < state.queue.length) {
      playTrack(next)
      setState({ currentIndex: next, currentTime: 0, duration: 0 })
    } else {
      teardown()
      setState({ currentIndex: -1, playing: false, currentTime: 0, duration: 0 })
    }
  }
  audio.addEventListener('ended', advance)
  audio.addEventListener('error', advance)
  audio.play().catch(() => {
    setState({ playing: false })
  })
}

export function appendAndPlay(items: MusicQueueItem[]) {
  if (items.length === 0) return
  stopDialogAudio()
  const startIndex = state.queue.length
  state = { ...state, queue: [...state.queue, ...items], currentIndex: startIndex, playing: false, currentTime: 0, duration: 0 }
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
  if (next < state.queue.length) {
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

export function useMusicPlayer(): MusicPlayerState {
  return useSyncExternalStore(subscribe, () => state)
}

setOnBeforePlay(() => pauseMusic())
```

**要点**：
- **互斥无循环依赖**：`musicPlayer` → `dialogAudio` 单向 import（`stopDialogAudio` + `setOnBeforePlay`）；`dialogAudio` 不 import `musicPlayer`，只暴露回调注册。
- 队列自然播完：保留队列、重置 `currentIndex = -1`，面板回到入口形态。
- `error` 与 `ended` 共用 `advance`：404/加载失败自动跳下一首。

**`src/lib/dialogAudio.ts`** — 追加（约 5 行）：

```typescript
let onBeforePlay: (() => void) | null = null

export function setOnBeforePlay(fn: () => void) {
  onBeforePlay = fn
}
```

`playFrom` 函数体首行插入：`onBeforePlay?.()`。

**测试** — `src/lib/__tests__/musicPlayer.test.ts`（新建，mock `Audio`）：

```typescript
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

const { appendAndPlay, playNext, playPrev, togglePlay, stopMusic, getMusicPlayerSnapshot } = await import('../musicPlayer')

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
})
```

### 3.5 数据 hook

**`src/hooks/useData.ts`** — 追加 `useMusicAlbums()`（import 补充 `fetchTableEntry`、`adaptMusicAlbums`、`MusicAlbum`）：

```typescript
export function useMusicAlbums(): UseDataResult<MusicAlbum[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [albumRaw, albumI18n, albumMusicRaw, musicRaw, itemI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SpaceshipAlbumTable', () => fetchTableAll('SpaceshipAlbumTable')),
      getTableI18nDict('SpaceshipAlbumTable', locale),
      getCachedData<Record<string, any>>('SpaceshipAlbumMusicTable', () => fetchTableAll('SpaceshipAlbumMusicTable')),
      getCachedData<Record<string, any>>('SpaceshipMusicTable', () => fetchTableAll('SpaceshipMusicTable')),
      getTableI18nDict('ItemTable', locale),
    ])
    const musicIds = [...new Set(Object.values(albumMusicRaw).flatMap((v: any) => (v.musicList ?? []) as string[]))]
    const items = await Promise.all(
      musicIds.map((id) =>
        getCachedData<any>('ItemTable', () => fetchTableEntry('ItemTable', id), id).catch(() => null),
      ),
    )
    const itemMap: Record<string, any> = {}
    musicIds.forEach((id, i) => {
      if (items[i]) itemMap[id] = items[i]
    })
    return adaptMusicAlbums(albumRaw, albumMusicRaw, musicRaw, albumI18n, itemMap, itemI18n)
  }, [locale])
}
```

**要点**：
- ItemTable 整表较大，条目按 key 逐条拉取（`getCachedData` 第三参传 id，缓存 key 为 `ItemTable:{id}`）；单条目失败不阻塞整页（`catch(() => null)`）。
- ItemTable 字典用整表字典 `getTableI18nDict('ItemTable', locale)`，与物品页共享同一缓存。
- 全部表数据走 `getCachedData` 两级缓存，版本变化自动失效。

### 3.6 导航栏音乐控制面板

**`src/components/Music/MusicControlPanel.tsx`**（新建）：

```tsx
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useMusicPlayer, togglePlay, playNext, playPrev } from '../../lib/musicPlayer'

interface MusicControlPanelProps {
  onNavigate?: () => void
}

export default function MusicControlPanel({ onNavigate }: MusicControlPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { queue, currentIndex, playing, currentTime, duration } = useMusicPlayer()
  const current = currentIndex >= 0 ? queue[currentIndex] : null

  const goPlaylist = () => {
    navigate('/archive/music')
    onNavigate?.()
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goPlaylist}
      onKeyDown={(e) => { if (e.key === 'Enter') goPlaylist() }}
      className="w-full rounded border border-archive-border bg-archive-file px-3 py-2 cursor-pointer hover:border-archive-lead transition-colors"
    >
      {!current ? (
        <div className="flex items-center gap-2 text-sm text-archive-dust">
          {/* 音符 SVG */}
          <span>{t('musicPlayer.title')}</span>
          <span className="text-xs text-archive-lead ml-auto">{t('musicPlayer.empty')}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <img src={current.iconUrl} alt="" className="w-6 h-6 rounded shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs text-archive-ivory truncate">{current.name}</p>
              <p className="text-[10px] text-archive-lead truncate">{current.albumName}</p>
            </div>
          </div>
          <div className="h-0.5 rounded bg-archive-border overflow-hidden">
            <div className="h-full bg-archive-gold transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <button type="button" aria-label={t('musicPlayer.previous')} onClick={(e) => { e.stopPropagation(); playPrev() }}>
              {/* 上一首 SVG */}
            </button>
            <button type="button" aria-label={playing ? t('musicPlayer.pause') : t('musicPlayer.play')} onClick={(e) => { e.stopPropagation(); togglePlay() }}>
              {/* 播放/暂停 SVG */}
            </button>
            <button type="button" aria-label={t('musicPlayer.next')} onClick={(e) => { e.stopPropagation(); playNext() }}>
              {/* 下一首 SVG */}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**要点**：
- 面板整区可点击跳转播放列表页；控制按钮 `stopPropagation` 阻止跳转。
- `onNavigate` 回调供移动端收起抽屉。

**`src/components/Layout/Sidebar.tsx`** — 第 149 行语言切换 `div` 上方插入面板，边框调整：

```tsx
<div className="p-3 border-t border-archive-border">
  <MusicControlPanel onNavigate={() => setOpen(false)} />
</div>
<div className="p-3 pt-0 relative">
  {/* 原语言切换按钮与弹层保持不变 */}
</div>
```

即将原 `<div className="p-3 border-t border-archive-border relative">` 拆为两个 div：`border-t` 留在面板容器，语言容器去掉 `border-t` 并保留 `relative`。

### 3.7 播放列表页

**`src/pages/music/MusicPlaylistPage.tsx`**（新建）：

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useMusicAlbums } from '../../hooks/useData'
import { getMusicUrl, checkAudioUrl } from '../../lib/audio'
import { appendAndPlay, useMusicPlayer, type MusicQueueItem } from '../../lib/musicPlayer'
import type { MusicAlbum, MusicTrack } from '../../lib/types'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function toQueueItem(track: MusicTrack, albumName: string): MusicQueueItem {
  return { id: track.id, name: track.name, albumName, duration: track.duration, iconUrl: track.iconUrl }
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

  // loading / error 复用现有 ListSkeleton 与错误提示模式
  // 渲染：专辑分区（封面 + 专辑名 + playAlbum 按钮）+ 曲目行（曲序/曲名/时长/播放按钮）
}
```

**要点**：
- 曲目行播放按钮：`appendAndPlay([toQueueItem(track, album.name)])`；专辑按钮：`appendAndPlay(album.tracks.map(tr => toQueueItem(tr, album.name)))`。
- `availability[id] === false` 的曲目按钮 `disabled` + `title={t('musicPlayer.unavailable')}`；探测结果未返回前默认可点。
- 正在播放行：`currentId === track.id` 时应用 `text-archive-gold bg-archive-gold/10` 高亮 + 播放中图标。
- 加载态复用 `ListSkeleton`；错误态复用现有页面的错误提示模式。

**`src/App.tsx`** — import 并注册：

```tsx
import MusicPlaylistPage from './pages/music/MusicPlaylistPage'
// <Route path="items" ... /> 之后：
<Route path="music" element={<MusicPlaylistPage />} />
```

**`src/components/Layout/Breadcrumb.tsx`** — `useListLabel()` 追加：

```typescript
music: t('musicPlayer.title'),
```

### 3.8 i18n

**`scripts/i18n-custom.json`** — 新增 8 个 key，每个 key 提供全部 14 语言（CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT），随后运行 `node scripts/generate-i18n-dicts.ts`：

| key | CN | EN |
|-----|----|----|
| `musicPlayer.title` | 音乐播放 | Music Player |
| `musicPlayer.play` | 播放 | Play |
| `musicPlayer.pause` | 暂停 | Pause |
| `musicPlayer.previous` | 上一首 | Previous |
| `musicPlayer.next` | 下一首 | Next |
| `musicPlayer.playAlbum` | 播放整张专辑 | Play Album |
| `musicPlayer.unavailable` | 音频暂不可用 | Audio unavailable |
| `musicPlayer.empty` | 暂无播放内容 | Nothing playing |

其余 12 语言（TC/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT）在实现时逐一提供本土翻译，禁止占位、留空或复制中文。

### 3.9 文档更新

**`docs/engineering/references/data-mapping-tables.md`** — 补充三表映射条目：

| 表 | 用途 | 配对 i18n 字典 | 关键字段 |
|----|------|--------------|---------|
| `SpaceshipAlbumTable` | 音乐专辑（名称/封面/排序） | 本表字典（albumName，19 位 id） | albumId / albumName / icon / order |
| `SpaceshipAlbumMusicTable` | 专辑 → 有序曲目 ID 列表 | 无 | musicList |
| `SpaceshipMusicTable` | 曲目元数据（时长/序号） | **名称在 ItemTable**（本表字典为空） | id / albumId / duration / order |

并注明：音频 `GET /audios/music/spaceship/{itemId}`；封面 `getSpriteUrl('musicplayer/{icon}')`；`item_music_fac_dijiang` 音频缺失（404）。

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）

1. `src/lib/types.ts` — 新增 `MusicTrack` / `MusicAlbum`。
2. `src/lib/audio.ts` — 新增 `getMusicUrl`。
3. `src/lib/adapter.ts` — 新增 `adaptMusicAlbums`。
4. `src/lib/__tests__/adapter.test.ts` — 新增测试。
5. 校验：`npx tsc --noEmit && npx vitest run src/lib/__tests__/adapter.test.ts`。

### 阶段二：播放内核（第 2 轮提交）

1. `src/lib/dialogAudio.ts` — 新增 `setOnBeforePlay` + `playFrom` 首行调用。
2. `src/lib/musicPlayer.ts` — 新建 store。
3. `src/lib/__tests__/musicPlayer.test.ts` — 新建测试。
4. 校验：`npx tsc --noEmit && npx vitest run src/lib/__tests__/musicPlayer.test.ts src/lib/__tests__`。

### 阶段三：数据 hook（第 3 轮提交）

1. `src/hooks/useData.ts` — 新增 `useMusicAlbums`。
2. 校验：`npx tsc --noEmit`。

### 阶段四：i18n + 控制面板（第 4 轮提交）

1. `scripts/i18n-custom.json` — 新增 `musicPlayer.*` 8 keys × 14 语言。
2. `node scripts/generate-i18n-dicts.ts` 重新生成。
3. `src/components/Music/MusicControlPanel.tsx` — 新建。
4. `src/components/Layout/Sidebar.tsx` — 挂载面板。
5. 校验：`npx tsc --noEmit && npm run lint`。

### 阶段五：播放列表页（第 5 轮提交）

1. `src/pages/music/MusicPlaylistPage.tsx` — 新建。
2. `src/App.tsx` — 注册路由。
3. `src/components/Layout/Breadcrumb.tsx` — 面包屑映射。
4. 校验：`npm run lint && npm run test && npm run build`。

### 阶段六：E2E + 文档（第 6 轮提交）

1. `tests/e2e/src/music-player.spec.ts` — 新建。
2. `docs/engineering/references/data-mapping-tables.md` — 补充三表映射。
3. 校验：`cd tests/e2e && npx playwright test music-player`。

### 阶段七：最终验证

1. `npm run lint && npm run test && npm run build` — 全量通过。
2. E2E 全量回归。
3. 人工视觉验证（见 5.5）。

## 5. 测试计划

### 5.1 类型检查

- `npx tsc --noEmit` — 无类型错误。

### 5.2 单元测试

| 测试文件 | 覆盖目标 | 关键用例 |
|----------|----------|----------|
| `src/lib/__tests__/musicPlayer.test.ts` | 队列 store | appendAndPlay 追加并播放、ended 连播与队列播完、error 跳曲、playNext/playPrev 边界、togglePlay |
| `src/lib/__tests__/adapter.test.ts` | `adaptMusicAlbums` | 专辑/曲目排序、名称字典解析、19 位 id 处理、缺失条目兜底 |

### 5.3 E2E 测试

**`tests/e2e/src/music-player.spec.ts`**：

```typescript
import { test, expect } from '@playwright/test'

test.describe('音乐播放与全局控制中心 (Music Player)', () => {
  test('导航栏显示音乐控制面板且位于语言切换上方', async ({ page }) => {
    await page.goto('/archive')
    const panel = page.locator('aside [role="button"]', { hasText: '音乐播放' })
    await expect(panel).toBeVisible({ timeout: 15000 })
    const panelBox = await panel.boundingBox()
    const langBtn = page.locator('aside button', { hasText: '简中' })
    const langBox = await langBtn.boundingBox()
    expect(panelBox!.y).toBeLessThan(langBox!.y)
  })

  test('点击面板进入播放列表页', async ({ page }) => {
    await page.goto('/archive')
    await page.locator('aside [role="button"]', { hasText: '音乐播放' }).click()
    await expect(page).toHaveURL(/\/archive\/music/)
  })

  test('播放列表页展示专辑与曲目', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await expect(page.getByText('开拓专辑').first()).toBeVisible()
    await expect(page.getByText('生之泥壤').first()).toBeVisible()
  })

  test('点击曲目播放后面板显示曲目名', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('开拓专辑'), { timeout: 20000 })
    await page.locator('button[aria-label="播放"]').first().click()
    await expect(page.locator('aside').getByText('生之泥壤')).toBeVisible({ timeout: 10000 })
  })

  test('404 曲目按钮置灰', async ({ page }) => {
    await page.goto('/archive/music')
    await page.waitForFunction(() => document.body.textContent?.includes('工业专辑'), { timeout: 20000 })
    await expect(page.locator('button[aria-label="播放"][disabled]').first()).toBeVisible({ timeout: 15000 })
  })
})
```

（E2E 断言语言以默认 CN 字典为准；`item_music_fac_dijiang` 所在「工业专辑」用于验证 404 置灰。）

### 5.4 构建验证

- `npm run lint` — 无 lint 错误。
- `npm run test` — 现有测试 + 新增单元测试全部通过。
- `npm run build` — 构建成功。

### 5.5 视觉验证

- 桌面端与移动端（抽屉）导航栏底部均显示面板，位于语言切换上方。
- 播放中切换多个页面，音乐不中断、面板进度同步。
- 播放音乐时点击干员语音播放，音乐停止；反向亦成立。
- 切换语言后专辑/曲目名跟随变化，播放不中断。
- 「工业专辑」404 曲目按钮置灰，其余曲目正常播放。

## 6. 验收标准

- [ ] 导航栏底部（语言切换上方）显示音乐控制面板，桌面端与移动端一致。
- [ ] 空队列时面板为入口形态，点击跳转 `/archive/music`。
- [ ] 播放列表页按专辑展示全部曲目（封面/专辑名/曲名/时长），无删除编辑入口。
- [ ] 单曲/整专辑点击播放 = 追加到「正在播放」队列并播放；播完自动连播。
- [ ] 播放中跨页面不中断；与语音播放双向互斥。
- [ ] 404 曲目置灰；播放出错自动跳下一首。
- [ ] 单元测试、E2E、`lint`、`build` 全部通过。
- [ ] `data-mapping-tables.md` 已补充三张新表。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `item_music_fac_dijiang` 等音频 404 | 用户点击无反应 | HEAD 探测置灰 + error 事件自动跳曲双保险 |
| ItemTable 整表字典体积大 | 首次进入播放列表页多一次请求 | 与物品页共享缓存；两级缓存兜底 |
| 单元测试 mock Audio 与真实行为偏差 | 测试假阳性 | store 逻辑保持与 dialogAudio 同构，E2E 覆盖真实播放路径 |
| 专辑/曲目数据未来新增 | 适配遗漏 | 适配层全量遍历 + 缺失条目跳过，天然兼容新增 |
| 移动端抽屉内面板挤压语言切换 | 布局错乱 | 面板复用 Sidebar 现有间距与边框约定，视觉验证覆盖 |

回滚策略：按阶段提交，可逐阶段回滚。整体回滚 = 删除 5 个新文件 + 还原 10 个修改文件；`dialogAudio.ts` 改动仅 5 行，独立可还原。

## 8. 相关文档

- [[20260804-music-player|音乐播放与全局控制中心 PRD]]
- [[20260804-music-player|音乐播放与全局控制中心技术方案]]
- [通用开发规范](../common-rules.md)
- [前端开发规范](../frontend-spec.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
