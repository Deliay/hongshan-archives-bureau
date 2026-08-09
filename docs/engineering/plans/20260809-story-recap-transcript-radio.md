---
description: 剧情梗概详情新增台本与对讲机板块的实现清单
type: Fleeting
---

# 剧情梗概：台本与对讲机 - 实现方案

**对应产品文档**: [[20260809-story-recap-transcript-radio|剧情梗概：台本与对讲机产品方案]]
**对应技术方案**: [[20260809-story-recap-transcript-radio|剧情梗概：台本与对讲机技术方案 v1.0]]
**实现方案版本**: v1.0
**创建日期**: 2026-08-09
**作者**: 前端工程
**开发分支**: `feat/story-recap-script-radio`

## 1. 概述

### 1.1 目标

在剧情梗概单个任务详情（`MissionDetailContent`）中新增「台本（Transcript）」与「对讲机（Radio）」两板块，分别按任务聚合 `DialogTextTable` 全部台词与 `RadioTable` 全部对讲，补齐剧情原文的完整连续阅读与对讲机剧情展示。

### 1.2 范围

- **做**：`RadioLine` 类型、`adaptRadioLine`/`buildRadioLinesForMission`/`buildDialogLinesForMission` 适配器、`useStoryScriptBundle` hook、`MissionDetailContent` 两板块渲染、`story.transcript.*`/`story.radio.*` i18n、`data-mapping-tables.md` 更新、单测与 E2E。
- **不做**：台词级音频播放、全文搜索。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/story/StoryTranscript.tsx` | 台本板块组件（折叠头 + 场次分组台词流） |
| `src/pages/story/StoryRadio.tsx` | 对讲机板块组件（折叠头 + 逐条台词） |
| `tests/e2e/src/story-transcript-radio.spec.ts` | 扩展 E2E |

组件拆分决策：独立建文件，保持单一职责。`StoryMissionDetail.tsx` 已有 202 行，不宜再内联新逻辑。

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 新增 `RadioLine` |
| `src/lib/adapter.ts` | 新增 `adaptRadioLine` / `buildRadioLinesForMission` / `buildDialogLinesForMission` |
| `src/hooks/useData.ts` | 新增 `useStoryScriptBundle` |
| `src/pages/story/StoryMissionDetail.tsx` | `MissionDetailContent` 渲染两板块 |
| `scripts/i18n-custom.json` | `story.transcript` / `story.radio` / `story.noTranscript` / `story.noRadio` |
| `docs/engineering/references/data-mapping-tables.md` | 补充任务级聚合规则 |
| `src/lib/__tests__/adapter-story.test.ts` | 新增适配单测 |

## 3. 详细实现

### 3.1 类型定义 `src/lib/types.ts`

```ts
import type { DialogLine } from './types'

export interface RadioLine {
  key: string                // 子行 key `radio_gm02m13_3`
  order: number              // radioSingleDataList 内序号
  actorNameId: string        // 说话人 id（actorNameId）
  speaker: string            // 说话人名称（i18n）
  text: string               // 台词（i18n）
  audioOverride: string      // 语音 id
}
```

### 3.2 适配器 `src/lib/adapter.ts`

```ts
// 对讲单行：从 radioSingleDataList[index] 映射
export function adaptRadioLine(
  entryKey: string,          // radio_gm02m13_3
  index: number,
  raw: any,                  // radioSingleDataList[index]
  i18nMap?: Record<string, string>,
): RadioLine {
  const actorId = raw.actorNameId ?? ''
  return {
    key: entryKey,
    order: index,
    actorNameId: actorId,
    speaker: resolveI18n(raw.actorName, i18nMap) || actorId || entryKey,
    text: resolveI18n(raw.radioText, i18nMap),
    audioOverride: raw.audioOverride ?? '',
  }
}

