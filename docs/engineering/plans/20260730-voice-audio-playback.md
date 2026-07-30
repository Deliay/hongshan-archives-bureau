---
description: 干员语音记录音频播放实现方案 — 类型扩展、音频工具、播放组件与管理员修复
type: Fleeting
---

# 干员语音记录音频播放 - 实现方案

**对应产品文档**: [[20260730-voice-audio-playback|干员语音记录音频播放 PRD]]
**对应技术方案**: [[20260730-voice-audio-playback|干员语音记录音频播放技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-30
**作者**: MiMoCode
**开发分支**: `feat/voice-audio-playback`

## 1. 概述

### 1.1 目标

将已评审通过的技术提案转化为可执行的代码实现清单：

1. 扩展 `VoiceLine` 类型，保留 `voiceIndex`、`unlockType`、`unlockValue`、`voId` 字段。
2. 修改适配层 `adaptOperator`，映射新增字段。
3. 新建 `getAudioUrl` 工具函数，实现 locale → 音频语言映射。
4. 新建 `VoicePlayer` 组件，支持音频播放与全局单例控制。
5. 在 `OperatorDetail` 页面集成播放组件，移除 10 条语音限制。
6. 修复管理员干员语音记录缺失（voice records 从 `chr_0002/0003` 获取，非 `chr_9000`）。

### 1.2 范围

- **做**：VoiceLine 类型扩展、适配层映射、音频 URL 工具、播放组件、页面集成、管理员语音修复。
- **不做**：i18n 新增 key（播放按钮无文案，仅图标）、语音解锁条件展示、语音列表筛选。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/audio.ts` | 音频 URL 构建与 locale → 语言映射 |
| `src/lib/__tests__/audio.test.ts` | `getAudioUrl` 单元测试 |
| `src/components/VoicePlayer.tsx` | 音频播放按钮组件 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | `VoiceLine` 接口新增 `voiceIndex`、`unlockType`、`unlockValue`、`voId` |
| `src/lib/adapter.ts` | `adaptOperator` voiceLines 映射新增字段 |
| `src/lib/__tests__/adapter.test.ts` | 新增 voiceLines 映射测试 |
| `src/pages/operators/OperatorDetail.tsx` | 集成 `VoicePlayer`，移除 `.slice(0, 10)` 限制，添加 `useLocale` |
| `src/hooks/useData.ts` | 管理员干员数据映射（voice records 从 chr_0002/0003 获取） |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 类型定义

**`src/lib/types.ts`** — 替换 `VoiceLine` 接口（第 148-151 行）：

```typescript
export interface VoiceLine {
  title: string
  text: string
  voiceIndex: number
  unlockType: number
  unlockValue: number
  voId: string
}
```

### 3.2 适配层更新

**`src/lib/adapter.ts`** — `adaptOperator()` 函数 voiceLines 映射（第 45-48 行）：

```typescript
voiceLines: (raw.profileVoice ?? []).map((v: any) => ({
  title: resolveI18n(v.voiceTitle, i18nMap),
  text: resolveI18n(v.voiceDesc, i18nMap),
  voiceIndex: v.voiceIndex ?? 0,
  unlockType: v.unlockType ?? 0,
  unlockValue: v.unlockValue ?? 0,
  voId: v.voId ?? '',
})),
```

**测试** — `src/lib/__tests__/adapter.test.ts` 追加：

```typescript
describe('adaptOperator voiceLines', () => {
  it('should map voiceIndex, unlockType, unlockValue, voId from raw profileVoice', () => {
    const raw = {
      charId: 'chr_test',
      name: { text: 'Test' },
      profession: 1,
      charTypeId: 'fire',
      rarity: 5,
      mainAttrType: 1,
      subAttrType: 2,
      profileVoice: [
        {
          id: 'v1',
          voiceIndex: 0,
          voiceTitle: { id: 100, text: 'Greeting' },
          voiceDesc: { id: 101, text: 'Hello!' },
          unlockType: 0,
          unlockValue: 0,
          voId: 'vo_001',
        },
        {
          id: 'v2',
          voiceIndex: 3,
          voiceTitle: { id: 200, text: 'Trust' },
          voiceDesc: { id: 201, text: 'We are friends.' },
          unlockType: 4,
          unlockValue: 100,
          voId: 'vo_002',
        },
      ],
    }
    const i18n = { '100': '问候', '101': '你好！', '200': '信赖', '201': '我们是朋友。' }
    const result = adaptOperator(raw, i18n)
    expect(result.voiceLines).toHaveLength(2)
    expect(result.voiceLines[0]).toEqual({
      title: '问候',
      text: '你好！',
      voiceIndex: 0,
      unlockType: 0,
      unlockValue: 0,
      voId: 'vo_001',
    })
    expect(result.voiceLines[1]).toEqual({
      title: '信赖',
      text: '我们是朋友。',
      voiceIndex: 3,
      unlockType: 4,
      unlockValue: 100,
      voId: 'vo_002',
    })
  })

  it('should default missing voice fields gracefully', () => {
    const raw = {
      charId: 'chr_test2',
      name: { text: 'Test2' },
      profession: 1,
      charTypeId: 'ice',
      rarity: 3,
      profileVoice: [
        { voiceTitle: { text: 'Title' }, voiceDesc: { text: 'Desc' } },
      ],
    }
    const result = adaptOperator(raw)
    expect(result.voiceLines[0]).toEqual({
      title: 'Title',
      text: 'Desc',
      voiceIndex: 0,
      unlockType: 0,
      unlockValue: 0,
      voId: '',
    })
  })
})
```

### 3.3 音频 URL 工具

**`src/lib/audio.ts`**（新建）：

```typescript
const AUDIO_LOCALE_MAP: Record<string, string> = {
  CN: 'chinese',
  TC: 'chinese',
  EN: 'english',
  JP: 'japanese',
  KR: 'korean',
}

const AUDIO_BASE_URL = 'https://endfield-assets.fffdan.com/audios/dialogs/vo'

export function getAudioUrl(voId: string, locale: string): string {
  const lang = AUDIO_LOCALE_MAP[locale] ?? 'english'
  return `${AUDIO_BASE_URL}/${lang}/${voId}`
}
```

**`src/lib/__tests__/audio.test.ts`**（新建）：

```typescript
import { describe, it, expect } from 'vitest'
import { getAudioUrl } from '../audio'

describe('getAudioUrl', () => {
  it('should build chinese URL for CN locale', () => {
    expect(getAudioUrl('vo_001', 'CN')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001',
    )
  })

  it('should build chinese URL for TC locale', () => {
    expect(getAudioUrl('vo_001', 'TC')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001',
    )
  })

  it('should build english URL for EN locale', () => {
    expect(getAudioUrl('vo_001', 'EN')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
  })

  it('should build japanese URL for JP locale', () => {
    expect(getAudioUrl('vo_001', 'JP')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/japanese/vo_001',
    )
  })

  it('should build korean URL for KR locale', () => {
    expect(getAudioUrl('vo_001', 'KR')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/korean/vo_001',
    )
  })

  it('should fallback to english for unknown locale', () => {
    expect(getAudioUrl('vo_001', 'RU')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
    expect(getAudioUrl('vo_001', 'DE')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
  })
})
```

### 3.4 VoicePlayer 组件

**`src/components/VoicePlayer.tsx`**（新建）：

```tsx
import { useState, useRef, useCallback } from 'react'
import { getAudioUrl } from '../lib/audio'

let currentAudio: HTMLAudioElement | null = null
let currentSetPlaying: ((v: boolean) => void) | null = null

interface VoicePlayerProps {
  voId: string
  locale: string
}

export default function VoicePlayer({ voId, locale }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopOther = useCallback(() => {
    if (currentAudio && currentAudio !== audioRef.current) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentSetPlaying?.(false)
      currentAudio = null
      currentSetPlaying = null
    }
  }, [])

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(getAudioUrl(voId, locale))
      audioRef.current.addEventListener('ended', () => {
        setPlaying(false)
        if (currentAudio === audioRef.current) {
          currentAudio = null
          currentSetPlaying = null
        }
      })
      audioRef.current.addEventListener('error', () => {
        setPlaying(false)
        if (currentAudio === audioRef.current) {
          currentAudio = null
          currentSetPlaying = null
        }
      })
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
      if (currentAudio === audioRef.current) {
        currentAudio = null
        currentSetPlaying = null
      }
    } else {
      stopOther()
      audioRef.current.play().catch(() => {
        setPlaying(false)
      })
      setPlaying(true)
      currentAudio = audioRef.current
      currentSetPlaying = setPlaying
    }
  }, [playing, voId, locale, stopOther])

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-6 h-6 flex items-center justify-center rounded hover:bg-archive-border transition-colors"
      aria-label={playing ? 'Pause' : 'Play'}
    >
      {playing ? (
        <svg className="w-3 h-3 text-archive-gold" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-archive-dust" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </button>
  )
}
```

**要点**：
- 模块级 `currentAudio` / `currentSetPlaying` 实现全局单例播放。
- `stopOther()` 在播放前停止其他正在播放的音频。
- `onError` 静默处理，不影响文本展示。
- 播放中显示暂停图标（金色），未播放显示播放图标（灰色）。

### 3.5 页面集成

**`src/pages/operators/OperatorDetail.tsx`**：

**import 添加**（第 8 行之后）：

```typescript
import { useLocale } from '../../lib/locale'
```

```typescript
import VoicePlayer from '../../components/VoicePlayer'
```

**函数内添加 locale**（第 27 行之后）：

```typescript
const { locale } = useLocale()
```

**语音记录模块替换**（第 326-339 行）：

```tsx
{/* 语音记录 */}
{op.voiceLines.length > 0 && (
  <section>
    <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.voiceRecords')}</h3>
    <div className="space-y-2">
      {op.voiceLines.map((vl, i) => (
        <div key={i} className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-archive-lead">
              {vl.title || `${t('operator.voiceRecords')} ${i + 1}`}
            </p>
            {vl.voId && <VoicePlayer voId={vl.voId} locale={locale} />}
          </div>
          <p className="text-sm text-archive-dust"><RichText text={vl.text} /></p>
        </div>
      ))}
    </div>
  </section>
)}
```

### 3.6 管理员干员语音修复

**关键洞察**：`chr_9000_endmin` 没有 `profileVoice` 数据。管理员干员的 voice records 必须从 `chr_0002_endminm` / `chr_0003_endminf` 各自获取。其他数据（技能、天赋等）仍从 `chr_9000_endmin` 获取。

**`src/hooks/useData.ts`**：

**添加映射常量**（文件顶部，imports 之后）：

```typescript
const ADMIN_OPERATOR_MAP: Record<string, string> = {
  chr_0002_endminm: 'chr_9000_endmin',
  chr_0003_endminf: 'chr_9000_endmin',
}
```

**`useOperatorDetail` 修改**：

```typescript
// async 回调开头添加：
const dataId = ADMIN_OPERATOR_MAP[id] ?? id

// 大部分数据源使用 rawData[dataId]
// 以下数据保持使用原始 id：
// - CharacterPotentialTable（各自潜能）
// - profileVoice / voiceLines（chr_9000 无语音数据）
// - Portrait URL（各自头像）
```

**voice records 从原始 id 获取**：

```typescript
// adaptOperator 调用后，用原始 id 的 voice 覆盖：
const voiceSource = rawData[id]
const voiceLines = (voiceSource?.profileVoice ?? []).map((v: any) => ({
  title: resolveI18n(v.voiceTitle, i18nMap),
  text: resolveI18n(v.voiceDesc, i18nMap),
  voiceIndex: v.voiceIndex ?? 0,
  unlockType: v.unlockType ?? 0,
  unlockValue: v.unlockValue ?? 0,
  voId: v.voId ?? '',
}))
op.voiceLines = voiceLines
```

**头像覆盖**：

```typescript
if (ADMIN_OPERATOR_MAP[id]) {
  op.id = id
  op.portrait = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${id}.png`
}
```

## 4. 实现顺序

### 阶段一：类型与适配（第 1 轮提交）

1. `src/lib/types.ts` — 扩展 `VoiceLine` 接口。
2. `src/lib/adapter.ts` — 更新 voiceLines 映射。
3. `src/lib/__tests__/adapter.test.ts` — 新增测试。
4. 校验：`npx tsc --noEmit && npx vitest run src/lib/__tests__/adapter.test.ts`。

### 阶段二：音频工具（第 2 轮提交）

1. `src/lib/audio.ts` — 新建 `getAudioUrl`。
2. `src/lib/__tests__/audio.test.ts` — 新建测试。
3. 校验：`npx vitest run src/lib/__tests__/audio.test.ts`。

### 阶段三：播放组件（第 3 轮提交）

1. `src/components/VoicePlayer.tsx` — 新建组件。
2. 校验：`npx tsc --noEmit`。

### 阶段四：页面集成（第 4 轮提交）

1. `src/pages/operators/OperatorDetail.tsx` — 集成 VoicePlayer，移除限制。
2. 校验：`npx tsc --noEmit && npm run lint && npm run test`。

### 阶段五：管理员修复（第 5 轮提交）

1. `src/hooks/useData.ts` — 添加管理员映射与 voice records 逻辑。
2. 校验：`npx tsc --noEmit && npm run test`。

### 阶段六：E2E 测试（第 6 轮提交）

1. `tests/e2e/src/voice-audio.spec.ts` — 新建 E2E 测试。
2. 校验：`cd tests/e2e && npx playwright test voice-audio`。

### 阶段七：最终验证（第 7 轮提交）

1. `npm run lint && npm run test && npm run build` — 全量通过。
2. `cd tests/e2e && npx playwright test voice-audio` — E2E 通过。

## 5. 测试计划

### 5.1 类型检查

- `npx tsc --noEmit` — 无类型错误。

### 5.2 单元测试

| 测试文件 | 覆盖目标 | 关键用例 |
|----------|----------|----------|
| `src/lib/__tests__/audio.test.ts` | `getAudioUrl` | CN/TC → chinese、EN → english、JP → japanese、KR → korean、未知 locale → english 回退 |
| `src/lib/__tests__/adapter.test.ts` | `adaptOperator` voiceLines | 映射 voiceIndex/unlockType/unlockValue/voId、缺失字段默认值处理 |

### 5.3 E2E 测试

| 测试文件 | 覆盖目标 | 关键用例 |
|----------|----------|----------|
| `tests/e2e/src/voice-audio.spec.ts` | 语音音频播放完整流程 | 语音记录模块可见、播放按钮可见、点击播放、点击暂停、管理员干员语音显示 |

**E2E 测试用例**：

```typescript
// tests/e2e/src/voice-audio.spec.ts
import { test, expect } from '@playwright/test'

test.describe('干员语音音频播放 (Voice Audio Playback)', () => {

  async function waitForDetailReady(page: any, operatorId: string) {
    await page.goto(`/archive/operators/${operatorId}`)
    await page.waitForFunction(() => {
      const body = document.body.textContent || ''
      return body.includes('语音记录') || body.includes('未找到') || body.includes('加载失败')
    }, { timeout: 20000 })
  }

  test('语音记录模块可见', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await expect(page.getByText('语音记录', { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test('播放按钮可见', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButtons = page.locator('button[aria-label="Play"]')
    const count = await playButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('点击播放按钮触发播放', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButton = page.locator('button[aria-label="Play"]').first()
    await playButton.click()
    await expect(page.locator('button[aria-label="Pause"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('点击暂停按钮停止播放', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0005_chen')
    await page.waitForTimeout(3000)
    const playButton = page.locator('button[aria-label="Play"]').first()
    await playButton.click()
    await expect(page.locator('button[aria-label="Pause"]').first()).toBeVisible({ timeout: 5000 })
    const pauseButton = page.locator('button[aria-label="Pause"]').first()
    await pauseButton.click()
    await expect(page.locator('button[aria-label="Play"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('管理员干员语音记录显示', async ({ page }) => {
    await waitForDetailReady(page, 'chr_0002_endminm')
    await page.waitForTimeout(3000)
    const voiceSection = page.getByText('语音记录', { exact: true })
    await expect(voiceSection.first()).toBeVisible({ timeout: 10000 })
  })
})
```

### 5.4 构建验证

- `npm run lint` — 无 lint 错误。
- `npm run test` — 现有测试 + 新增单元测试全部通过。
- `npm run build` — 构建成功。

### 5.5 视觉验证

- 干员详情页语音记录模块显示播放按钮。
- 点击播放按钮可播放音频，再点暂停。
- 同时点击多条语音，只有最新一条播放。
- 切换语言后播放，音频语言正确。
- 管理员干员（chr_0002/0003）语音记录正常显示。

## 6. 验收标准

- [ ] 干员详情页语音记录模块显示播放按钮。
- [ ] 播放/暂停功能正常，全局单例播放。
- [ ] 音频语言跟随用户 locale（中文/英文/日文/韩文，其他回退英文）。
- [ ] 管理员干员语音记录正常显示（从 chr_0002/0003 获取）。
- [ ] 移除 10 条语音限制，展示所有语音。
- [ ] `voId` 为空时隐藏播放按钮。
- [ ] 单元测试覆盖：`getAudioUrl` 6 用例、`adaptOperator` voiceLines 2 用例。
- [ ] E2E 测试覆盖：语音模块可见、播放按钮、播放/暂停、管理员语音。
- [ ] `npm run lint`、`npm run test`、`npm run build` 全部通过。
- [ ] `cd tests/e2e && npx playwright test voice-audio` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 音频文件 404 或加载失败 | 播放按钮点击无反应 | `onError` 静默处理，不影响文本展示 |
| `voId` 字段在部分干员数据中缺失 | 该干员无播放按钮 | `voId` 为空时隐藏按钮，仅显示文本 |
| `chr_9000_endmin` 数据结构变化 | 管理员数据映射失效 | 降级使用 chr_0002/0003 自身数据 |
| 全局单例 audio 内存泄漏 | 长时间使用后内存增长 | `ended` / `error` 事件中清理引用 |

回滚策略：按阶段提交，可逐阶段回滚。删除 `VoicePlayer.tsx` + `audio.ts` + 回滚 `types.ts` / `adapter.ts` / `OperatorDetail.tsx` / `useData.ts` 即可。

## 8. 相关文档

- [[20260730-voice-audio-playback|干员语音记录音频播放 PRD]]
- [[20260730-voice-audio-playback|干员语音记录音频播放技术方案]]
- [通用开发规范](../common-rules.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
