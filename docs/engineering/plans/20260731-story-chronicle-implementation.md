---
description: 剧情纪事模块实现方案：数据层、页面、组件与多语言的可执行清单
type: Fleeting
---

# 剧情纪事 - 实现方案

**对应产品文档**: [[20260730-story-chronicle|剧情纪事产品方案]]
**对应技术方案**: [[20260730-story-chronicle|剧情纪事技术方案 v1.3]]
**实现方案版本**: v1.2
**创建日期**: 2026-07-31
**作者**: 前端工程
**开发分支**: `feat/story-chronicle`

**v1.2 变更（验收修订，2026-08-02）**: 依据验收报告同步最终实现——新增任务详情/对话/活动/音频相关文件与路由（MRA 数据源、任务目标树、场景对话展开、音频队列播放）；`StoryRecap` 改为 master-detail；`BakerTerminal` 改全视口固定壳 + topic URL 参数；`BakerContactList`/`BakerChatPanel`/`BakerMessageBubble` 组件签名按验收修订调整；i18n key 增删（移除 `story.chapterType.*`，新增 `story.noScene`/`story.prevQuest`/dungeon 与 stage 分组/对话展开/音频等）。差异详见 §9。

**v1.1 变更**: review 修正——①dlg key 正则覆盖全部 4 种变体（原正则仅匹配 734/1078，丢失全部 293 条 sm 支线等 344 个 key）；②篇章/任务/场次排序改为数值元组（chapter 数达 33、mission 数达 29、sceneNo 最大 13034，字符串排序必然错乱）；③Tailwind class 改用真实 token（`archive-ink`/`archive-file`/`archive-ivory`，原 `archive-bg`/`archive-surface`/`archive-hover`/`archive-active`/`archive-text` 均不存在）；④修正 `MODULE_CODES` 形状（`Record<string, string>`）与 `RichText` prop（`text`）；⑤新增 `getSpriteUrl` 素材 helper（原 `resolveIconUrl` 未定义）；⑥图片消息 `contentParam` 为数组取首项；⑦Baker 发送者名称/头像经 `SNSChatTable` 解析；⑧`resolveDialog` 重写：分支点节点本身无消息文本（999/999 content 为空）不产生空气泡、选中项成为「我」的消息、contentType 9 归并 reactions、未知类型跳过；⑨补齐 `usePrtsItemDetail` / `useBakerDialog` 实现；⑩topic 预览取最后一条消息且使用正确的 i18n dict；⑪i18n 补 `story.chapterType.other` / `baker.sessionSeparator`，key 计数修正为 36。

## 1. 概述

### 1.1 目标

将技术方案转化为可执行的代码实现清单：剧情梗概页（篇章导航 + 梗概流）、PRTS 文库页（分类页签 + 卷网格 + 详情）、Baker 聊天终端（联系人列表 + 聊天界面 + 分支求值）、总览页重构、路由导航、14 语言文案与测试。

### 1.2 范围

- **做**：`types.ts` / `adapter.ts` / `baker.ts` / `useData.ts` 数据层；`StoryRecap` / `StoryLibrary` / `StoryDocumentDetail` / `BakerTerminal` / `StoryOverview` 页面；路由 / Sidebar / Breadcrumb / ArchiveHome；`story.*` / `baker.*` i18n（14 语言全量）；adapter + baker 单测与 E2E。
- **不做**：剧情全文对话回放（`DialogTextTable`）；全文搜索；音频/视频播放；文献关联网络；Baker 测试用消息类型专门渲染。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/story/StoryRecap.tsx` | 剧情梗概页（篇章导航 + 梗概流） |
| `src/pages/story/StoryLibrary.tsx` | PRTS 文库页（分类页签 + 卷网格） |
| `src/pages/story/StoryDocumentDetail.tsx` | 文献详情页（正文 / 剧本） |
| `src/pages/baker/BakerTerminal.tsx` | Baker 聊天终端（联系人列表 + 聊天面板） |
| `src/components/Baker/BakerMessageBubble.tsx` | 消息气泡组件 |
| `src/components/Baker/BakerOptionGroup.tsx` | 分支选项组组件 |
| `src/components/Baker/BakerContactList.tsx` | 联系人列表组件 |
| `src/components/Baker/BakerChatPanel.tsx` | 聊天面板组件 |
| `src/lib/baker.ts` | 消息图遍历与分支求值 `resolveDialog` |
| `src/lib/__tests__/adapter-story.test.ts` | 剧情梗概 / PRTS 适配器单测 |
| `src/lib/__tests__/baker.test.ts` | Baker 分支求值单测 |
| `tests/e2e/src/story-chronicle.spec.ts` | 剧情纪事模块 E2E |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 新增 `StoryRecapScene` / `StoryRecapChapter` / `PrtsCategory` / `PrtsVolume` / `PrtsItem` / `PrtsItemDetail` / `BakerChat` / `BakerMessage` / `BakerOption` / `BakerBeat` |
| `src/lib/adapter.ts` | 新增 `adaptRecapScene` / `adaptRecapFallbackScene` / `adaptRecapChapter` / `adaptPrtsCategory` / `adaptPrtsVolume` / `adaptPrtsItem` / `adaptPrtsItemDetail` / `adaptBakerChat` / `adaptBakerMessage` / `resolveContentType` / `getSpriteUrl` / `BakerSpeakerContext` |
| `src/hooks/useData.ts` | 新增 `useStoryRecap` / `usePrtsLibrary` / `usePrtsItemDetail` / `useBakerChats` / `useBakerDialog` |
| `src/pages/story/StoryOverview.tsx` | 重构：双入口卡（剧情梗概 + PRTS 文库） |
| `src/App.tsx` | 新增 4 条路由 |
| `src/components/Layout/Sidebar.tsx` | story 文案更新 + baker 入口 |
| `src/components/Layout/Breadcrumb.tsx` | 补充 recap / library / baker 映射 |
| `src/routes/ArchiveHome.tsx` | baker 入口卡片 |
| `src/data/archiveMeta.ts` | MODULE_CODES 新增 baker: HSA-BKR |
| `scripts/i18n-custom.json` | 新增 story.* / baker.* namespace（14 语言） |

### 2.3 删除文件

无。`StoryOverview.tsx` 为原地重写，已计入 §2.2 修改文件。

## 3. 详细实现

### 3.1 类型定义 `src/lib/types.ts`

```ts
// ===== 剧情梗概 =====
export interface StoryRecapScene {
  id: string                // summary id (e.g. "summary_e1m1_1_001")
  dlgId: string             // dlg_e1m3_4
  chapterId: string         // e1
  missionId: string         // e1m3（含 l/d 变体，如 sm2l4m5、a1m8d1）
  sceneNo: number           // 4
  sceneSub: number          // 场次 d 后缀差分序号（dlg_e1m1_4d2 → 2，无则 0）
  chapterType: string       // e | sm | c | f | gm | a | db | m
  code: string              // E1·M3·场04（「场」由 t('story.scene') 注入，跟随语言）
  text: string              // 梗概正文
}

export interface StoryRecapMission {
  missionId: string
  scenes: StoryRecapScene[]
}

export interface StoryRecapChapter {
  chapterId: string         // e1
  chapterType: string       // e
  missions: StoryRecapMission[]
}

// ===== PRTS 文库 =====
export interface PrtsCategory {
  id: string                // document | paper | digital | collection | report | media
  name: string              // i18n
  order: number
  itemCount: number
}

