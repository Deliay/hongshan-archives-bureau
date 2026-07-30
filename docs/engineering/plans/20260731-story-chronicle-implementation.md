---
description: 剧情纪事模块实现方案：数据层、页面、组件与多语言的可执行清单
type: Fleeting
---

# 剧情纪事 - 实现方案

**对应产品文档**: [[20260730-story-chronicle|剧情纪事产品方案]]
**对应技术方案**: [[20260730-story-chronicle|剧情纪事技术方案 v1.2]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-31
**作者**: 前端工程
**开发分支**: `feat/story-chronicle`

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
| `src/lib/adapter.ts` | 新增 `adaptRecapScene` / `adaptRecapChapter` / `adaptPrtsCategory` / `adaptPrtsVolume` / `adaptPrtsItem` / `adaptPrtsItemDetail` / `adaptBakerChat` / `adaptBakerMessage` |
| `src/hooks/useData.ts` | 新增 `useStoryRecap` / `usePrtsLibrary` / `usePrtsItemDetail` / `useBakerChats` / `useBakerDialog` |
| `src/pages/story/StoryOverview.tsx` | 重构：双入口卡（剧情梗概 + PRTS 文库） |
| `src/App.tsx` | 新增 4 条路由 |
| `src/components/Layout/Sidebar.tsx` | story 文案更新 + baker 入口 |
| `src/components/Layout/Breadcrumb.tsx` | 补充 recap / library / baker 映射 |
| `src/routes/ArchiveHome.tsx` | baker 入口卡片 |
| `src/data/archiveMeta.ts` | MODULE_CODES 新增 baker: HSA-BKR |
| `scripts/i18n-custom.json` | 新增 story.* / baker.* namespace（14 语言） |

### 2.3 删除文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/story/StoryOverview.tsx`（旧占位） | 被重构后的新版替代（原地重写，非删除） |

## 3. 详细实现

### 3.1 类型定义 `src/lib/types.ts`

```ts
// ===== 剧情梗概 =====
export interface StoryRecapScene {
  id: string                // summary id (e.g. "summary_e1m1_1_001")
  dlgId: string             // dlg_e1m3_4
  chapterId: string         // e1
  missionId: string         // e1m3
  sceneNo: number           // 4
  chapterType: string       // e | sm | c | f | gm | a | db | m
  code: string              // E1·M3·场04
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
}

export interface BakerTopic {
  topicId: string
  topicName: string         // i18n（有标题显示标题，无标题显示预览）
  sortId: number
  dialogs: { dialogId: string; preview: string }[]
}
```

### 3.2 适配器 `src/lib/adapter.ts`

#### 3.2.1 `adaptRecapScene`（剧情梗概）

```ts
const DLG_KEY_RE = /^dlg_([a-z]+)(\d+)m(\d+)(?:d\d+)?_(\d+)$/

export function adaptRecapScene(
  dlgKey: string,
  summaryId: string,
  summaryText: string,
  i18nMap?: Record<string, string>
): StoryRecapScene | null {
  const m = DLG_KEY_RE.exec(dlgKey)
  if (!m) return null
  const [, chapterType, chapterNum, missionNum, sceneNo] = m
  const chapterId = `${chapterType}${chapterNum}`
  const missionId = `${chapterId}m${missionNum}`
  const code = `${chapterId.toUpperCase()}·M${missionNum}·场${String(sceneNo).padStart(2, '0')}`
  return {
    id: summaryId,
    dlgId: dlgKey,
    chapterId,
    missionId,
    sceneNo: Number(sceneNo),
    chapterType,
    code,
    text: resolveI18n(summaryText, i18nMap),
  }
}
```

#### 3.2.2 `adaptRecapChapter`（篇章聚合）

```ts
export function adaptRecapChapter(scenes: StoryRecapScene[]): StoryRecapChapter[] {
  const chapterMap = new Map<string, StoryRecapScene[]>()
  for (const s of scenes) {
    if (!chapterMap.has(s.chapterId)) chapterMap.set(s.chapterId, [])
    chapterMap.get(s.chapterId)!.push(s)
  }
  return Array.from(chapterMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chapterId, chapterScenes]) => {
      const missionMap = new Map<string, StoryRecapScene[]>()
      for (const s of chapterScenes) {
        if (!missionMap.has(s.missionId)) missionMap.set(s.missionId, [])
        missionMap.get(s.missionId)!.push(s)
      }
      const missions = Array.from(missionMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([missionId, scenes]) => ({
          missionId,
          scenes: scenes.sort((a, b) => a.sceneNo - b.sceneNo),
        }))
      return {
        chapterId,
        chapterType: chapterScenes[0].chapterType,
        missions,
      }
    })
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
    iconUrl: resolveIconUrl(raw.icon, 'prts'),
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
    iconUrl: resolveIconUrl(raw.icon, 'charroundicon'),
    isSettlementChannel: raw.isSettlementChannel ?? false,
  }
}

export function adaptBakerMessage(
  contentId: string,
  raw: any,
  chatId: string,
  i18nMap?: Record<string, string>
): BakerMessage | null {
  const isSelf = raw.speaker === 'endmin'
  return {
    id: `${raw.dialogId ?? ''}:${contentId}`,
    speakerId: raw.speaker ?? '',
    isSelf,
    speakerName: isSelf ? '我' : chatId,
    speakerIconUrl: isSelf ? 'charroundicon/chr_0003_endminf.png' : '',
    kind: resolveContentType(raw.contentType),
    text: resolveI18n(raw.content, i18nMap),
    imageUrl: raw.contentType === 2 ? resolveIconUrl(raw.contentParam, 'sns/picture') : undefined,
    reactions: undefined, // contentType 9 归并处理
  }
}
```

### 3.3 Baker 分支求值 `src/lib/baker.ts`

```ts
interface RawNode {
  content: any
  contentType: number
  speaker: string
  nextContentId: number
  preContentId: number
  dialogOptionIds: string[]
  isEnd: boolean
}

interface RawOption {
  optionDesc: any
  optionNextContentId: number
  optionResPath: string
  optionNPCIds: string[]
}

export function resolveDialog(
  nodes: Record<string, RawNode>,
  options: Record<string, RawOption>,
  choices: Record<number, string> = {}
): BakerBeat[] {
  const beats: BakerBeat[] = []
  const visited = new Set<string>()
  let currentId = '1' // SNSConst.snsDialogStartId

  while (currentId && currentId !== '-1' && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodes[currentId]
    if (!node) break

    // 消息节点
    const message = nodeToMessage(node, currentId)
    const beat: BakerBeat = { messages: [message] }

    // 分支点
    if (node.dialogOptionIds.length > 0) {
      const selectedOptionId = choices[Number(currentId)] ?? node.dialogOptionIds[0]
      const selectedOption = options[selectedOptionId]
      if (selectedOption) {
        beat.options = node.dialogOptionIds.map((oid) => {
          const opt = options[oid]
          return {
            id: oid,
            text: resolveI18n(opt?.optionDesc),
            emojiUrl: opt?.optionResPath || undefined,
          }
        })
        beats.push(beat)
        currentId = String(selectedOption.optionNextContentId)
        continue
      }
    }

    beats.push(beat)
    currentId = String(node.nextContentId)
  }

  return beats
}

function nodeToMessage(node: RawNode, contentId: string): BakerMessage {
  return {
    id: contentId,
    speakerId: node.speaker ?? '',
    isSelf: node.speaker === 'endmin',
    speakerName: node.speaker === 'endmin' ? '我' : '',
    speakerIconUrl: '',
    kind: resolveContentType(node.contentType),
    text: resolveI18n(node.content),
  }
}

function resolveContentType(type: number): BakerMessage['kind'] {
  const map: Record<number, BakerMessage['kind']> = {
    1: 'text',
    2: 'image',
    7: 'system',
    9: 'text', // 表情回应归并
    10: 'share',
    12: 'mission',
  }
  return map[type] ?? 'text'
}
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
  return useData(async () => {
    const [mapRaw, summaryRaw, summaryI18n] = await Promise.all([
      getCachedData<Record<string, string>>('DialogSummaryMapTable', () => fetchTableAll('DialogSummaryMapTable')),
      getCachedData<Record<string, any>>('DialogSummaryTable', () => fetchTableAll('DialogSummaryTable')),
      getTableI18nDict('DialogSummaryTable', locale),
    ])
    const scenes = Object.entries(mapRaw)
      .map(([dlgKey, summaryId]) => {
        const summary = summaryRaw[summaryId]
        if (!summary) return null
        return adaptRecapScene(dlgKey, summaryId, summary.text, summaryI18n)
      })
      .filter((s): s is StoryRecapScene => s !== null)
      .sort((a, b) => `${a.chapterId}${a.missionId}${a.sceneNo}`.localeCompare(`${b.chapterId}${b.missionId}${b.sceneNo}`))
    const chapters = adaptRecapChapter(scenes)
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

#### 3.4.3 `useBakerChats` / `useBakerDialog`

```ts
export function useBakerChats(): UseDataResult<{ chats: BakerChat[]; topics: BakerTopic[] }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [chatRaw, topicRaw, dialogRaw, chatI18n, topicI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SNSChatTable', () => fetchTableAll('SNSChatTable')),
      getCachedData<Record<string, any>>('SNSDialogTopicTable', () => fetchTableAll('SNSDialogTopicTable')),
      getCachedData<Record<string, any>>('SNSDialogTable', () => fetchTableAll('SNSDialogTable')),
      getTableI18nDict('SNSChatTable', locale),
      getTableI18nDict('SNSDialogTopicTable', locale),
    ])
    const chats = Object.entries(chatRaw).map(([k, v]) => adaptBakerChat({ ...(v as any), $key: k }, chatI18n))
    const topics = Object.entries(topicRaw).map(([k, v]: [string, any]) => ({
      topicId: k,
      topicName: resolveI18n(v.topicName, topicI18n),
      sortId: v.sortId ?? 0,
      dialogs: (v.includeDialogIds ?? []).map((did: string) => {
        const d = dialogRaw[did]
        return { dialogId: did, preview: resolveI18n(d?.dialogContentData?.['1']?.content, topicI18n) ?? '' }
      }),
    }))
    return { chats, topics: topics.sort((a, b) => a.sortId - b.sortId) }
  }, [locale])
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
//   - Tab 未激活：text-archive-dust hover:text-archive-text
// 列表：flex-1 overflow-y-auto
//   - 条目：flex items-center gap-3 p-3 hover:bg-archive-hover cursor-pointer
//   - 头像：w-10 h-10 rounded-full border border-archive-border
//   - 名称：text-sm truncate
//   - 选中态：bg-archive-active border-l-2 border-archive-gold
```

#### 3.5.2 `BakerChatPanel.tsx`

```tsx
interface BakerChatPanelProps {
  chat: BakerChat
  topics: BakerTopic[]
  beats: BakerBeat[]
  onSwitchOption: (contentId: number, optionId: string) => void
}