// 任务级聚合：M 为任务 key
export function buildRadioLinesForMission(
  missionKey: string,
  radioRaw: Record<string, any>,
  i18nMap?: Record<string, string>,
): RadioLine[] {
  const prefix = `radio_${missionKey}_`
  const lines: RadioLine[] = []
  for (const [k, entry] of Object.entries(radioRaw)) {
    if (!k.startsWith(prefix)) continue
    ;(entry.radioSingleDataList ?? []).forEach((r: any, i: number) => {
      const line = adaptRadioLine(k, i, r, i18nMap)
      if (line.text) lines.push(line)
    })
  }
  return lines.sort((a, b) => a.key.localeCompare(b.key) || a.order - b.order)
}

// 台本任务级聚合：复用 adaptDialogLine（DialogTextTable），吃掉多场次
export function buildDialogLinesForMission(
  missionKey: string,
  dlgRaw: Record<string, any>,
  i18nMap?: Record<string, string>,
): DialogLine[] {
  const prefix = `dlg_${missionKey}_`
  return Object.entries(dlgRaw)
    .filter(([k]) => k.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => adaptDialogLine(k, v, i18nMap))
}
```

### 3.3 任务 key 规约（`extractMissionKey`）

`missionId` → 任务 key 提取，与 `DialogTextTable`/`RadioTable` 前缀匹配。供两板块共用：

```ts
// 纯函数，可单测
// missionId 与表 key 中任务段直接对应，无需归一化
export function extractMissionKey(missionId: string): string {
  return missionId  // 直接透传
}
```

**规约说明**：

现有 `DLG_KEY_RE`（`src/lib/adapter.ts:290`）解析 `dlg_` 前缀 key 的结构为：
```
dlg_{chapterType}{chapterNum}[l{levelNum}]m{missionNum}[d{missionSub}]_{sceneNo}[d{sceneSub}]
```

`MissionRuntime.missionId` 与 key 中任务段的对应关系：

| missionId 示例 | key 中任务段 | 提取逻辑 |
|---------------|-------------|---------|
| `gm02m13` | `gm02m13` | 直接透传 |
| `gm02l4` | `gm02l4` | 直接透传 |
| `a1m6d3` | `a1m6d3` | 直接透传 |
| `a1m6d3l2` | `a1m6d3l2` | 直接透传 |

实现阶段用真实任务（`gm02m13`、含 `l`/`d` 段任务）抽样校准，确保命中完整集。

### 3.4 Hooks `src/hooks/useData.ts`

```ts
export function useStoryScriptBundle(missionId: string): UseDataResult<{
  transcript: DialogLine[]
  radio: RadioLine[]
}> {
  const { locale } = useLocale()
  return useData(async () => {
    if (!missionId) return { transcript: [], radio: [] }
    const [dlgRaw, dlgI18n, radioRaw, radioI18n] = await Promise.all([
      getCachedData<Record<string, any>>('DialogTextTable', () => fetchTableAll('DialogTextTable')),
      getTableI18nDict('DialogTextTable', locale),
      getCachedData<Record<string, any>>('RadioTable', () => fetchTableAll('RadioTable')),
      getTableI18nDict('RadioTable', locale),
    ])
    const missionKey = extractMissionKey(missionId)
    return {
      transcript: buildDialogLinesForMission(missionKey, dlgRaw, dlgI18n),
      radio: buildRadioLinesForMission(missionKey, radioRaw, radioI18n),
    }
  }, [locale, missionId])
}
```

### 3.5 页面 `MissionDetailContent`

任务描述之后、任务目标之前渲染两板块：

```tsx
<div className="space-y-8 mb-8">
  <StoryTranscript missionId={mission.missionId} />
  <StoryRadio missionId={mission.missionId} />