export interface PrtsVolume {
  id: string                // PrtsFirstLv key
  categoryId: string
  name: string              // i18n
  subName: string           // i18n（副题）
  iconUrl: string
  order: number
  itemIds: string[]
}

export interface PrtsItem {
  id: string                // PrtsAllItem key
  volumeId: string
  type: 'text' | 'document' | 'multi_media'
  name: string              // i18n
  desc: string              // i18n
  order: number
  contentId: string
}

export interface PrtsItemDetail extends PrtsItem {
  volumeName: string
  categoryId: string
  contents: { title: string; segments: string[] }[]
  script?: { speaker: string; line: string }[]
}

// ===== Baker =====
export interface BakerChat {
  id: string                // chatId
  kind: 'operator' | 'contact' | 'group'  // chatType 3 / 1 / 2
  name: string              // i18n
  iconUrl: string
  isSettlementChannel: boolean
}

export interface BakerMessage {
  id: string                // `${dialogId}:${contentId}`
  speakerId: string         // endmin | chatId | ''
  isSelf: boolean
  speakerName: string
  speakerIconUrl: string
  kind: 'text' | 'image' | 'sticker' | 'system' | 'share' | 'mission'
  text: string
  imageUrl?: string
  reactions?: { emojiUrl: string; fromNames: string[]; count: number }[]
}

export interface BakerOption {
  id: string                // optionId
  text: string
  emojiUrl?: string
}

export interface BakerBeat {
  messages: BakerMessage[]
  options?: BakerOption[]
  selectedOptionId?: string // 分支点当前选中项（choices 或默认第一项），选项组选中态用
  branchId?: number         // 分支点 contentId，分支切换回调用
}

