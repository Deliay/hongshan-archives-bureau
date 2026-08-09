---
description: 剧情梗概详情新增台本与对讲机原文字段的技术提案
type: Fleeting
---

# 剧情梗概：台本与对讲机 - 技术提案

**功能名称**: 剧情梗概单个任务详情新增「台本（Transcript）」与「对讲机（Radio）」
**关联 PRD**: [[20260809-story-recap-transcript-radio|剧情梗概：台本与对讲机]]
**技术提案版本**: v1.0
**创建日期**: 2026-08-09
**作者**: 前端工程
**feat-branch**: `feat/story-recap-script-radio`

## 1. 概述

### 1.1 背景

剧情梗概（`/archive/story/recap`）单个任务详情（`MissionDetailContent`，内嵌于 recap 与独立路由 `/archive/story/mission/:missionId`）目前仅对每场戏提供可展开的对话剧本来（`DialogScript`，逐场点击展开，数据源 `DialogTextTable`），而对讲机台词（`RadioTable`）完全未展示。

游戏数据中 `DialogTextTable`（2 万+ 台词行）与 `RadioTable`（近 3 千条）均以任务相关 key 前缀组织，可稳定按单个任务聚合出完整「台本」与「对讲机」板块。本提案将新增两种聚合读取，并在任务详情中以两块展示。

### 1.2 目标

- 新增按任务聚合的对话（台本）与对讲机（电台）数据 hook 与适配逻辑。
- 在 `MissionDetailContent` 中新增「台本（Transcript）」与「对讲机（Radio）」两块。
- 补充 14 语言 i18n 文案（noTranscript / noRadio / transcript / radio 等）。
- 补充 `data-mapping-tables.md` 中对 `RadioTable` 的完整字段说明与任务级聚合规则。

### 1.3 范围

**做**:
- 台本数据流：聚合 `DialogTextTable` 该任务全部台词行（复用现 `DialogLine` 模型）。
- 对讲机数据流：聚合 `RadioTable` 该任务全部对讲（新建 `RadioLine` 模型与适配器）。
- `useStoryTranscript` / `useStoryRadio` hooks（或合并为单个详情 hook）。
- `MissionDetailContent` 两新区块渲染。
- i18n：`story.transcript.*` / `story.radio.*` key。
- `data-mapping-tables.md` 更新。

**不做**:
- 台词级音频播放（`DialogScript` 已有音频能力，本次板块不做逐行播放；可后续复用）。
- 全文搜索。
- 对讲机内嵌图文（`RadioTable` 本条含 `radioSingleDataList[]`，仅取说话人 + 台词）。

## 2. 数据探查结论

### 2.1 `DialogTextTable`（台本）

- 全表约 20872 个 key。
- key 结构：`dlg_{章前缀}{任务}_{场次}_{行号}`，如 `dlg_a1m6d3_3_001`。
- 每个 entry：`actorName`（i18n id）、`actorNameId`（角色 id）、`audioOverride`（语音 id）、`dialogText`（i18n id）、`emotionType`。
- 与任务关联：任务 key（如 `a1m6d3`）可从 key 中提提取；一场戏共用同一场次前缀（去掉末尾 `_行号`）。
- 现有 `adaptDialogLine` / `buildDialogLines` 已能按场次前缀聚合某一场的台词（用于 `DialogScript`）。本需求需再向上一层：聚合该任务**全部场次**。

### 2.2 `RadioTable`（对讲机）

- 全表约 2948 条。
- 主 key 结构：`radio_{任务key}_{场次序号}`，如 `radio_gm02m13_3`。
- 每条 entry 含 `radioSingleDataList[]`（每项依次：`actorName` i18n id、`actorNameId`、`radioText` i18n id、`audioOverride`）、`priority`、`continueAfterDialog` 等。
- 与任务关联：任务 key 提取同台本（`radio_` 前缀之后的同一段）。一条对讲可含多句 `radioSingleDataList[]`。
- i18n：`actorName` / `radioText` 均走 i18n dict，需按 `RadioTable` 表取 dict。

### 2.3 任务 key 提取（`extractMissionKey`）