// 布局：h-full flex flex-col
// Topic 栏（顶部）：flex overflow-x-auto gap-2 p-2 border-b border-archive-border
//   - Topic 按钮：px-3 py-1 rounded-full text-xs whitespace-nowrap
//   - 激活态：bg-archive-gold/20 text-archive-gold
//   - 未激活：bg-archive-surface text-archive-dust hover:bg-archive-hover
//   - 有标题显示标题，无标题显示最后消息预览（截断 20 字）
// 消息流：flex-1 overflow-y-auto p-4 space-y-4
//   - 会话分隔条：flex items-center gap-2 my-4
//     - 线条：flex-1 border-t border-archive-border
//     - 标签：text-xs text-archive-dust px-2
//   - 消息气泡：
//     - 他人：flex gap-2 (头像 32x32 + 内容)
//       - 头像：w-8 h-8 rounded-full
//       - 昵称：text-xs text-archive-dust
//       - 气泡：bg-archive-surface rounded-lg px-3 py-2 max-w-[70%]
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
├── 顶部筛选栏：sticky top-0 z-10 bg-archive-bg border-b border-archive-border
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
│       ├── 未激活：bg-archive-surface text-archive-dust hover:bg-archive-hover
│       └── 标签：分类名 + 计数 badge
├── 卷网格：grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4
│   └── 卷卡片：border border-archive-border rounded-lg p-4 hover:border-archive-gold/40 cursor-pointer
│       ├── 图标：w-12 h-12 mx-auto mb-2（onError 用占位图）
│       ├── 卷名：text-sm font-medium text-center truncate
│       ├── 副题：text-xs text-archive-dust text-center truncate
│       └── 条目数：text-xs text-archive-gold text-center
├── 卷内条目（点击展开 accordion）：border-t border-archive-border mt-4 pt-4
│   └── 条目列表：space-y-2
│       └── 条目行：flex items-center gap-2 p-2 hover:bg-archive-hover rounded cursor-pointer
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
│   ├── 分类 Badge：text-xs px-2 py-0.5 rounded bg-archive-surface
│   ├── 卷名：text-xs text-archive-dust
│   ├── 标题：text-2xl font-display mt-2
│   ├── 档案编号：font-mono text-xs text-archive-gold
│   └── 描述（如有）：text-sm text-archive-dust mt-2
├── 正文区（text / document 类）
│   └── contents 每篇
│       ├── 段标题（如有）：text-lg font-medium mt-6 mb-2
│       └── 段内容：<RichText content={segment} /> + <img loading="lazy" />
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
- 新增 `nav.baker` 条目（图标：💬，路径：`/archive/baker`）

