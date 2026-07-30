---
description: 干员语音记录音频播放技术方案 — 数据适配、音频播放组件与语言映射
type: Permanent
---

# 干员语音记录音频播放技术方案

## 概述

为干员卷宗页的「语音记录」模块增加音频播放能力，并修复管理员干员语音记录缺失问题。

## 背景

当前语音记录仅展示文本（title + text），适配层丢弃了 `voiceIndex`、`unlockType`、`unlockValue` 等字段。需要：

1. 扩展 `VoiceLine` 类型，保留更多原始字段
2. 新增音频播放组件
3. 实现 locale → 音频语言映射
4. 修复管理员干员语音缺失

---

## 数据调研

### CharacterTable profileVoice 原始字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 语音条目标识 |
| `voiceIndex` | number | 语音序号 |
| `voiceTitle` | `{ id, text }` | 语音标题（i18n） |
| `voiceDesc` | `{ id, text }` | 语音描述（i18n） |
| `unlockType` | number | 解锁类型：0=初始, 2=精英, 4=信赖 |
| `unlockValue` | number | 解锁条件值 |
| `voId` | string | 音频文件 ID（用于构建播放 URL） |

### 音频 URL 格式

```
https://endfield-assets.fffdan.com/audios/dialogs/vo/{language}/{voId}
```

### Locale → 音频语言映射

| Locale | 音频语言 |
|--------|---------|
| CN, TC | `chinese` |
| EN | `english` |
| JP | `japanese` |
| KR | `korean` |
| 其他 (RU, MX, BR, DE, FR, VN, TH, ID, IT) | `english`（默认回退） |

---

## 实现方案

### 1. 扩展 VoiceLine 类型

**文件**: `src/lib/types.ts`

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

### 2. 修改适配层

**文件**: `src/lib/adapter.ts` — `adaptOperator()` 函数

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

### 3. 新增音频语言映射工具

**文件**: `src/lib/audio.ts`（新建）

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

### 4. 新增音频播放组件

**文件**: `src/components/VoicePlayer.tsx`（新建）

组件功能：
- 接收 `voId` 和 `locale` 参数
- 使用 HTML5 `<audio>` 元素播放
- 显示播放/暂停按钮
- 支持全局单例播放（新播放自动停止旧播放）

```tsx
interface VoicePlayerProps {
  voId: string
  locale: string
}

// 使用模块级变量实现全局单例
let currentAudio: HTMLAudioElement | null = null

export function VoicePlayer({ voId, locale }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = () => {
    // 停止当前播放的其他音频
    if (currentAudio && currentAudio !== audioRef.current) {
      currentAudio.pause()
      currentAudio = null
    }
    // ... 播放/暂停逻辑
  }

  return (
    <button onClick={toggle} className="...">
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  )
}
```

### 5. 修改 OperatorDetail 语音记录模块

**文件**: `src/pages/operators/OperatorDetail.tsx`

修改点：
1. 移除 `.slice(0, 10)` 限制，展示所有语音
2. 每条语音记录旁添加 `<VoicePlayer>` 组件
3. 显示解锁条件信息

```tsx
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
```

### 6. 修复管理员干员语音缺失

**依赖**: 此修复依赖 `20260725-admin-operator-data-mapping` 方案的实现。

管理员干员（`chr_0002_endminm` / `chr_0003_endminf`）的数据源映射到 `chr_9000_endmin` 后，语音记录会自动从 `chr_9000_endmin` 的 `profileVoice` 获取，无需额外处理。

如果管理员数据映射尚未实现，可在此方案中一并添加：

**文件**: `src/hooks/useData.ts` — `useOperatorDetail()`

```typescript
// 管理员角色数据映射
const ADMIN_OPERATOR_MAP: Record<string, string> = {
  chr_0002_endminm: 'chr_9000_endmin',
  chr_0003_endminf: 'chr_9000_endmin',
}

// 在数据获取时使用 dataId
const dataId = ADMIN_OPERATOR_MAP[id] ?? id
```

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `src/lib/types.ts` | 扩展 `VoiceLine` 接口 |
| **修改** | `src/lib/adapter.ts` | 适配层保留更多字段 |
| **新建** | `src/lib/audio.ts` | 音频 URL 构建与语言映射 |
| **新建** | `src/components/VoicePlayer.tsx` | 音频播放组件 |
| **修改** | `src/pages/operators/OperatorDetail.tsx` | 集成播放组件，移除数量限制 |
| **修改** | `src/hooks/useData.ts` | 管理员干员数据映射 |
| **新建** | `src/lib/__tests__/audio.test.ts` | getAudioUrl 单元测试 |
| **修改** | `src/lib/__tests__/adapter.test.ts` | voiceLines 映射测试 |
| **新建** | `tests/e2e/src/voice-audio.spec.ts` | 语音音频播放 E2E 测试 |

---

## 测试策略