任务详情已有权威的任务 id（`MissionRuntime` 的 `missionId`）。聚合规则：

- 台本：遍历 `DialogTextTable` 全表，筛选 key 形如 `dlg_{M}_{...}`，其中 `M` 为任务 key。
- 对讲：遍历 `RadioTable` 全表，筛选 key 形如 `radio_{M}_{...}`。

**`extractMissionKey` 规约**：

现有 `DLG_KEY_RE`（`src/lib/adapter.ts:290`）解析 `dlg_` 前缀 key 的结构为：
```
dlg_{chapterType}{chapterNum}[l{levelNum}]m{missionNum}[d{missionSub}]_{sceneNo}[d{sceneSub}]
```

`MissionRuntime.missionId` 与 key 中任务段的对应关系：

| missionId 示例 | key 中任务段 | 提取逻辑 |
|---------------|-------------|---------|
| `gm02m13` | `gm02m13` | 直接透传（无 l/d 变体） |
| `gm02l4` | `gm02l4` | 直接透传（l 段任务） |
| `a1m6d3` | `a1m6d3` | 直接透传（d 段任务） |
| `a1m6d3l2` | `a1m6d3l2` | 直接透传（l+d 段任务） |

**结论**：`missionId` 与 `DialogTextTable` / `RadioTable` key 中的任务段（`dlg_` 或 `radio_` 后、`_` 前的部分）**直接对应**，无需归一化。`extractMissionKey(missionId)` 直接返回 `missionId`。

实现阶段仍需抽样校准：验证 `gm02m13`、`gm02l4`、`a1m6d3` 等任务的 key 前缀匹配完整性。

## 3. 技术架构

### 3.1 模块划分

```mermaid
flowchart LR
    subgraph hooks[hooks/useData.ts]
        H[useStoryScriptBundle]
    end
    subgraph lib[lib]
        T[types: RouterRadioLine / 复用 DialogLine]
        A[adapter: adaptRadioLine / buildRadioLines / 适配聚合]
        C[getCachedData + i18n dict]
    end
    subgraph pages[pages/story]
        P[MissionDetailContent]
        S[StoryTranscript / StoryRadio 组件]
    end
    P --> H
    H --> A
    A --> C
    P --> S
end
```

### 3.2 数据获取

复用现有接口与缓存：

| 用途 | 接口 | 加载策略 |
|------|------|---------|
| 台本全表 | `GET /table/DialogTextTable/all` + i18n dict | 一次性（已现有），任务内过滤 |
| 对讲全表 | `GET /table/RadioTable/all` + i18n dict | 一次性（2948 条），任务内过滤 |

与 `useDialogScript` 复用同一缓存 key（`DialogTextTable` / `RadioTable`），避免重复请求。

### 3.3 适配要点

- **复用行**：台本复用行动现有 `DialogLine`（`adaptDialogLine`），新增基于任务 key 的任务级聚合函数。
- **新建对讲模型**：`RadioLine { key, sceneKey, order, actorName, actorId, text, audioOverride }`；`adaptRadioLine` 从 `radioSingleDataList` 展开，`buildRadioLinesForMission` 聚合任务下全部对讲。

## 4. 类型与接口

### 4.1 类型（`src/lib/types.ts` 新增）

```ts
export interface RadioLine {
  key: string                // 子行 key `radio_gm02m13_3`
  order: number              // radioSingleDataList 内序号
  actorNameId: string        // 说话人 id（actorNameId）
  speaker: string            // 说话人名称（i18n）
  text: string               // 台词（i18n）
  audioOverride: string      // 语音 id（可选，用于后续播放）
}
```

### 4.2 接口（`src/hooks/useData.ts` 新增）

```ts
export function useStoryTranscript(missionId: string): UseDataResult<DialogLine[]>
export function useStoryRadio(missionId: string): UseDataResult<RadioLine[]>
```

（或合并为一个 `useStoryScriptBundle(missionId)` 返回 `{ transcript, radio }`，见 技术决策。）

### 4.3 适配器（`src/lib/adapter.ts` 新增）