</div>
```

**与现有 `DialogScript` 的关系**：

现有 `SceneBlock` 已按场次展开 `DialogScript`（逐场点击展开查看台词）。新增的 `StoryTranscript` 是**任务级聚合**，将全部场次台词连续展示，两者**并存但定位不同**：

| 板块 | 粒度 | 交互 | 用途 |
|------|------|------|------|
| `SceneBlock` + `DialogScript` | 场次级 | 逐场点击展开 | 快速浏览单场对话 |
| `StoryTranscript` | 任务级 | 折叠/展开全文 | 完整通读、引用、搜索 |
| `StoryRadio` | 任务级 | 折叠/展开全文 | 对讲机剧情完整展示 |

**StoryTranscript**：折叠头 `t('story.transcript')` + 台词计数，展开后按场次前缀（`dlg_{missionKey}_{sceneNo}`）分组台词，每条：说话人（金/绯红 + 人名）+ 台词（`<RichText>`）。复用现有 `DialogLine` 渲染样式。

**StoryRadio**：折叠头 `t('story.radio')` + 对讲计数，展开后逐条说话人 + 台词。

**排序规则**：
- 台本：按 key 字典序（`dlg_{missionKey}_{sceneNo}_{lineNo}`），场景内按行号排序。
- 对讲机：按 key 字典序（`radio_{missionKey}_{sceneNo}`），同一 entry 内按 `radioSingleDataList` 索引排序。

**三态**：loading 骨架；error `t('common.loadFailed')`；空态 `t('story.noTranscript')` / `t('story.noRadio')` 显示在板块内容区域。

### 3.6 i18n

`scripts/i18n-custom.json` 新增（14 语言）：

| key | CN | EN |
|-----|----|----|
| `story.transcript` | 台本 | Transcript |
| `story.radio` | 对讲机 | Radio |
| `story.noTranscript` | 暂无台本 | No transcript |
| `story.noRadio` | 暂无对讲机 | No radio |

生成：`node scripts/generate-i18n-dicts.ts`。

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）
- `types.ts` RadioLine；`adapter.ts` 三个函数 + `extractMissionKey`；`useData.ts` `useStoryScriptBundle`；`adapter-story.test.ts` 单测先行。

### 阶段二：页面（第 2 轮提交）
- `StoryMissionDetail.tsx` 两板块（或独立组件）；路由无需改（详情已在现有路由内）。

### 阶段三：多语言（第 3 轮提交）
- `i18n-custom.json` 4 个 key × 14 语言 → `generate-i18n-dicts.ts`。

### 阶段四：文档与测试（第 4 轮提交）
- `data-mapping-tables.md` 更新；E2E；`npm run lint && npm run test && npm run build`。

## 5. 测试计划

### 5.1 单元测试（`adapter-story.test.ts`）

- `extractMissionKey`：常规（`gm02m13`）、`l`/`d` 变体任务。
- `adaptRadioLine`：合法映射；缺说话人回退；空台词过滤。
- `buildRadioLinesForMission`：聚合去重、按 key/order 排序；未知任务 → `[]`。
- `buildDialogLinesForMission`：多场次聚合。

### 5.2 E2E（`story-transcript-radio.spec.ts`）

- 任务详情：台本板块展示台词；对讲板块展示对讲。
- 空态：无台词/无对讲任务各展示对应空态。
- 语言切换后板块标题正确。

## 6. 验收标准

- [ ] PRD 功能点 1-2 全部实现
- [ ] 4 个新增 i18n key × 14 语言全量
- [ ] `npm run lint` / `npm run test` / `npm run build` 通过
- [ ] E2E 通过

## 7. 风险与回滚

| 风险 | 缓解 |
|------|------|
| 任务 key 与表 key 段对应（`l`/`d` 变体）不符 | `extractMissionKey` 抽样校准 + 单测覆盖 |
| `DialogTextTable` 全表（2万+行）全量加载 | 版本缓存 + 骨架屏 + 任务内过滤仅读取 |
| 详情页过长 | 两板块默认折叠 |
| RadioTable 行 `radioSingleDataList` 嵌套 | 单测覆盖拆行逻辑 |

回滚：纯新增，不破坏既有 `DialogScript` 与任务详情，可直接回滚分支。

## 8. 相关文档

- [[20260809-story-recap-transcript-radio|剧情梗概：台本与对讲机产品方案]]
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [国际化规范](../references/i18n-spec.md)