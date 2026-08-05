---
description: 音乐播放模块验收问题（播放列表/播放队列概念缺失、剧情语音不同步）修复报告
type: Permanent
---

# 音乐播放验收报告（2026-08-04）

> **状态**: 本轮受理验收反馈 2 件，已修复 2 件，待验收确认。

## 关联文档

- 关联分支：`feat/music-play-queue`（基线：PR #52 `04efea9`，音乐播放功能首次交付）
- 验收日期：2026-08-04
- 历史参考：[archived/20260731-story-chronicle-acceptance-report.md](archived/20260731-story-chronicle-acceptance-report.md)（剧情语音播放）

## 需求概述

PR #52 交付了音乐播放（导航栏控制面板 + `/archive/music` 专辑页 + 全局队列 + 语音互斥）。本轮验收指出：

1. 缺少「播放列表」的概念呈现，也缺少「播放队列」的列表视图。
2. 剧情页播放语音时，左下音乐控制面板无同步；「播放队列」也应同步正在播放的语音。

## 验收问题清单

### 2.1 缺少播放列表概念与播放队列列表

- **问题描述**：`/archive/music` 仅按专辑分区展示曲目，没有「播放列表」的概念；全站没有任何地方能看到当前播放队列内容。
- **根因分析**：`musicPlayer.ts` 的 queue 仅存于内存 state，无对应 UI；专辑页未以「播放列表」概念组织信息架构。
- **修复方案**：
  1. 新增 `src/components/Music/QueueList.tsx`：队列条目（序号/图标/名称/来源）、当前条目金色高亮、点击 `playAt(index)` 跳播、头部「清空」按钮（`clearQueue()`）、空态文案。
  2. `src/pages/music/MusicPlaylistPage.tsx`：顶部新增「播放队列」分区（内嵌 QueueList），专辑区前加「播放列表」分区标题。
  3. `src/components/Music/MusicControlPanel.tsx`：新增队列按钮，点击在面板上方展开浮层（`absolute bottom-full`，面板根节点 `relative` 提供定位上下文）内嵌 QueueList。
  4. `src/lib/musicPlayer.ts`：新增 `playAt(index)`、`clearQueue()` API。
  5. i18n 新增 `musicPlayer.queue / playlists / clear / queueEmpty` × 14 语言。
- **验证结果**：✅ E2E 新增「播放列表页展示播放队列区与播放列表区」「播放曲目后页面队列区与面板浮层同步显示队列」通过；music-player.spec 8/8 通过。
- **涉及文件**：`src/components/Music/QueueList.tsx`（新增）、`src/components/Music/MusicControlPanel.tsx`、`src/pages/music/MusicPlaylistPage.tsx`、`src/lib/musicPlayer.ts`、`scripts/i18n-custom.json`、`src/i18n/dicts/*`、`tests/e2e/src/music-player.spec.ts`

### 2.2 剧情语音播放时左下面板与播放队列不同步

- **问题描述**：剧情页（复现：`/archive/story/library?doc=nar_col_radio_5`，点击 line-play）播放语音时，左下 MusicControlPanel 仍显示空态；队列中也看不到正在播放的语音。
- **根因分析**：音乐（`musicPlayer.ts`）与剧情语音（`dialogAudio.ts`）是两个独立 store，仅靠 `setOnBeforePlay` 回调互斥；面板只订阅音乐 store，语音播放状态对队列与面板不可见。
- **修复方案**：统一为单一全局播放队列。
  1. `src/lib/musicPlayer.ts`：`MusicQueueItem` 扩展 `kind: 'music' | 'voice'` 与 `voice` payload（voId/locale/lineKey/dialogText），`playTrack` 按 kind 解析 URL（voice → `getAudioUrl`，music → `getMusicUrl`）；新增 `playQueue(items, startIndex)`（替换队列并播放）；移除对 dialogAudio 的互斥依赖（单 store 单 audio 元素天然互斥）。
  2. `src/lib/dialogAudio.ts`：改为薄适配层——`playFrom` 映射 voice 条目调 `playQueue`，`useDialogAudio/getSnapshot` 从统一 state 派生，导出 API 不变，消费方（DialogPlayerBar / DialogScript / RadioPlayer）零改动。
  3. 语义对齐：语音播完后队列保留、`currentIndex = -1`（与音乐一致；DialogPlayerBar 取不到当前轨自动隐藏，无 UI 破坏）。
  4. `MusicControlPanel`：voice 条目显示麦克风占位图标 + 角色名 +「剧情语音 · lineKey」；控制按钮对语音同样生效（同一 store）。
  5. i18n 新增 `musicPlayer.voice` × 14 语言。
- **验证结果**：✅ E2E 新增「剧情语音播放时左下面板与播放队列同步」通过；story-chronicle 语音用例回归通过；dialogAudio/musicPlayer 单测 14/14 通过。
- **涉及文件**：`src/lib/musicPlayer.ts`、`src/lib/dialogAudio.ts`、`src/components/Music/MusicControlPanel.tsx`、`src/lib/__tests__/musicPlayer.test.ts`、`src/lib/__tests__/dialogAudio.test.ts`、`tests/e2e/src/music-player.spec.ts`

## 修复总览

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|---|---|---|---|
| 2.1 | 缺少播放列表概念与播放队列列表 | 队列无 UI，页面信息架构未体现播放列表 | ✅ 已修复 | 257c3df, 6b363d9 |
| 2.2 | 剧情语音播放时面板/队列不同步 | 音乐与语音双 store 独立，仅回调互斥 | ✅ 已修复 | 257c3df, 6b363d9 |

## 最终验证

| 项目 | 结果 |
|---|---|
| `npx tsc --noEmit` | ✅ 通过 |
| `npm run lint`（oxlint + i18n 校验） | ✅ 0 error（38 warning 为基线既有） |
| `npm run test`（vitest） | ✅ 482 通过 / 8 失败（均为基线既有：Sidebar.test 2、chain.integration 6，与本需求无关） |
| `npm run build` | ✅ 通过 |
| E2E music-player.spec.ts | ✅ 8/8 通过（含 3 个新用例） |
| E2E story-chronicle.spec.ts 回归 | ✅ 通过（语音相关用例） |

## 经验总结

- 多音频源场景应尽早统一为单一播放队列 store：互斥无需回调机制（单 audio 元素天然互斥），「正在播放」的全局同步（面板/队列/页面高亮）零特例。
- 队列类 UI 注意定位上下文：侧栏面板内向上展开浮层时，外层容器若无定位，需在组件根节点补 `relative`。
- i18n 同形占位校验（MX/BR/DE/FR 等不得与 EN/CN 同形）可通过选用本土化译法规避（如 playlists → Wiedergabelisten / Listes de lecture / Listas de reprodução），不必依赖白名单。
- E2E 清理本机残留 dev server 时避免 `pkill -f vite`（会匹配自身命令行自杀），改用 `kill $(lsof -t -i:5173)`。