```ts
export function adaptRadioLine(entryKey, index, raw, i18nMap): RadioLine | null
export function buildRadioLinesForMission(missionKey, radioRaw, i18nMap): RadioLine[]
export function buildDialogLinesForMission(missionKey, dlgRaw, i18nMap): DialogLine[]
```

任务 key 规约（missionKey 从 missionId 提取）由调用层统一处理，保证台本/对讲一致性。

## 5. 页面实现要点

### 5.1 `MissionDetailContent`（`StoryMissionDetail.tsx`）

在任务描述（`missionDescription`）之后、任务目标（`missionObjectives`）之前渲染：

- `<TranscriptPanel missionId={missionId} />`：标题 `t('story.transcript')`，内部按场次分组展示 `DialogLine` 台词流。
- `<RadioPanel missionId={missionId} />`：标题 `t('story.radio')`，逐条展示说话人 + 台词。

**与现有 `DialogScript` 的关系**：

现有 `SceneBlock` 已按场次展开 `DialogScript`（逐场点击展开查看台词）。新增的 `TranscriptPanel` 是**任务级聚合**，将全部场次台词连续展示，两者**并存但定位不同**：

| 板块 | 粒度 | 交互 | 用途 |
|------|------|------|------|
| `SceneBlock` + `DialogScript` | 场次级 | 逐场点击展开 | 快速浏览单场对话 |
| `TranscriptPanel` | 任务级 | 折叠/展开全文 | 完整通读、引用、搜索 |
| `RadioPanel` | 任务级 | 折叠/展开全文 | 对讲机剧情完整展示 |

三板块均在任务详情中并存，`SceneBlock` 保持现有交互不变，`TranscriptPanel` 和 `RadioPanel` 默认折叠。

**组件拆分决策**：新增两个独立组件文件 `StoryTranscript.tsx` 和 `StoryRadio.tsx`，保持单一职责。`StoryMissionDetail.tsx` 已有 202 行且包含 `SceneBlock`、`QuestNode` 等子组件，不宜再内联新逻辑。

### 5.2 三态与空态

- loading：骨架/「加载中」。
- error：`t('common.loadFailed')`。
- 无数据：台本 `t('story.noTranscript')`；对讲 `t('story.noRadio')`。空态文案显示在整个板块折叠头下方，替换板块内容区域。

### 5.3 排序规则

- **台本**：按 key 字典序排序（`dlg_{missionKey}_{sceneNo}_{lineNo}`），场景内按行号排序。
- **对讲机**：按 key 字典序排序（`radio_{missionKey}_{sceneNo}`），同一 entry 内按 `radioSingleDataList` 索引排序。排序表达式：`a.key.localeCompare(b.key) || a.order - b.order`，其中 `order` 为 entry 内数组索引。

### 5.4 i18n 计划

`scripts/i18n-custom.json` 新增（14 语言）：
- `story.transcript`（台本 / Transcript）— 折叠头标题
- `story.radio`（对讲机 / Radio）— 折叠头标题
- `story.noTranscript`（暂无台本 / No transcript）— 空态提示
- `story.noRadio`（暂无对讲机 / No radio）— 空态提示

生成：`node scripts/generate-i18n-dicts.ts`，校验。

## 6. 技术决策

| 决策 | 选项 A | 选项 B | 最终选择 | 原因 |
|------|--------|--------|---------|------|
| hook 粒度 | 台本与对讲分离 | 合并 bundle hook | 合并 bundle | 两者均在详情页一次性求，避免重复拉表与重复任务 key 提取 |
| 展示方式 | 直接展开 | toggle/details 折叠 | 折叠（默认收起） | 任务详情已较长，两板块默认折叠不喧宾 |
| 对讲模型 | 复用 DialogLine | 新建 RadioLine | 新建 RadioLine | 数据结构不同（radioSingleDataList 嵌套、场景 key 不同），独立更清晰 |
| 组件拆分 | 内联进 StoryMissionDetail | 独立组件文件 | 独立组件 | StoryMissionDetail 已有 202 行，新增两板块应独立建文件保持单一职责 |
| 任务 key 提取 | 需归一化逻辑 | 直接透传 missionId | 直接透传 | `missionId` 与表 key 中任务段直接对应，无需转换 |

## 7. 项目结构

