# 干员语音记录音频播放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio playback to operator voice records and fix missing voice records for admin operators.

**Architecture:** Extend the `VoiceLine` type to include `voId` and unlock fields, create a `getAudioUrl` utility for locale-aware audio URL construction, build a `VoicePlayer` component with global singleton playback, and integrate into `OperatorDetail`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest

---

## File Structure

| Operation | File | Responsibility |
|-----------|------|---------------|
| Modify | `src/lib/types.ts:148-151` | Extend `VoiceLine` interface with `voiceIndex`, `unlockType`, `unlockValue`, `voId` |
| Modify | `src/lib/adapter.ts:45-48` | Map additional raw fields into `VoiceLine` |
| Create | `src/lib/audio.ts` | Audio URL construction and locale-to-language mapping |
| Create | `src/lib/__tests__/audio.test.ts` | Tests for `getAudioUrl` |
| Create | `src/components/VoicePlayer.tsx` | Audio playback button component |
| Modify | `src/pages/operators/OperatorDetail.tsx:326-339` | Integrate `VoicePlayer`, remove 10-item limit |

---

### Task 1: Extend VoiceLine Type

**Covers:** Spec §3.2 (voice records data model)

**Files:**
- Modify: `src/lib/types.ts:148-151`

- [ ] **Step 1: Update VoiceLine interface**

```typescript
// src/lib/types.ts — replace lines 148-151
export interface VoiceLine {
  title: string
  text: string
  voiceIndex: number
  unlockType: number
  unlockValue: number
  voId: string
}
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors from this change; adapter will be updated next)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "types: extend VoiceLine with voiceIndex, unlockType, unlockValue, voId"
```

---

### Task 2: Update Adapter to Map Voice Fields

**Covers:** Spec §3.2 (adapter layer)

**Files:**
- Modify: `src/lib/adapter.ts:45-48`

- [ ] **Step 1: Write failing test for adapter voice mapping**

```typescript
// src/lib/__tests__/adapter.test.ts — append at end of file
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/adapter.test.ts`
Expected: FAIL — `voiceIndex` property not found on return value

- [ ] **Step 3: Update adaptOperator voiceLines mapping**

```typescript
// src/lib/adapter.ts — replace lines 45-48
voiceLines: (raw.profileVoice ?? []).map((v: any) => ({
  title: resolveI18n(v.voiceTitle, i18nMap),
  text: resolveI18n(v.voiceDesc, i18nMap),
  voiceIndex: v.voiceIndex ?? 0,
  unlockType: v.unlockType ?? 0,
  unlockValue: v.unlockValue ?? 0,
  voId: v.voId ?? '',
})),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapter.ts src/lib/__tests__/adapter.test.ts
git commit -m "adapter: map voiceIndex, unlockType, unlockValue, voId in voiceLines"
```

---

### Task 3: Create Audio URL Utility

**Covers:** Spec §3.2 (audio URL construction, locale mapping)

**Files:**
- Create: `src/lib/audio.ts`
- Create: `src/lib/__tests__/audio.test.ts`

- [ ] **Step 1: Write failing tests for getAudioUrl**

```typescript
// src/lib/__tests__/audio.test.ts
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/audio.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create audio.ts**

```typescript
// src/lib/audio.ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/audio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio.ts src/lib/__tests__/audio.test.ts
git commit -m "audio: add getAudioUrl utility with locale-to-language mapping"
```

---

### Task 4: Create VoicePlayer Component

**Covers:** Spec §3.2 (audio playback UI), §3.5 (error handling)

**Files:**
- Create: `src/components/VoicePlayer.tsx`

- [ ] **Step 1: Create VoicePlayer component**

```tsx
// src/components/VoicePlayer.tsx
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

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/VoicePlayer.tsx
git commit -m "components: add VoicePlayer audio playback component"
```

---

### Task 5: Integrate VoicePlayer into OperatorDetail

**Covers:** Spec §3.2 (playback integration), §3.4 (remove 10-item limit)

**Files:**
- Modify: `src/pages/operators/OperatorDetail.tsx:326-339`

- [ ] **Step 1: Update OperatorDetail imports**

```typescript
// src/pages/operators/OperatorDetail.tsx — add import after line 16
import VoicePlayer from '../../components/VoicePlayer'
```

- [ ] **Step 2: Replace voice records section**

```tsx
// src/pages/operators/OperatorDetail.tsx — replace lines 326-339
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

Note: The `locale` variable is not yet available in the component scope. We need to add it.

- [ ] **Step 3: Add locale import and usage**

```typescript
// src/pages/operators/OperatorDetail.tsx — add import after line 7
import { useLocale } from '../../lib/locale'
```

```typescript
// src/pages/operators/OperatorDetail.tsx — add inside OperatorDetail function, after line 27
const { locale } = useLocale()
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS (existing tests unaffected)

- [ ] **Step 7: Commit**

```bash
git add src/pages/operators/OperatorDetail.tsx
git commit -m "feat: integrate VoicePlayer into operator detail, remove 10-item voice limit"
```

---

### Task 6: Fix Admin Operator Voice Records

**Covers:** Spec §3.2 (admin operator fix)

**Files:**
- Modify: `src/hooks/useData.ts`

- [ ] **Step 1: Check if admin mapping already exists**

Run: `grep -n "ADMIN_OPERATOR_MAP\|chr_0002\|chr_9000" src/hooks/useData.ts`
Expected: If already implemented, skip this task. If not, proceed.

- [ ] **Step 2: Add admin operator mapping (if not present)**

```typescript
// src/hooks/useData.ts — add near top of file (after imports)
const ADMIN_OPERATOR_MAP: Record<string, string> = {
  chr_0002_endminm: 'chr_9000_endmin',
  chr_0003_endminf: 'chr_9000_endmin',
}
```

- [ ] **Step 3: Modify useOperatorDetail to use dataId**

```typescript
// src/hooks/useData.ts — in useOperatorDetail function
// Add at the start of the async callback:
const dataId = ADMIN_OPERATOR_MAP[id] ?? id

// Replace rawData[id] with rawData[dataId] for all data sources EXCEPT:
// - CharacterPotentialTable (keep id)
// - Portrait URL (keep id)
```

- [ ] **Step 4: Override portrait for admin operators**

```typescript
// After adaptOperator call:
if (ADMIN_OPERATOR_MAP[id]) {
  op.id = id
  op.portrait = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${id}.png`
}
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useData.ts
git commit -m "fix: add admin operator data mapping for voice records"
```

---

### Task 7: Final Verification

**Covers:** All spec sections

**Files:** None (verification only)

- [ ] **Step 1: Run full lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Manual verification checklist**

- [ ] Visit `/archive/operators/chr_0005_chen` — voice records show play buttons
- [ ] Click play button — audio plays
- [ ] Click another voice while playing — first stops, second plays
- [ ] Switch locale to EN — next play uses english audio
- [ ] Visit `/archive/operators/chr_0002_endminm` — voice records display
- [ ] Visit `/archive/operators/chr_0003_endminf` — voice records display

- [ ] **Step 5: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address review feedback"
```