export interface BakerTopic {
  topicId: string
  topicName: string         // i18n（有标题显示标题，无标题显示该 topic 最后一条消息预览）
  sortId: number
  dialogs: { dialogId: string; preview: string }[]  // preview = 该场聊天最后一条消息
}
```

### 3.2 适配器 `src/lib/adapter.ts`

#### 3.2.0 素材 URL helper（`src/lib/adapter.ts` 新增）

代码库无 `resolveIconUrl`，现有模式为 `getItemIconUrl`（`lib/icons.ts`，`ASSET_BASE` + 完整路径）。`ASSET_BASE` 定义在 `adapter.ts`，为避免 adapter ↔ icons 循环依赖，`getSpriteUrl` 直接定义在 `adapter.ts` 并导出，本模块所有素材 URL 统一走它：

```ts
// src/lib/adapter.ts（ASSET_BASE 同文件）
export function getSpriteUrl(path: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/${path}.png`
}
// 头像：getSpriteUrl(`charroundicon/${icon}`)
// 表情包：getSpriteUrl(`sns/emoji/${resPath}`)
// 图片消息：getSpriteUrl(`sns/picture/${imageId}`)
// 卷图标：getSpriteUrl(`prts/icon/${icon}`) → onError 回退 getSpriteUrl(`prts/${icon}`) → 占位图形
```

#### 3.2.1 `adaptRecapScene`（剧情梗概）

```ts
// dlg key 四种变体（已对全量 1078 个 key 验证，0 遗漏）：
//   dlg_e1m3_4      常规：篇章 e1 · 任务 m3 · 第 4 场
//   dlg_sm2l4m5_9   l 段（293 条 sm 支线全部为此型）：篇章 sm2 · 段落 l4 · 任务 m5
//   dlg_a1m8d1_1    m 后 d 段（117 条）：任务 m8 的子段 d1
//   dlg_e1m1_4d2    场次 d 后缀（65 条）：第 4 场的差分 d2
const DLG_KEY_RE = /^dlg_([a-z]+)(\d+)(?:l(\d+))?m(\d+)(?:d(\d+))?_(\d+)(?:d(\d+))?$/

export function adaptRecapScene(
  dlgKey: string,
  summaryId: string,
  summaryText: { id?: number | string; text?: string },
  i18nMap: Record<string, string> | undefined,
  sceneLabel: string,              // t('story.scene')，编号中的「场」跟随语言，禁止硬编码
): StoryRecapScene | null {
  const m = DLG_KEY_RE.exec(dlgKey)
  if (!m) return null              // 未识别 key → null，由上层归入「其他」分组并 console.warn，不丢弃
  const [, chapterType, chapterNum, lvNum, missionNum, missionSub, sceneNo, sceneSub] = m
  const chapterId = `${chapterType}${chapterNum}`
  const missionId = `${chapterId}${lvNum ? `l${lvNum}` : ''}m${missionNum}${missionSub ? `d${missionSub}` : ''}`
  const code = `${chapterId.toUpperCase()}·M${missionNum}·${sceneLabel}${String(sceneNo).padStart(2, '0')}${sceneSub ? `d${sceneSub}` : ''}`
  return {
    id: summaryId,
    dlgId: dlgKey,
    chapterId,
    missionId,
    sceneNo: Number(sceneNo),
    sceneSub: sceneSub ? Number(sceneSub) : 0,
    chapterType,
    code,
    text: resolveI18n(summaryText, i18nMap),
  }
}

// 未识别 key 兜底：归入「其他」分组（chapterType='other'），保留原文不丢弃
export function adaptRecapFallbackScene(
  dlgKey: string,
  summaryId: string,
  summaryText: { id?: number | string; text?: string },
  i18nMap: Record<string, string> | undefined,
  sceneLabel: string,
): StoryRecapScene {
  return {
    id: summaryId,
    dlgId: dlgKey,
    chapterId: 'other',
    missionId: dlgKey,
    sceneNo: 0,
    sceneSub: 0,
    chapterType: 'other',
    code: `${dlgKey}·${sceneLabel}--`,
    text: resolveI18n(summaryText, i18nMap),
  }
}
```

#### 3.2.2 `adaptRecapChapter`（篇章聚合）

排序必须基于 dlg key 解析出的**数值元组**，禁止字符串 `localeCompare`（chapter 数达 33、mission 数达 29、sceneNo 最大 13034，字符串排序会把 `e10` 排到 `e2` 前、第 10 场排到第 4 场前）：

```ts
type SortTuple = [string, number, number, number, number, number, number]
// [chapterType, chapterNum, lvNum, missionNum, missionSub, sceneNo, sceneSub]

function dlgSortKey(s: StoryRecapScene): SortTuple {
  const m = DLG_KEY_RE.exec(s.dlgId)
  if (!m) return [s.chapterType, 999, 0, 999, 0, 999, 0]  // 未识别排最后
  const [, ct, cn, lv, mn, md, sn, sd] = m
  return [ct, Number(cn), Number(lv ?? 0), Number(mn), Number(md ?? 0), Number(sn), Number(sd ?? 0)]
}

function compareTuple(a: SortTuple, b: SortTuple): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue
    return typeof a[i] === 'string'
      ? (a[i] as string).localeCompare(b[i] as string)
      : (a[i] as number) - (b[i] as number)
  }
  return 0
}

export function adaptRecapChapter(scenes: StoryRecapScene[]): StoryRecapChapter[] {
  // 先整体按数值元组排序，再稳定分组（分组内顺序天然正确）
  const sorted = [...scenes].sort((a, b) => compareTuple(dlgSortKey(a), dlgSortKey(b)))
  const chapters: StoryRecapChapter[] = []
  let chapter: StoryRecapChapter | null = null
  let mission: StoryRecapMission | null = null
  for (const s of sorted) {
    if (!chapter || chapter.chapterId !== s.chapterId) {
      chapter = { chapterId: s.chapterId, chapterType: s.chapterType, missions: [] }
      chapters.push(chapter)
      mission = null
    }
    if (!mission || mission.missionId !== s.missionId) {
      mission = { missionId: s.missionId, scenes: [] }
      chapter.missions.push(mission)
    }
    mission.scenes.push(s)
  }
  return chapters
}
```

#### 3.2.3 `adaptPrtsCategory` / `adaptPrtsVolume` / `adaptPrtsItem`

```ts
export function adaptPrtsCategory(raw: any, i18nMap?: Record<string, string>): PrtsCategory {
  return {
    id: raw.$key ?? '',
    name: resolveI18n(raw.name, i18nMap),
    order: raw.order ?? 0,
    itemCount: 0, // 需聚合计算
  }
}

export function adaptPrtsVolume(raw: any, i18nMap?: Record<string, string>): PrtsVolume {
  return {
    id: raw.$key ?? '',
    categoryId: raw.categoryId ?? '',
    name: resolveI18n(raw.name, i18nMap),
    subName: resolveI18n(raw.subName, i18nMap),
    iconUrl: raw.icon ? getSpriteUrl(`prts/icon/${raw.icon}`) : '',  // onError 回退 `prts/${raw.icon}` → 占位
    order: raw.order ?? 0,
    itemIds: raw.itemIds ?? [],
  }
}

export function adaptPrtsItem(raw: any, i18nMap?: Record<string, string>): PrtsItem {
  return {
    id: raw.$key ?? '',
    volumeId: raw.firstLvId ?? '',
    type: raw.type ?? 'text',
    name: resolveI18n(raw.name, i18nMap),
    desc: resolveI18n(raw.desc, i18nMap),
    order: raw.order ?? 0,
    contentId: raw.contentId ?? '',
  }
}
```

#### 3.2.4 `adaptBakerChat` / `adaptBakerMessage`

```ts
const CHAT_TYPE_MAP: Record<number, BakerChat['kind']> = {
  1: 'contact',
  2: 'group',
  3: 'operator',
}

export function adaptBakerChat(raw: any, i18nMap?: Record<string, string>): BakerChat {
  return {
    id: raw.$key ?? '',
    kind: CHAT_TYPE_MAP[raw.chatType] ?? 'contact',
    name: resolveI18n(raw.name, i18nMap),
    iconUrl: raw.icon ? getSpriteUrl(`charroundicon/${raw.icon}`) : '',
    isSettlementChannel: raw.isSettlementChannel ?? false,
  }
}

// 发送者解析上下文：全部 86 个非 endmin speaker 均可经 SNSChatTable 解析（已验证），
// 名称/头像必须由此而来，禁止直接展示原始 chatId（PRD 功能点 5：群聊展示头像与昵称）
export interface BakerSpeakerContext {
  chatMap: Record<string, BakerChat>  // SNSChatTable 适配结果（key = chatId = speaker）
  selfName: string                    // t('baker.selfName')，由页面层注入
  selfIconUrl: string                 // getSpriteUrl('charroundicon/icon_round_chr_0003_endminf')
}

// 返回 null = 跳过不渲染；contentType 9 不走此函数（在 resolveDialog 内归并）
export function resolveContentType(type: number): BakerMessage['kind'] | null {
  const map: Record<number, BakerMessage['kind']> = {
    1: 'text',
    2: 'image',
    7: 'system',
    10: 'share',
    12: 'mission',
  }
  return map[type] ?? null
}

export function adaptBakerMessage(
  dialogId: string,
  contentId: string,
  raw: any,
  ctx: BakerSpeakerContext,
  i18nMap?: Record<string, string>
): BakerMessage | null {
  const kind = resolveContentType(raw.contentType)
  if (!kind) return null           // 未知类型（4/5/6/8/11 测试类型）跳过不渲染
  const isSelf = raw.speaker === 'endmin'
  const speakerChat = isSelf ? undefined : ctx.chatMap[raw.speaker]
  return {
    id: `${dialogId}:${contentId}`,
    speakerId: raw.speaker ?? '',
    isSelf,
    speakerName: isSelf ? ctx.selfName : speakerChat?.name ?? '',
    speakerIconUrl: isSelf ? ctx.selfIconUrl : speakerChat?.iconUrl ?? '',
    kind,
    text: resolveI18n(raw.content, i18nMap),
    // contentParam 为数组（线上 28 条图片消息全部为 list），取首项
    imageUrl: kind === 'image' && raw.contentParam?.[0]
      ? getSpriteUrl(`sns/picture/${raw.contentParam[0]}`)
      : undefined,
    reactions: undefined, // contentType 9 由 resolveDialog 归并填充
  }
}
```

### 3.3 Baker 分支求值 `src/lib/baker.ts`

已验证的数据事实（决定以下设计）：

- **分支点节点本身无消息文本**：999 个带 `dialogOptionIds` 的节点全部 `contentType=1` 且 `content.id` 为空，是纯选项容器——**不得**对分支点节点生成消息气泡。
- 选中选项成为「我」发出的消息（PRD 功能点 5），插入分支点之后；选项带 `optionResPath`（143 条）时以表情包（sticker）形式发送。
- `contentType=9`（表情回应）不独立渲染，按 `preContentId` 归并到目标消息的 `reactions`。
- `contentType=4/5/6/8/11`（共 7 条，`sns_test_*` 测试会话）跳过不渲染。
- `nextContentId` 为 `-1` 或 `0`（线上分别为 314 / 1368 处）即会话结束；悬空引用防御性视为结束（环保护：visited set）。

```ts
import { adaptBakerMessage, resolveContentType, getSpriteUrl, resolveI18n, type BakerSpeakerContext } from './adapter'

interface RawNode {
  content: { id?: number | string; text?: string }
  contentType: number
  speaker: string
  nextContentId: number
  preContentId: number
  dialogOptionIds: string[]
  contentParam?: string[]          // contentType 2：图片 id 数组
  contentParams?: string           // contentType 9：JSON 字符串 [{emojiResPath, npcIds, npcCount}]
  isEnd: boolean
}

interface RawOption {
  optionDesc: { id?: number | string; text?: string }
  optionNextContentId: number
  optionResPath: string            // 非空 = 以表情包回复
  optionNPCIds: string[]
}

export interface ResolveContext {
  speaker: BakerSpeakerContext
  dialogI18n?: Record<string, string>   // SNSDialogTable dict
  optionI18n?: Record<string, string>   // SNSDialogOptionTable dict
  startId?: string                      // SNSConst.snsDialogStartId，默认 '1'
}

export function resolveDialog(
  dialogId: string,
  nodes: Record<string, RawNode>,
  options: Record<string, RawOption>,
  choices: Record<number, string> = {},
  ctx: ResolveContext,
): BakerBeat[] {
  const beats: BakerBeat[] = []
  const visited = new Set<string>()
  let currentId = ctx.startId ?? '1'

  const findMessage = (contentId: string) =>
    beats.flatMap((b) => b.messages).find((m) => m.id === `${dialogId}:${contentId}`)

  while (currentId && currentId !== '-1' && currentId !== '0' && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodes[currentId]
    if (!node) break                       // 悬空引用 → 视为会话结束

    // 分支点：节点本身无消息文本，不产生气泡
    if (node.dialogOptionIds?.length) {
      const validIds = node.dialogOptionIds.filter((oid) => options[oid])
      if (!validIds.length) break
      const selectedId = choices[Number(currentId)] ?? validIds[0]  // 默认第一项
      const selected = options[selectedId]
      beats.push({
        messages: [],
        branchId: Number(currentId),
        selectedOptionId: selectedId,
        options: validIds.map((oid) => ({
          id: oid,
          text: resolveI18n(options[oid].optionDesc, ctx.optionI18n),
          emojiUrl: options[oid].optionResPath ? getSpriteUrl(`sns/emoji/${options[oid].optionResPath}`) : undefined,
        })),
      })
      // 选中项成为「我」的消息（带 optionResPath 时为表情包）
      beats.push({
        messages: [{
          id: `${dialogId}:${currentId}:${selectedId}`,
          speakerId: 'endmin',
          isSelf: true,
          speakerName: ctx.speaker.selfName,
          speakerIconUrl: ctx.speaker.selfIconUrl,
          kind: selected.optionResPath ? 'sticker' : 'text',
          text: resolveI18n(selected.optionDesc, ctx.optionI18n),
          imageUrl: selected.optionResPath ? getSpriteUrl(`sns/emoji/${selected.optionResPath}`) : undefined,
        }],
      })
      currentId = String(selected.optionNextContentId)
      continue
    }

    // 表情回应：归并到 preContentId 对应消息，不独立渲染
    if (node.contentType === 9) {
      const target = findMessage(String(node.preContentId))
      const reaction = parseReaction(node.contentParams, ctx)
      if (target && reaction) (target.reactions ??= []).push(reaction)
      // 归属失败时静默丢弃（线上仅 1 条，不影响会话）
      currentId = String(node.nextContentId)
      continue
    }

    // 常规消息（adaptBakerMessage 内部对未知 contentType 返回 null）
    const message = adaptBakerMessage(dialogId, currentId, node, ctx.speaker, ctx.dialogI18n)
    if (message) beats.push({ messages: [message] })
    currentId = String(node.nextContentId)
  }
  return beats
}

function parseReaction(contentParams: string | undefined, ctx: ResolveContext) {
  if (!contentParams) return null
  try {
    const [r] = JSON.parse(contentParams)
    if (!r?.emojiResPath) return null
    return {
      emojiUrl: getSpriteUrl(`sns/emoji/${r.emojiResPath}`),
      fromNames: (r.npcIds ?? []).map((id: string) => ctx.speaker.chatMap[id]?.name ?? id),
      count: r.npcCount ?? (r.npcIds?.length ?? 0),
    }
  } catch {
    return null
  }
}
```

**分支切换（页面层职责）**：`choices` 用有序数组维护，切换即截断该分支点之后的旧选择再追加，与技术方案 §4.3 一致：

```ts
type Choice = { branchId: number; optionId: string }
const [choices, setChoices] = useState<Choice[]>([])
const switchBranch = (branchId: number, optionId: string) =>
  setChoices((prev) => {
    const idx = prev.findIndex((c) => c.branchId === branchId)
    return [...(idx >= 0 ? prev.slice(0, idx) : prev), { branchId, optionId }]
  })
// 渲染时：resolveDialog(dialogId, nodes, options, Object.fromEntries(choices.map(c => [c.branchId, c.optionId])), ctx)
```

### 3.4 Hooks `src/hooks/useData.ts`

#### 3.4.1 `useStoryRecap`

```ts
export function useStoryRecap(): UseDataResult<{
  scenes: StoryRecapScene[]
  chapters: StoryRecapChapter[]
  stats: { total: number; byType: Record<string, number> }
}> {
  const { locale } = useLocale()
  const { t } = useI18n()   // sceneLabel 注入（t('story.scene')）
  return useData(async () => {
    const [mapRaw, summaryRaw, summaryI18n] = await Promise.all([
      getCachedData<Record<string, string>>('DialogSummaryMapTable', () => fetchTableAll('DialogSummaryMapTable')),
      getCachedData<Record<string, any>>('DialogSummaryTable', () => fetchTableAll('DialogSummaryTable')),
      getTableI18nDict('DialogSummaryTable', locale),
    ])
    const scenes = Object.entries(mapRaw)
      .map(([dlgKey, summaryId]) => {
        const summary = summaryRaw[summaryId]   // entry 本身就是 i18n 字段 { id, text }
        if (!summary) return null
        const scene = adaptRecapScene(dlgKey, summaryId, summary, summaryI18n, t('story.scene'))
        if (!scene) console.warn(`[story-recap] 未识别的 dlg key: ${dlgKey}`)  // 归入「其他」分组，不丢弃
        return scene ?? adaptRecapFallbackScene(dlgKey, summaryId, summary, summaryI18n, t('story.scene'))
      })
      .filter((s): s is StoryRecapScene => s !== null)
    const chapters = adaptRecapChapter(scenes)   // 内部完成数值元组排序
    const byType: Record<string, number> = {}
    for (const s of scenes) byType[s.chapterType] = (byType[s.chapterType] ?? 0) + 1
    return { scenes, chapters, stats: { total: scenes.length, byType } }
  }, [locale])
}
```

#### 3.4.2 `usePrtsLibrary`

```ts
export function usePrtsLibrary(): UseDataResult<{
  categories: PrtsCategory[]
  volumes: PrtsVolume[]
  items: PrtsItem[]
}> {
  const { locale } = useLocale()
  return useData(async () => {
    const [catRaw, volRaw, itemRaw, catI18n, volI18n, itemI18n] = await Promise.all([
      getCachedData<Record<string, any>>('PrtsCategory', () => fetchTableAll('PrtsCategory')),
      getCachedData<Record<string, any>>('PrtsFirstLv', () => fetchTableAll('PrtsFirstLv')),
      getCachedData<Record<string, any>>('PrtsAllItem', () => fetchTableAll('PrtsAllItem')),
      getTableI18nDict('PrtsCategory', locale),
      getTableI18nDict('PrtsFirstLv', locale),
      getTableI18nDict('PrtsAllItem', locale),
    ])
    const categories = Object.entries(catRaw).map(([k, v]) => adaptPrtsCategory({ ...(v as any), $key: k }, catI18n))
    const volumes = Object.entries(volRaw).map(([k, v]) => adaptPrtsVolume({ ...(v as any), $key: k }, volI18n))
    const items = Object.entries(itemRaw).map(([k, v]) => adaptPrtsItem({ ...(v as any), $key: k }, itemI18n))
    // 聚合 itemCount
    for (const cat of categories) {
      cat.itemCount = items.filter((i) => volumes.find((v) => v.id === i.volumeId && v.categoryId === cat.id)).length
    }
    return { categories, volumes, items }
  }, [locale])
}
```

#### 3.4.3 `usePrtsItemDetail`（文献详情）

技术方案 §4.2：正文 `RichContentTable` 走 all + 版本缓存；`RadioTable`（2909 条）按需取单条，不拉全表。

```ts
export function usePrtsItemDetail(itemId: string): UseDataResult<PrtsItemDetail | null> {
  const { locale } = useLocale()
  return useData(async () => {
    const [itemRaw, volRaw, itemI18n, volI18n] = await Promise.all([
      getCachedData<Record<string, any>>('PrtsAllItem', () => fetchTableAll('PrtsAllItem')),
      getCachedData<Record<string, any>>('PrtsFirstLv', () => fetchTableAll('PrtsFirstLv')),
      getTableI18nDict('PrtsAllItem', locale),
      getTableI18nDict('PrtsFirstLv', locale),
    ])
    const item = itemRaw[itemId]
    if (!item) return null
    const base = adaptPrtsItem({ ...item, $key: itemId }, itemI18n)
    const volume = volRaw[base.volumeId]
    const detail: PrtsItemDetail = {
      ...base,
      volumeName: resolveI18n(volume?.name, volI18n),
      categoryId: volume?.categoryId ?? '',
      contents: [],
    }
    if (base.type === 'multi_media') {
      // 按需单条加载 + entry 级 i18n dict（缓存键沿用 getCachedData(table, fetcher, key)）
      const [radio, radioI18n] = await Promise.all([
        getCachedData<any>('RadioTable', () => fetchTableEntry('RadioTable', base.contentId), base.contentId),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_RadioTable`,
          () => fetchTableDictEntry('RadioTable', base.contentId, locale), base.contentId),
      ])
      detail.script = (radio?.radioSingleDataList ?? []).map((r: any) => ({
        speaker: resolveI18n(r.actorName, radioI18n),
        line: resolveI18n(r.radioText, radioI18n),
      }))
    } else {
      const [richRaw, richI18n] = await Promise.all([
        getCachedData<Record<string, any>>('RichContentTable', () => fetchTableAll('RichContentTable')),
        getTableI18nDict('RichContentTable', locale),
      ])
      const rich = richRaw[base.contentId]
      if (rich) {
        detail.contents = [{
          title: resolveI18n(rich.title, richI18n),
          segments: (rich.contentList ?? []).map((c: any) => resolveI18n(c.content, richI18n)),
        }]
      }
    }
    return detail
  }, [locale, itemId])
}
```

#### 3.4.4 `useBakerChats` / `useBakerDialog`

```ts
export function useBakerChats(): UseDataResult<{ chats: BakerChat[]; topics: BakerTopic[] }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [chatRaw, topicRaw, dialogRaw, chatI18n, topicI18n, dialogI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SNSChatTable', () => fetchTableAll('SNSChatTable')),
      getCachedData<Record<string, any>>('SNSDialogTopicTable', () => fetchTableAll('SNSDialogTopicTable')),
      getCachedData<Record<string, any>>('SNSDialogTable', () => fetchTableAll('SNSDialogTable')),
      getTableI18nDict('SNSChatTable', locale),
      getTableI18nDict('SNSDialogTopicTable', locale),
      getTableI18nDict('SNSDialogTable', locale),
    ])
    const chats = Object.entries(chatRaw).map(([k, v]) => adaptBakerChat({ ...(v as any), $key: k }, chatI18n))
    // 预览 = 该场聊天沿 nextContentId 走到末节点的最后一条文本消息；用 dialog 自己的 i18n dict
    const lastMessagePreview = (dialog: any): string => {
      const nodes = dialog?.dialogContentData ?? {}
      let id = '1', last = ''
      const visited = new Set<string>()
      while (id && id !== '-1' && id !== '0' && !visited.has(id)) {
        visited.add(id)
        const node = nodes[id]
        if (!node) break
        if (node.contentType === 1 && node.content?.id) last = resolveI18n(node.content, dialogI18n)
        id = String(node.nextContentId)
      }
      return last
    }
    const topics = Object.entries(topicRaw).map(([k, v]: [string, any]) => ({
      topicId: k,
      topicName: resolveI18n(v.topicName, topicI18n),
      sortId: v.sortId ?? 0,
      dialogs: (v.includeDialogIds ?? []).map((did: string) => ({
        dialogId: did,
        preview: lastMessagePreview(dialogRaw[did]),
      })),
    }))
    return { chats, topics: topics.sort((a, b) => a.sortId - b.sortId) }
  }, [locale])
}