```
src/
  hooks/useData.ts                    # 新增 useStoryScriptBundle
  lib/types.ts                        # 新增 RadioLine
  lib/adapter.ts                      # 新增 adaptRadioLine / buildRadioLinesForMission / buildDialogLinesForMission / extractMissionKey
  pages/story/StoryMissionDetail.tsx  # 渲染 TranscriptPanel / RadioPanel
  pages/story/StoryTranscript.tsx     # 台本板块组件（新增）
  pages/story/StoryRadio.tsx          # 对讲机板块组件（新增）
scripts/i18n-custom.json               # story.transcript.* / story.radio.*
docs/engineering/references/data-mapping-tables.md  # 补充 RadioTable 字段说明与任务级聚合规则
```

## 8. 实现计划

1. **数据层**：types + adapter + hook（任务 key 规约、聚合、排序）。
2. **组件/页面**：两板块渲染 + 任务详情接入。
3. **i18n**：`i18n-custom.json` 4 个新增 key × 14 语言 → 重新生成字典。
4. **文档**：`data-mapping-tables.md` 更新。
5. **测试**：adapter 单测 + E2E。

## 9. 测试策略

### 9.1 单元测试（vitest，`adapter-story.test.ts` 扩展）

- `adaptRadioLine`：合法行映射；缺 actorName → 回退 id。
- `buildRadioLinesForMission`：任务聚合去重、按场次/序号排序；未知任务 key → 空数组。
- `buildDialogLinesForMission`：任务级聚合正确包含多场次。
- key 规约：`l` / `d` 任务段变体对应正确。

### 9.2 E2E（`story-chronicle.spec.ts` 扩展）

- 任务详情：台本板块展示该任务台词；对讲板块展示对讲。
- 空态：无台词/无对讲任务展示对应空态文案。
- 语言切换后两板块文案正确。

## 10. 风险与回滚

| 风险 | 影响 | 缓解 |
|------|------|------|
| 任务 key 与表 key 段段对应（`l`/`d` 变体）不符 | 聚合遗漏/错配 | 抽样校准；实现阶段用真实任务验证 |
| 全表 `DialogTextTable`（2万+行）全量加载 | 详情页首次加载变慢 | 版本缓存 + 骨架屏 + 任务内过滤仅读取 |
| 详情页过长 | 阅读疲劳 | 两板块默认折叠，toggle 展开 |
| RadioTable 行 id `radioSingleDataList` 嵌套 | 展开逻辑 | 单测覆盖 |

回滚策略：纯新增页面板块与数据层，不破坏既有 `Dialog` 展开与任务详情，可直接回滚。

## 11. 验收标准

- [x] 技术方案评审通过
- [ ] 台本/对讲板块按 PRD 验收标准实现
- [ ] 14 语言 i18n 无占位、无缺失
- [ ] `data-mapping-tables.md` 更新完成
- [ ] `npm run lint` / `npm run test` / `npm run build` 通过
- [ ] E2E 通过

## 12. data-mapping-tables.md 更新内容

在 `docs/engineering/references/data-mapping-tables.md` 的「剧情纪事相关」章节补充：

### RadioTable 完整字段说明

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| `RadioTable` | `radio_{任务key}_{场次序号}` | `radioSingleDataList[].actorName/radioText/audioOverride`, `priority`, `continueAfterDialog` | 对讲机台词（2948 条，按任务聚合） |

### 任务级聚合规则

- **台本聚合**：给定任务 key，取全部 `dlg_{任务key}_{场次}_...` 前缀匹配的行，按场次与行号排序。
- **对讲机聚合**：给定任务 key，取全部 `radio_{任务key}_...` 记录，按场次排序。
- **任务 key 提取**：`missionId` 与表 key 中任务段直接对应，无需归一化（`extractMissionKey(missionId) = missionId`）。

## 13. 相关文档

- [[20260809-story-recap-transcript-radio|剧情梗概：台本与对讲机 PRD]]
- [[20260730-story-chronicle|剧情纪事 PRD]]
- [数据表映射参考](../references/data-mapping-tables.md)
- [[../test/archived/20260731-story-6-chronicle-acceptance-report|剧情纪事验收报告（已归档）]]