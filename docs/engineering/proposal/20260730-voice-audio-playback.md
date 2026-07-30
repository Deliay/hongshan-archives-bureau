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

---

## i18n

需要新增以下 key（如需 UI 文案）：

| Key | 用途 |
|-----|------|
| `operator.voicePlay` | 播放按钮 aria-label |
| `operator.voicePause` | 暂停按钮 aria-label |

在 `scripts/i18n-custom.json` 中添加，运行 `node scripts/generate-i18n-dicts.ts` 生成。

---

## 验证方案

1. `npm run lint` — 无 lint 错误
2. `npm run test` — 现有测试通过
3. `npm run build` — TypeScript 编译通过
4. 视觉验证：
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