// 进入模块即加载（技术方案 §4.4：均为小表，无按需加载点）；
// 页面层对每个 dialog 调 resolveDialog 按 choices 重算消息流
export function useBakerDialog(chatId: string | null): UseDataResult<{
  dialogs: { dialogId: string; topicId: string; nodes: Record<string, any> }[]  // 已按剧情顺序排序
  options: Record<string, any>
  ctx: Omit<ResolveContext, 'speaker'>
} | null> {
  const { locale } = useLocale()
  return useData(async () => {
    if (!chatId) return null
    const [dialogRaw, optionRaw, topicRaw, constRaw, dialogI18n, optionI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SNSDialogTable', () => fetchTableAll('SNSDialogTable')),
      getCachedData<Record<string, any>>('SNSDialogOptionTable', () => fetchTableAll('SNSDialogOptionTable')),
      getCachedData<Record<string, any>>('SNSDialogTopicTable', () => fetchTableAll('SNSDialogTopicTable')),
      getCachedData<Record<string, any>>('SNSConst', () => fetchTableAll('SNSConst')),
      getTableI18nDict('SNSDialogTable', locale),
      getTableI18nDict('SNSDialogOptionTable', locale),
    ])
    const topicSort = new Map(Object.entries(topicRaw).map(([k, v]: [string, any]) => [k, v.sortId ?? 0]))
    const dialogs = Object.entries(dialogRaw)
      .filter(([, d]: [string, any]) => d.chatId === chatId)
      .map(([k, d]: [string, any]) => ({ dialogId: k, topicId: d.topicId ?? '', nodes: d.dialogContentData ?? {} }))
      .sort((a, b) =>
        (topicSort.get(a.topicId) ?? 0) - (topicSort.get(b.topicId) ?? 0) ||  // topic sortId 优先
        a.dialogId.localeCompare(b.dialogId))                                  // 同 topic 按 dialogId 兜底
    return {
      dialogs,
      options: optionRaw,
      ctx: { dialogI18n, optionI18n, startId: String(constRaw?.snsDialogStartId ?? '1') },
    }
  }, [locale, chatId])
}
```

### 3.5 组件

#### 3.5.1 `BakerContactList.tsx`

```tsx
interface BakerContactListProps {
  chats: BakerChat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
}