**Breadcrumb.tsx**：
- 新增映射：`recap: t('story.recap')`, `library: t('story.library')`, `baker: t('nav.baker')`

**ArchiveHome.tsx**：
- 「大事记」分组新增 Baker 入口卡片

**archiveMeta.ts**：
```ts
baker: { code: 'HSA-BKR', nameKey: 'nav.baker', descKey: 'nav.bakerDesc' }
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
| `baker.selfName` | 我 | Me | |
| `baker.reactedBy` | {{name}} 回应 | Reacted by {{name}} | |
| `baker.sharedArchive` | PRTS 文献分享 | Shared archive | |
| `baker.missionLink` | 任务链接 | Mission link | |
| `breadcrumb.baker` | Baker | Baker | |

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

- `i18n-custom.json` 34 个 key × 14 语言 → `generate-i18n-dicts.ts`

### 阶段五：测试与验证（第 5 轮提交）

- E2E `story-chronicle.spec.ts`；`npm run lint && npm run test && npm run build`

## 5. 测试计划

### 5.1 单元测试

#### `adapter-story.test.ts`

- `adaptRecapScene`：正常 key、异常 key → null、编号生成
- `adaptRecapChapter`：多场景聚合、排序
- `adaptPrtsCategory` / `adaptPrtsVolume` / `adaptPrtsItem`：正常映射
- `adaptPrtsItemDetail`：RichContentTable 展开、空 contentList

#### `baker.test.ts`

- `resolveDialog`：线性遍历、分支切换、环保护、表情回应归并、未知 contentType、悬空引用

### 5.2 E2E（`story-chronicle.spec.ts`）

- 总览页：加载、计数、跳转
- 剧情梗概：导航、锚点、筛选、卡片
- PRTS 文库：页签、卷卡片、展开、详情
- Baker：Tab、会话、分支、图片、表情

## 6. 验收标准

- [ ] PRD 功能点 1-6 全部实现
- [ ] UT 覆盖率 adapter + baker.ts ≥ 90%
- [ ] E2E 覆盖 PRD 功能点
- [ ] 34 个 i18n key × 14 语言全量
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
- [[20260730-story-chronicle|剧情纪事技术方案 v1.2]]
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