### 单元测试

| 测试文件 | 覆盖目标 | 关键用例 |
|----------|----------|----------|
| `src/lib/__tests__/audio.test.ts` | `getAudioUrl` | CN/TC → chinese、EN → english、JP → japanese、KR → korean、未知 locale → english 回退 |
| `src/lib/__tests__/adapter.test.ts` | `adaptOperator` voiceLines | 映射 voiceIndex/unlockType/unlockValue/voId、缺失字段默认值处理 |

### E2E 测试

| 测试文件 | 覆盖目标 | 关键用例 |
|----------|----------|----------|
| `tests/e2e/src/voice-audio.spec.ts` | 语音音频播放完整流程 | 语音记录模块可见、播放按钮可见、点击播放、点击暂停、多语音单例播放、voId 为空时无按钮 |

### 测试用例详细设计

#### 单元测试：getAudioUrl

```typescript
// src/lib/__tests__/audio.test.ts
describe('getAudioUrl', () => {
  it('CN → chinese', () => {
    expect(getAudioUrl('vo_001', 'CN')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001')
  })
  it('TC → chinese', () => {
    expect(getAudioUrl('vo_001', 'TC')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001')
  })
  it('EN → english', () => {
    expect(getAudioUrl('vo_001', 'EN')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001')
  })
  it('JP → japanese', () => {
    expect(getAudioUrl('vo_001', 'JP')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/japanese/vo_001')
  })
  it('KR → korean', () => {
    expect(getAudioUrl('vo_001', 'KR')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/korean/vo_001')
  })
  it('未知 locale → english 回退', () => {
    expect(getAudioUrl('vo_001', 'RU')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001')
    expect(getAudioUrl('vo_001', 'DE')).toBe('https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001')
  })
})
```

#### 单元测试：adaptOperator voiceLines

```typescript
// src/lib/__tests__/adapter.test.ts
describe('adaptOperator voiceLines', () => {
  it('映射 voiceIndex, unlockType, unlockValue, voId', () => {
    const raw = {
      charId: 'chr_test', name: { text: 'Test' }, profession: 1,
      charTypeId: 'fire', rarity: 5, mainAttrType: 1, subAttrType: 2,
      profileVoice: [{
        id: 'v1', voiceIndex: 0, voiceTitle: { id: 100, text: 'Greeting' },
        voiceDesc: { id: 101, text: 'Hello!' }, unlockType: 0, unlockValue: 0, voId: 'vo_001',
      }],
    }
    const i18n = { '100': '问候', '101': '你好！' }
    const result = adaptOperator(raw, i18n)
    expect(result.voiceLines[0]).toEqual({
      title: '问候', text: '你好！', voiceIndex: 0,
      unlockType: 0, unlockValue: 0, voId: 'vo_001',
    })
  })

  it('缺失字段使用默认值', () => {
    const raw = {
      charId: 'chr_test2', name: { text: 'Test2' }, profession: 1,
      charTypeId: 'ice', rarity: 3,
      profileVoice: [{ voiceTitle: { text: 'Title' }, voiceDesc: { text: 'Desc' } }],
    }
    const result = adaptOperator(raw)
    expect(result.voiceLines[0]).toEqual({
      title: 'Title', text: 'Desc', voiceIndex: 0,
      unlockType: 0, unlockValue: 0, voId: '',
    })
  })
})
```

#### E2E 测试：语音音频播放

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
    // 播放后按钮应变为暂停状态
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
    // 管理员应有语音记录模块（从 chr_0002 自身获取）
    const voiceSection = page.getByText('语音记录', { exact: true })
    await expect(voiceSection.first()).toBeVisible({ timeout: 10000 })
  })
})
```

---

## i18n

播放按钮使用 aria-label，无需新增 i18n key。图标状态（播放/暂停）通过 SVG 图标传达，不依赖文字。

---

## 验证方案

1. `npm run lint` — 无 lint 错误
2. `npm run test` — 现有测试 + 新增单元测试通过
3. `npm run build` — TypeScript 编译通过
4. `cd tests/e2e && npx playwright test voice-audio` — E2E 测试通过
5. 视觉验证：
   - 访问任意干员详情页，确认语音记录模块显示播放按钮
   - 点击播放按钮，确认音频正常播放
   - 切换语言后播放，确认音频语言正确
   - 同时点击多条语音，确认只有最新一条播放
   - 访问管理员干员详情页，确认语音记录正常显示

---

## 边界情况处理

| 情况 | 处理方式 |
|------|---------|
| `voId` 为空 | 隐藏播放按钮，仅显示文本 |
| 音频文件 404 | 播放按钮置灰，点击无响应 |
| 音频加载失败 | 静默失败，不影响文本展示 |
| 用户快速切换语言 | 下次播放时使用新语言的音频 |
| 管理员干员无语音数据 | 语音记录模块不显示（与现有行为一致） |