// 布局：h-full flex flex-col
// Tab 栏：flex gap-1 p-2 border-b border-archive-border
//   - 四个 Tab：全部 / 干员 / 联系人 / 群聊
//   - Tab 激活态：text-archive-gold border-b-2 border-archive-gold
//   - Tab 未激活：text-archive-dust hover:text-archive-ivory
// 列表：flex-1 overflow-y-auto
//   - 条目：flex items-center gap-3 p-3 hover:bg-archive-file cursor-pointer
//   - 头像：w-10 h-10 rounded-full border border-archive-border
//   - 名称：text-sm truncate
//   - 选中态：bg-archive-file border-l-2 border-archive-gold
```

#### 3.5.2 `BakerChatPanel.tsx`

```tsx
interface BakerChatPanelProps {
  chat: BakerChat
  topics: BakerTopic[]
  beats: BakerBeat[]
  onSwitchOption: (branchId: number, optionId: string) => void  // branchId = 分支点 contentId
}

// 布局：h-full flex flex-col
// Topic 栏（顶部）：flex overflow-x-auto gap-2 p-2 border-b border-archive-border
//   - Topic 按钮：px-3 py-1 rounded-full text-xs whitespace-nowrap
//   - 激活态：bg-archive-gold/20 text-archive-gold
//   - 未激活：bg-archive-file text-archive-dust hover:text-archive-ivory
//   - 有标题显示标题，无标题显示最后消息预览（截断 20 字）
// 消息流：flex-1 overflow-y-auto p-4 space-y-4
//   - 会话分隔条：flex items-center gap-2 my-4
//     - 线条：flex-1 border-t border-archive-border
//     - 标签：text-xs text-archive-dust px-2
//   - 消息气泡：
//     - 他人：flex gap-2 (头像 32x32 + 内容)
//       - 头像：w-8 h-8 rounded-full
//       - 昵称：text-xs text-archive-dust
//       - 气泡：bg-archive-file rounded-lg px-3 py-2 max-w-[70%]
//     - 我（endmin）：flex justify-end
//       - 气泡：bg-archive-gold/10 border border-archive-gold/30 rounded-lg px-3 py-2 max-w-[70%]
//     - 系统提示：text-center text-xs text-archive-dust py-2
//   - 表情回应角标：inline-flex items-center gap-1 text-xs text-archive-dust mt-1
//     - 表情图 16x16 + 回应人名
//   - 分支选项组：border border-archive-gold/30 rounded-lg p-3 space-y-2
//     - 选项按钮：w-full text-left px-3 py-2 rounded border border-archive-border
//     - 选中态：border-archive-gold bg-archive-gold/10
//     - 未选中：hover:border-archive-gold/50
//   - 图片消息：max-w-xs rounded overflow-hidden
//   - PRTS 分享卡：border border-archive-border rounded-lg p-3
//   - 任务链接卡：border border-archive-border rounded-lg p-3
```

#### 3.5.3 `BakerMessageBubble.tsx`

```tsx
interface BakerMessageBubbleProps {
  message: BakerMessage
  showAvatar: boolean  // 群聊显示头像
}

// 按 message.isSelf 决定左右布局
// 按 message.kind 渲染不同内容：
//   - text：富文本
//   - image：<img loading="lazy" />
//   - sticker：<img class="w-16 h-16" />
//   - system：居中灰字
//   - share：卡片（标题 + 描述 + 跳转）
//   - mission：卡片（任务编号）
```

### 3.6 页面

#### 3.6.1 `StoryRecap.tsx`（剧情梗概页）

```
布局：min-h-screen
├── 顶部筛选栏：sticky top-0 z-10 bg-archive-ink border-b border-archive-border
│   ├── 篇章类型 select：w-48
│   │   - 选项：全部 / 主线 / 支线 / 干员故事 / 地区事务 / 委托 / 谷地支线 / 协议空间 / 其他
│   │   - 同步 ?type= query param
│   └── 剧透提示：text-xs text-archive-dust
├── 主体：grid grid-cols-[240px_1fr] gap-6 p-6 (移动端 flex flex-col)
│   ├── 左侧篇章导航：sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto
│   │   ├── 篇章按钮组：space-y-1
│   │   │   ├── 篇章头：text-xs font-mono text-archive-gold uppercase
│   │   │   └── 任务子项：pl-4 text-sm hover:text-archive-gold cursor-pointer
│   │   └── 点击 scrollIntoView({ behavior: 'smooth', block: 'start' })
│   └── 右侧梗概流：space-y-4
│       ├── 任务分界：text-xs font-mono text-archive-dust border-b border-archive-border pb-2
│       └── 梗概卡片：relative pl-6 border-l-2 border-archive-gold/30
│           ├── 编号：font-mono text-xs text-archive-gold
│           └── 正文：text-sm leading-relaxed
├── 加载态：<ListSkeleton cards={12} />
└── 空态：text-center text-archive-dust py-12
```

#### 3.6.2 `StoryLibrary.tsx`（PRTS 文库页）

```
布局：min-h-screen p-6
├── 顶部页签栏：flex gap-2 mb-6 overflow-x-auto
│   └── 页签按钮：px-4 py-2 rounded-full text-sm whitespace-nowrap
│       ├── 激活态：bg-archive-gold/20 text-archive-gold
│       ├── 未激活：bg-archive-file text-archive-dust hover:text-archive-ivory
│       └── 标签：分类名 + 计数 badge
├── 卷网格：grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4
│   └── 卷卡片：border border-archive-border rounded-lg p-4 hover:border-archive-gold/40 cursor-pointer
│       ├── 图标：w-12 h-12 mx-auto mb-2（onError 用占位图）
│       ├── 卷名：text-sm font-medium text-center truncate
│       ├── 副题：text-xs text-archive-dust text-center truncate
│       └── 条目数：text-xs text-archive-gold text-center
├── 卷内条目（点击展开 accordion）：border-t border-archive-border mt-4 pt-4
│   └── 条目列表：space-y-2
│       └── 条目行：flex items-center gap-2 p-2 hover:bg-archive-file rounded cursor-pointer
│           ├── 类型标签：text-xs px-2 py-0.5 rounded（text/document/multi_media）
│           ├── 名称：text-sm flex-1
│           └── 箭头图标
├── 加载态：<ListSkeleton cards={20} />
└── 空态：当前分类暂无条目
```

#### 3.6.3 `StoryDocumentDetail.tsx`（文献详情页）

```
布局：max-w-3xl mx-auto p-6
├── 返回链接：← t('common.backToList', { list: t('story.library') })
├── 头部
│   ├── 分类 Badge：text-xs px-2 py-0.5 rounded bg-archive-file
│   ├── 卷名：text-xs text-archive-dust
│   ├── 标题：text-2xl font-display mt-2
│   ├── 档案编号：font-mono text-xs text-archive-gold（formatArchiveCode('story', item.order)）
│   └── 描述（如有）：text-sm text-archive-dust mt-2
├── 正文区（text / document 类）
│   └── contents 每篇
│       ├── 段标题（如有）：text-lg font-medium mt-6 mb-2
│       └── 段内容：<RichText text={segment} />（prop 为 text；插图由 RichText 内置 <image> 解析，img loading="lazy"）
├── 剧本区（multi_media 类）
│   ├── 标题：t('story.audioTranscript')
│   └── script 逐条
│       ├── 说话人：font-medium text-archive-gold
│       └── 台词：text-sm
├── 加载态：<DetailSkeleton />
├── 错误态：t('common.loadFailed')
└── 空态：t('story.emptyContent')
```

#### 3.6.4 `BakerTerminal.tsx`（Baker 聊天终端）

```
布局：h-[calc(100vh-4rem)] grid grid-cols-[300px_1fr] (移动端 flex flex-col)
├── 左侧 <BakerContactList />
│   ├── 四 Tab：全部 / 干员 / 联系人 / 群聊
│   └── 联系人列表
├── 右侧聊天区
│   ├── 未选会话：flex items-center justify-center text-archive-dust
│   │   └── 引导文案：t('baker.selectChat')
│   └── 已选会话：<BakerChatPanel />
│       ├── Topic 栏
│       ├── 消息流（BakerBeat 逐条渲染）
│       │   ├── messages → BakerMessageBubble
│       │   └── options → BakerOptionGroup
│       └── 分支切换回调
├── URL 同步：?chat={chatId} query param
└── 移动端：列表 ↔ 聊天经返回键切换
```

#### 3.6.5 `StoryOverview.tsx`（总览页，重构）

```
布局：max-w-4xl mx-auto p-6
├── 题名区
│   ├── Badge：HSA-STY
│   ├── 标题：text-3xl font-display
│   └── 定位文案：text-sm text-archive-dust
├── 双入口卡：grid grid-cols-2 gap-4 mt-8
│   ├── 剧情梗概卡
│   │   ├── 图标：w-16 h-16
│   │   ├── 标题：text-lg font-medium
│   │   ├── 计数：text-2xl font-mono text-archive-gold + 段
│   │   └── 说明：text-sm text-archive-dust
│   └── PRTS 文库卡
│       ├── 图标：w-16 h-16
│       ├── 标题：text-lg font-medium
│       ├── 计数：text-2xl font-mono text-archive-gold + 条
│       └── 说明：text-sm text-archive-dust
└── 剧透提示
```

### 3.7 路由 `src/App.tsx`

```tsx
import StoryRecap from './pages/story/StoryRecap'
import StoryLibrary from './pages/story/StoryLibrary'
import StoryDocumentDetail from './pages/story/StoryDocumentDetail'
import BakerTerminal from './pages/baker/BakerTerminal'

// 新增路由
<Route path="story/recap" element={<StoryRecap />} />
<Route path="story/library" element={<StoryLibrary />} />
<Route path="story/library/:itemId" element={<StoryDocumentDetail />} />
<Route path="baker" element={<BakerTerminal />} />
```

### 3.8 Sidebar / Breadcrumb / ArchiveHome

**Sidebar.tsx**：
- `nav.story` 文案保持「剧情纪事」（已在 i18n 中更新）
- `nav.storyDesc` 更新为「剧情梗概、PRTS 文库与 Baker 聊天终端」
- 大事记分组新增 `{ label: t('nav.baker'), path: '/archive/baker' }` 条目（Sidebar 条目结构为 label + path，无图标字段）

**Breadcrumb.tsx**：
- `useListLabel` 新增映射：`recap: t('breadcrumb.recap')`, `library: t('breadcrumb.library')`, `baker: t('breadcrumb.baker')`

**ArchiveHome.tsx**：
- 「大事记」分组新增 Baker 入口卡片（label: `t('nav.baker')`，desc: `t('nav.bakerDesc')`，path: `/archive/baker`）

**archiveMeta.ts**：
```ts
// MODULE_CODES 为 Record<string, string>，直接加一行：
baker: 'HSA-BKR',
```

### 3.9 i18n（`scripts/i18n-custom.json`，14 语言全量）

#### 3.9.1 story.* key

| key | CN | EN | 说明 |
|-----|----|----|------|
| `story.recap` | 剧情梗概 | Story Recap | |
| `story.recapDesc` | 官方剧情梗概连续阅读 | Official story recaps | |
| `story.library` | PRTS 文库 | PRTS Library | |
| `story.libraryDesc` | 六类世界观文献 | Worldview documents | |
| `story.spoilerHint` | 以下内容包含剧透 | Spoiler warning | |
| `story.scene` | 场 | Scene | 编号用 |
| `story.typeAll` | 全部 | All | |
| `story.chapterType.e` | 主线 | Main Story | 前缀归纳 |
| `story.chapterType.sm` | 支线 | Side Mission | |
| `story.chapterType.c` | 干员故事 | Operator Story | |
| `story.chapterType.f` | 地区事务 | Region Affairs | |
| `story.chapterType.gm` | 委托 | Commission | |
| `story.chapterType.a` | 谷地支线 | Valley Side | |
| `story.chapterType.db` | 协议空间 | Protocol Space | |
| `story.chapterType.m` | 其他 | Other | |
| `story.chapterType.other` | 其他 | Other | 未识别 key 兜底分组 |
| `story.emptyContent` | 正文暂缺 | No content available | |
| `story.audioTranscript` | 音像转写 | Audio Transcript | |
| `story.backToVolume` | 返回所属卷 | Back to volume | |
| `breadcrumb.recap` | 剧情梗概 | Recap | |
| `breadcrumb.library` | PRTS 文库 | Library | |

#### 3.9.2 baker.* key

| key | CN | EN | 说明 |
|-----|----|----|------|
| `nav.baker` | Baker | Baker | |
| `nav.bakerDesc` | 聊天软件会话剧情 | Chat app storylines | |
| `baker.title` | Baker | Baker | |
| `baker.tab.all` | 全部 | All | |
| `baker.tab.operator` | 干员 | Operators | |
| `baker.tab.contact` | 联系人 | Contacts | |
| `baker.tab.group` | 群聊 | Groups | |
| `baker.selectChat` | 选择联系人开始阅读 | Select a contact | |
| `baker.emptyChat` | 暂无消息 | No messages | |
| `baker.sessionSeparator` | 场次 {{n}} | Session {{n}} | 会话分隔条 |
| `baker.selfName` | 我 | Me | |
| `baker.reactedBy` | {{name}} 回应 | Reacted by {{name}} | |
| `baker.sharedArchive` | PRTS 文献分享 | Shared archive | |
| `baker.missionLink` | 任务链接 | Mission link | |
| `breadcrumb.baker` | Baker | Baker | |

以上共 **36 个新增 key**（story 21 个 + baker 15 个），另修改 `nav.story` / `nav.storyDesc` 两个既有 key；全部需提供 14 语言本土翻译，禁占位。

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）

- `types.ts`：StoryRecap*/Prts*/Baker* 类型
- `adapter.ts`：adaptRecap*/adaptPrts*/adaptBaker*
- `baker.ts`：resolveDialog
- `useData.ts`：useStoryRecap / usePrtsLibrary / usePrtsItemDetail / useBakerChats / useBakerDialog
- `adapter-story.test.ts` + `baker.test.ts` 单测先行

### 阶段二：组件层（第 2 轮提交）

- `BakerContactList` / `BakerChatPanel` / `BakerMessageBubble` / `BakerOptionGroup`

### 阶段三：页面与路由（第 3 轮提交）

- `StoryRecap` / `StoryLibrary` / `StoryDocumentDetail` / `BakerTerminal` / `StoryOverview`（重构）
- `App.tsx` 路由 / `Sidebar` / `Breadcrumb` / `ArchiveHome` / `archiveMeta`

### 阶段四：多语言（第 4 轮提交）

- `i18n-custom.json` 36 个新增 key × 14 语言（另修改 nav.story / nav.storyDesc）→ `generate-i18n-dicts.ts`

### 阶段五：测试与验证（第 5 轮提交）

- E2E `story-chronicle.spec.ts`；`npm run lint && npm run test && npm run build`

## 5. 测试计划

### 5.1 单元测试

#### `adapter-story.test.ts`

- `adaptRecapScene`：四种 key 变体（`dlg_e1m3_4` / `dlg_sm2l4m5_9` / `dlg_a1m8d1_1` / `dlg_e1m1_4d2`）全部正确解析；异常 key → null；编号生成（sceneLabel 注入、场次补零、d 后缀）
- `adaptRecapFallbackScene`：未识别 key 归入 other 分组，不丢弃
- `adaptRecapChapter`：多场景聚合；数值排序（chapter≥10 如 e11 排在 e2 后、scene≥10 排在第 4 场后、l/d 段参与排序）
- `adaptPrtsCategory` / `adaptPrtsVolume` / `adaptPrtsItem`：正常映射；卷图标 URL 为完整 sprite URL
- `adaptPrtsItemDetail`：RichContentTable 展开、空 contentList；RadioTable 剧本解析
- `adaptBakerChat`：chatType 1/2/3 → contact/group/operator
- `adaptBakerMessage`：speaker 名称/头像经 chatMap 解析；endmin → isSelf + selfName；contentParam 数组取首项；未知 contentType → null

#### `baker.test.ts`

- `resolveDialog`：线性遍历、会话结束（nextContentId=-1 / 0）、环保护、悬空引用
- 分支点：不产生空气泡；beat 带 options + selectedOptionId；默认第一项
- 分支切换：切换后「我」的消息更新为选中项（带 optionResPath 时为 sticker），后续消息按新分支重算；旧选择被截断丢弃
- contentType 9：归并到 preContentId 消息的 reactions（emojiUrl + fromNames + count）；归属失败静默丢弃
- 未知 contentType（4/5/6/8/11）：跳过不渲染

### 5.2 E2E（`story-chronicle.spec.ts`）

- 总览页：加载、计数、跳转
- 剧情梗概：导航、锚点、筛选、卡片
- PRTS 文库：页签、卷卡片、展开、详情
- Baker：Tab、会话、分支、图片、表情

## 6. 验收标准

- [ ] PRD 功能点 1-6 全部实现
- [ ] UT 覆盖率 adapter + baker.ts ≥ 90%
- [ ] E2E 覆盖 PRD 功能点
- [ ] 36 个新增 i18n key × 14 语言全量（另修改 nav.story / nav.storyDesc）
- [ ] `npm run lint` / `npm run test` / `npm run build` 通过

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 篇章类型前缀命名不确定 | 实现阶段需校准 | 走 i18n key，可随时调整 |
| Baker 分支图复杂度 | 遍历逻辑调试困难 | 单元测试覆盖全场景 |
| RichContentTable 体积大 | 详情页加载慢 | 版本缓存 + 骨架屏 |
| 14 语言翻译量大 | i18n 工作量 | 使用脚本批量生成 |
| dlg key 格式未来变动 | 排序/编号错乱 | 解析失败兜底「其他」分组 |

回滚策略：纯新增页面与数据流，可直接回滚到 `feat/story-chronicle` 起点 commit。

## 8. 相关文档

- [[20260730-story-chronicle|剧情纪事产品方案]]
- [[20260730-story-chronicle|剧情纪事技术方案 v1.3]]
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
- [[../test/20260731-story-chronicle-acceptance-report|剧情纪事验收报告]]

## 9. 验收修订（2026-08-02，与验收报告对齐）

> 本节记录 v1.1 清单与最终落地实现之间的差异，详细根因/验证见验收报告。

### 9.1 新增文件（v1.1 之后）

| 文件 | 说明 |
|------|------|
| `src/lib/api.ts` `fetchMissionList` / `fetchMissionDetail` | MRA 任务列表/详情（vfs JsonData 端点） |
| `src/lib/missionCondition.ts` | quest condition `$type` 分派框架 + 12 个高频类型格式化器 |
| `src/lib/missionConditionNames.ts` | 名称深链解析（stage/map/item/mission/quest）+ `buildEnemySummary`/`buildDungeonDetail`/`buildStageDetail` |
| `src/lib/missionConditionText.ts` | condition 渲染为 i18n 模板文本（`CombineCondition` 递归） |
| `src/lib/audio.ts` / `src/lib/dialogAudio.ts` | 音频 HEAD 校验缓存 + 播放队列控制器（单例） |
| `src/pages/story/StoryMissionDetail.tsx` | 任务详情页（`/archive/story/mission/:missionId`，`MissionDetailContent` 可复用内嵌） |
| `src/pages/story/ObjectiveCondition.tsx` | 目标 condition 渲染（对话梗概内联、活动面板、dungeon） |
| `src/pages/story/DialogScript.tsx` / `DialogPlayerBar.tsx` | 场景对话展开 + 音频控制面板（sticky 单例） |
| `src/pages/story/ActivityStagePanel.tsx` / `DungeonPanel.tsx` / `EnemyUnit.tsx` | 活动阶段 / dungeon / 敌人独立组件 |
| 单测 | `missionCondition.test.ts` / `missionConditionNames.test.ts` / `missionConditionText.test.ts` / `audio.test.ts` / `dialogAudio.test.ts` |

### 9.2 变更文件（v1.1 之后）

- **`StoryRecap.tsx`**：改为 master-detail——左侧 a-z 分组任务导航（`buildRecapChaptersFromMissions` 驱动），右侧内嵌 `MissionDetailContent`；`?mission=` 同步选中项；章节类型标签用前缀字母，`CHAPTER_TYPES` 10 组。
- **`BakerTerminal.tsx`**：根容器改 `fixed inset-0 md:left-60 z-10 bg-archive-ink overflow-hidden grid`（全视口固定壳）；`activeTopicId` 由 `searchParams.get('topic')` 派生，点击 topic 写 URL，切换聊天清除；`beats` 过滤仅当前 topic 对话。
- **`BakerContactList.tsx`**：新增 `topics` / `activeTopicId` / `onSelectTopic` props，选中联系人下展开 topic 列表（`data-topic-id`），`activeTopicId` 变化 `scrollIntoView` 定位。
- **`BakerChatPanel.tsx`**：移除 `chat` / `topics` props（无顶部 topic 条），消息容器 `p-4 space-y-2`。
- **`BakerMessageBubble.tsx`**：删除 `showAvatar` 开关，恒定渲染双侧头像（无图圆形占位）；`flex-row-reverse` + `items-end` 使「我」气泡贴右缘。
- **`richText.tsx` `getUISprite`**：按前缀区分 `sns_emoji_*` → `sns/emoji/`、`sns_sticker_*` → `sns/sticker/`（修复正文富文本 emoji 404）。

### 9.3 新增路由

```
/archive/story/mission/:missionId     StoryMissionDetail（任务详情页）
/archive/story/recap?mission={missionId}   recap master-detail 选中任务
/archive/baker?chat={chatId}&topic={topicId}  Baker 会话 + topic 直达
```

### 9.4 i18n 增删

- **移除**：`story.chapterType.{e,sm,c,f,gm,a,db,m,other}`（9 个 key × 14 语言）。
- **新增**：`story.noScene`、`story.prevQuest`、`stageMission`/`stageUnlock`/`stageRelatedQuest`/`stageRewards`、`enemyLv`、`dungeonSort`/`dungeonStamina`/`dungeonEnemies`/`dungeonFirstPass`/`dungeonCustom`/`dungeonExtra`/`dungeonHunter`、`story.expandDialog`/`story.collapseDialog`/`story.audioNowPlaying`、`story.missionDesc`/`missionObjectives`/`missionType`/`relatedOperator`/`relatedLevel`/`backToRecap`/`mainPath`/`branch`/`noDescription`、`story.obj*` 14 个 condition 模板 key、`api.fetchingMissionList`/`fetchingMissionDetail`/`fetchingMissionBrief`（14 语言全量，经 `generate-i18n-dicts.ts` 生成，verify-i18n PASSED）。

### 9.5 验证状态

- ✅ 单测：story adapter / baker / missionCondition 三件套 / audio / dialogAudio 全量通过（仅存量 Sidebar 2 例基线失败）。
- ✅ E2E `story-chronicle.spec.ts`：36/36（含 Baker 二轮 11/11：无窗口级滚动条、切换 topic 首条消息变化、topic URL 参数、URL 定位 topic）。
- ✅ lint（verify-i18n PASSED）/ build / tsc 通过。
