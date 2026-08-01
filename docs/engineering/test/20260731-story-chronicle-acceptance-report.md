---
description: 剧情纪事模块验收问题记录与修复方案（本轮：剧情梗概任务名渲染 + 任务穿透规划）
type: Permanent
---

# 剧情纪事模块验收报告

> **状态**: 修复完成，待提交与二次验收。
> 本轮受理 4 项验收反馈：①剧情梗概任务 id 需渲染 `TextTable` 中的任务名（已修复）；②任务名排版换行（已修复）；③missionId 穿透进入（已实现为任务详情页）；④章节类型臆测标签去除（已修复，改为原始前缀字母）。
>
> **重大数据源更新（2026-07-31）**：验收发现任务权威数据源为 `MissionRuntimeAsset`（任务列表 + 任务详情 json）。已据此完成数据调查，并将「任务目录接入 + 穿透详情 + 分区重构」方案写入 §7，其中 §7.2.3 穿透详情已实施，分区重构待产品确认。
>
> **objectiveList condition 渲染方案（§8）**：已完成 quest `objectiveList` 的 condition 数据结构与引用表全量调查（40+ 种 `$type`、活动阶段链路等），渲染方案见 §8，待实施。
>
> **三阶段验收（阶段五，2026-08-01）**：收到 3 项反馈——①`_activityStageId` 关联的 Activity 数据表（MultiStage / Condition / CompleteCondition / Dungeon / Reward 等）需抽出独立组件渲染；②quest 需加边框区分；③依赖关系左侧画线 + 「←」替换为「前置任务」badge。经 review 追加：奖励/ dungeon 各自独立组件、`Activity.rewardId ≠ Dungeon.rewardId`、dungeon 敌人与图片需渲染。调查与方案见 §9，待 review 后实施。

**关联 PRD**: [[20260730-story-chronicle|剧情纪事]]
**关联技术方案**: [[20260730-story-chronicle|剧情纪事 - 技术提案]]
**关联实现方案**: [[20260731-story-chronicle-implementation|剧情纪事 - 实现方案]]
**关联分支**: `feat/story-chronicle`
**验收日期**: 2026-07-31

---

## 1. 需求与技术方案概述

### 1.1 产品需求（PRD 摘要）

剧情纪事模块包含四个子页面：

| 子页面 | 路由 | 核心功能 |
|--------|------|----------|
| 剧情梗概 | `/archive/story/recap` | 将官方剧情梗概按「篇章 → 任务 → 场次」组织为可连续通读的长卷，左侧篇章导航点击锚点定位 |
| PRTS 文库 | `/archive/story/library` | 六类文献分类浏览，卷卡片展开条目 |
| 文献详情 | `/archive/story/library/:itemId` | 文献全文页 |
| Baker 聊天终端 | `/archive/baker` | 完整收录游戏内 Baker 聊天会话 |

**相关验收标准**（剧情梗概）：
- 全部剧情梗概按篇章、任务、场次顺序完整呈现，顺序与游戏内一致。
- 篇章导航点击后滚动定位到对应任务的第一场。
- 每张梗概卡片展示唯一编号与梗概全文。

### 1.2 技术方案要点

- **数据层**：`useStoryRecap` 消费 `DialogSummaryMapTable` + `DialogSummaryTable`，经 `adaptRecapScene` / `adaptRecapChapter` 纯函数适配为篇章两级结构。
- **dlg key 解析**：`^dlg_([a-z]+)(\d+)(?:l(\d+))?m(\d+)(?:d(\d+))?_(\d+)(?:d(\d+))?$`，`missionId` 由 `{chapterId}(l{lv})?m{missionNum}(d{sub})?` 组成（如 `a1m2`、`sm2l4m5`、`a1m8d1`）。
- **任务名来源**：游戏内 `TextTable` 中以 `{missionId}_name` 为 key 存放任务名（如 `a1m2_name`），文案本体经 `I18nTextTable_{locale}` 按 `id` 解析。

---

## 2. 验收问题清单

### 2.1 剧情梗概任务 id 未渲染任务名

**问题描述**：`/archive/story/recap` 渲染数据中，「a1m2」这类任务 id 直接以原始编号展示，未展示任务名。任务 id 在 `TextTable` 中可通过 `{missionId}_name` key（如 `a1m2_name`）查到对应名字。

**根因分析**：
1. `useStoryRecap` 仅拉取 `DialogSummaryMapTable` / `DialogSummaryTable`，未接入 `TextTable` 与 `I18nTextTable`。
2. `StoryRecapMission` 类型无 `name` 字段，`adaptRecapChapter` 聚合任务时不携带名称。
3. `StoryRecap.tsx` 侧边栏与任务分界处直接渲染 `m.missionId`。

**数据考证**：对全量 `DialogSummaryMapTable` 的 1078 个 dlg key 按 adapter 规则推导 `missionId`，去重后共 206 个任务；逐一验证 `TextTable["{missionId}_name"]` 存在，**206/206 全部命中，0 遗漏**（如 `a1m2_name` →「迟到的特训」）。

**修复方案**：
1. `StoryRecapMission` 新增 `name: string` 字段。
2. `adaptRecapChapter(scenes, missionNameMap?)` 新增可选任务名映射参数，聚合任务时 `name = missionNameMap?.[missionId] || missionId`（未命中回退原始 id）。
3. `useStoryRecap` 并行拉取 `TextTable` + 对应 locale 的 i18n dict，遍历去重后的 `missionId` 推导 `{missionId}_name` 条目并经 `resolveI18n` 解析，构建 `missionNameMap` 传入 `adaptRecapChapter`。
4. `StoryRecap.tsx` 渲染调整：
   - 侧边栏任务项：主行展示任务名，次行以 `font-mono` 小号展示 `missionId`（保留编号引用能力）。
   - 任务分界标题：任务名（`text-archive-ivory`）+ `missionId`（`font-mono text-archive-gold`），与篇章类型标题的金色 mono 风格一致。

**涉及文件**：
- `src/lib/types.ts` — `StoryRecapMission` 新增 `name`
- `src/lib/adapter.ts` — `adaptRecapChapter` 支持 `missionNameMap`
- `src/hooks/useData.ts` — `useStoryRecap` 接入 TextTable 并构建任务名映射
- `src/pages/story/StoryRecap.tsx` — 侧边栏与任务分界渲染任务名
- `src/lib/__tests__/adapter-story.test.ts` — 新增任务名解析与回退单测

**验证结果**：
- ✅ `npx vitest run src/lib/__tests__/adapter-story.test.ts`：21/21 passed（含新增 1 例）
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功（含 tsc）
- ✅ commit `965882d`
---

### 2.2 任务名排版换行

**问题描述**：任务名与 `missionId` 排版需单行展示、禁止换行，格式为「任务名 + 空格 + missionId」（`{missionId的文本} {missionId}`）；随后补充要求：左侧章节列表中过长任务名需支持换行，避免溢出。

**根因分析**：任务名文本未设 `whitespace-nowrap`，较长任务名（如「迟到的特训」在窄侧边栏内）触发自动换行；侧边栏任务项初版为「任务名 / missionId」上下两行布局，不符合单行要求。

**修复方案**：
1. 任务分界标题：flex 容器加 `whitespace-nowrap`（`flex items-baseline gap-2 whitespace-nowrap`），任务名与金色 mono `missionId` 同行不换行。
2. 侧边栏任务项：任务名与 `missionId` 合并为同一行内联渲染 `{name} <span mono>{missionId}</span>`；**过长任务名允许换行**，容器用 `break-words`（`overflow-wrap: break-word`）而非 `whitespace-nowrap`，保证窄列不溢出。

**涉及文件**：`src/pages/story/StoryRecap.tsx`

**验证结果**：
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功（含 tsc）
- ✅ commit `965882d`
---

### 2.3 missionId 穿透进入（暂缓）

**问题描述**：missionId 需要支持穿透进入。

**处理结论**：与产品确认，先完成任务名渲染（§2.1）与排版修复（§2.2）；穿透详情已实现为独立任务详情页 `/archive/story/mission/:missionId`（展示 MRA 任务 json 内容）+ recap 深链 `?mission=` 滚动与任务名链接，见 §7.2.3 与 §7.5 实施记录。

---

### 2.4 章节类型标签为臆测分类名称

**问题描述**：「谷地支线」这类章节类型标签（主线/支线/干员故事/地区事务/委托/谷地支线/协议空间/其他）是依据 dlg key 前缀臆测归纳的分类名称，需去除。原提案已注明「章节类型前缀为数据规律归纳，命名规则暂不明确」。

**根因分析**：章节类型前缀（e/sm/c/f/gm/a/db/m）本质是「章节编号」，与内容类型并不一一对应（§7.1.4 已用 MRA 数据证实：`m` 前缀 missionType 混布、`a` 为 11/7、`gm` 为 7/10/4）；据此臆测的中文分类名不可信。

**修复方案**：
1. 下拉筛选选项与侧边栏章节标题不再展示臆测分类名，改为显示原始前缀字母（`e→E`、`sm→SM`、`a→A`，`other→OTHER`）。
2. 删除 `scripts/i18n-custom.json` 中 9 个 `story.chapterType.*` 键（14 语言），经 `generate-i18n-dicts.ts` 重新生成。
3. 分区正式规则待 §7.2.4 数据驱动方案（missionType / charId）经产品确认后替换。

**涉及文件**：
- `src/pages/story/StoryRecap.tsx` — 标签改为前缀字母
- `scripts/i18n-custom.json` + `src/i18n/dicts/*` — 移除 `story.chapterType.*`

**验证结果**：
- ✅ Playwright 冒烟：recap 页不再出现「谷地支线/主线/干员故事」，下拉含 E/SM/A/DB/OTHER，无 console 错误
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功
- ✅ commit `39562c0`

---

### 2.5 任务详情页文本未用 RichText 渲染

**问题描述**：任务详情页 `/archive/story/mission/:missionId` 的任务描述与 quest 目标文本以纯文本渲染，未使用富文本组件。

**根因分析**：`StoryMissionDetail.tsx` 直接以 `<p>` / `<li>` 输出解析后的文本，未接入 `<RichText>`（游戏内文本含 `<color>`、`<b>`、`<image>` 等标记）。

**修复方案**：任务描述、quest 描述、quest 目标描述统一经 `<RichText text={...} />` 渲染（沿用全站规范，参照 `StoryDocumentDetail` / `EquipmentDetail`）。

**涉及文件**：`src/pages/story/StoryMissionDetail.tsx`

**验证结果**：
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功
- ✅ commit `30191ca`

---

### 2.6 任务目标需做树状结构

**问题描述**：任务详情页的「任务目标」区需以树状结构展示，而非主路径/分支平铺分组。

**根因分析**：quest 之间存在 `prevQuestIdList` 依赖关系（a1m2 为线性链；部分 mission 有分支与多父节点，如 `sm2l4m5_q#10←[q#7,q#8]`、`gm02m17_q#4←[q#5,q#1]`），平铺展示丢失依赖层级。

**修复方案**：
1. 新增 `MissionQuestTreeNode` 类型（`MissionQuest` + `children`）。
2. `buildMissionQuestTree(mainPathQuests, quests)` 纯函数构建依赖树：以 `prevQuestIdList` 中「在主路径内且序号最小」的 prev 为父（多父确定性收编）；prev 不存在/为空视为根；孤儿分支 quest 按主路径序与 questId 排序；带环保护（re-entrant 节点跳过）与无根回退。
3. 详情页「任务目标」改为递归树渲染：quest 节点缩进 + `border-l` 连接线 + 主路径徽标，目标项（objectiveList）挂在该 quest 节点下。

**二轮优化（树过深）**：主路径 quest 原本按 `prevQuestIdList` 逐层嵌套（a1m2 线性链深达 17 层）。优化为**主路径平铺为脊柱**——所有主路径 quest 直接作为根节点按 `mainPathQuests` 顺序平铺，仅分支 quest 挂载到其主路径/分支父节点下缩进渲染；分支嵌套深度 = 分支链深度 + 1（线性任务 0 层嵌套）。缩进从 `ml-4 pl-4` 收紧为 `ml-3 pl-3`。

**涉及文件**：
- `src/lib/types.ts` — `MissionQuestTreeNode`
- `src/lib/adapter.ts` — `buildMissionQuestTree`
- `src/pages/story/StoryMissionDetail.tsx` — 树状渲染
- `src/lib/__tests__/adapter-story.test.ts` — 树构建 4 例

**验证结果**：
- ✅ `npx vitest run src/lib/__tests__/adapter-story.test.ts`：33/33 passed（树构建 5 例）
- ✅ Playwright 冒烟（优化后）：a1m2 线性链 17 节点平铺、0 层嵌套；sm2l4m5 分支 quest `q#8` 挂在 `q#6` 下（1 层嵌套）、多父 `q#10` 挂在主路径 `q#7` 下；无 console 错误
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功
- ✅ commit `9f90c78` + `f40185e`（深度优化）

---

## 3. missionId 穿透进入方案（规划，未实施）

> ⚠️ 已由 §7 重构方案取代（接入 `MissionRuntimeAsset` 后，穿透详情展示 MRA 任务 json 内容，见 §7.2.3）。本节保留早期基于「页内锚点深链」的规划备查。

**目标**：任务号/任务名支持从其他页面（如 Baker 任务链接卡、搜索、文库）穿透进入剧情梗概的对应任务。

**方案**：
1. `StoryRecap` 支持深链参数 `?mission={missionId}`：页面加载完成后若存在该参数，滚动定位到 `#mission-{missionId}` 锚点；`handleNavClick` 改为同步更新 URL（`setSearchParams` 合并 `type` 与 `mission`），使任务定位可分享、可回退。
2. 任务名/任务号渲染为可点击入口（`<Link>` 或按钮），沿用全站「穿透链接」交互（参照 [[20260719-search-results-optimization|搜索优化 - 种族/阵营穿透]]）。
3. 消费方接入（后续随各自功能点落地）：
   - Baker 任务链接卡（contentType 12，`linkMissionId`）：跳转 `/archive/story/recap?mission={linkMissionId}`。
   - 搜索页：命中任务 id/名称时提供穿透入口。

**风险**：`mission` 参数需在类型筛选中保持（合并 query），且深链滚动需等数据加载完成后再执行（`useEffect` 依赖 `data`）。

---

## 4. 修复总览

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|------|------|------|-------------|
| 2.1 | 剧情梗概任务 id 未渲染任务名 | 未接入 TextTable `{missionId}_name`；`StoryRecapMission` 无 `name` 字段；页面直接渲染 `missionId` | ✅ 已修复 | `965882d` |
| 2.2 | 任务名排版换行 | 未设 `whitespace-nowrap`，侧边栏任务项上下两行 | ✅ 已修复 | `965882d` |
| 2.3 | missionId 穿透进入 | 功能未规划落地 | ✅ 已实现（任务详情页 + 深链），方案见 §7.2.3 | `2325081` |
| 2.4 | 章节类型标签为臆测分类名称 | 依据 dlg key 前缀臆测归纳 | ✅ 已修复（改为原始前缀字母） | `39562c0` |
| 2.5 | 任务详情页文本未用 RichText 渲染 | 直接输出纯文本 | ✅ 已修复 | `30191ca` |
| 2.6 | 任务目标需做树状结构 | quest 依赖关系平铺展示丢失层级 | ✅ 已修复（依赖树） | `9f90c78` |

---

## 5. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors（仅存量 warning） |
| `npm run test`（story adapter） | ✅ 21/21 passed |
| `npm run build` | ✅ 构建成功（含 tsc） |
| `npm run test`（全量） | ⚠️ 存量失败：`Sidebar.test.tsx` 2 例（提交前基线已失败，与本轮改动无关，见 §6） |

> 注：`Sidebar.test.tsx` 的 2 例失败在 `git stash` 后复现，确认为验收基线存量问题，不属于本轮修复范围。

---

## 6. 经验总结

- **游戏内文本名默认从 `TextTable` 取**：`{id}_name` 类 key 是 Endfield 文本表的标准命名规律。任务/区域/标题类实体的显示名都应优先查 `TextTable`，不要直接渲染原始编号或硬编码映射。
- **命名规律须用全量数据考证**：206 个任务 id 全部命中 `{missionId}_name` 是「全表统计验证」得出的结论，而非抽样猜测。只有全量验证过的规律才可作为稳定契约（对照工厂验收「字段名假设需验证」的教训）。
- **未识别任务回退**：`adaptRecapFallbackScene` 归入「other」组的任务 `missionId` 为 dlg key（无 `_name` 条目），回退显示原始 id，不丢数据、不报错。
- **UI 编号保留**：任务名渲染的同时保留 mono 编号（`font-mono` 小号），维持编号体系的稳定引用能力，为后续穿透（§3）预留入口形态。

---

## 7. 重构方案：接入 MissionRuntimeAsset 任务数据源（调查发现 + 方案 + 规划）

> 验收反馈任务权威数据源为 `MissionRuntimeAsset`。本节记录数据调查发现、重构方案与实施规划。所有数据在网页运行时动态获取，不落地本地文件。

### 7.1 数据源调查发现

#### 7.1.1 任务列表与详情端点

| 数据 | 端点 | 说明 |
|------|------|------|
| 任务列表 | `https://endfield-assets.fffdan.com/vfs/JsonData/files/Data/Json/MissionRuntimeAsset` | 返回路径数组，每条任务含 `{id}.json` 与 `{id}_meta.json` 两条 |
| 任务详情 | `.../raw/Data/Json/MissionRuntimeAsset/{id}.json` | 单任务完整数据（如 `a1m2.json`，约 33KB） |
| 轻量元信息 | `.../raw/Data/Json/MissionRuntimeAsset/{id}_meta.json` | 仅 `missionId` / `acceptMode{levelId, missionType}` / `missionImportance` / `rewardId` |

- 全量共 **490 个任务**（`.json` 与 `_meta.json` 各 490 个）。
- 前缀分布：`e` 85、`m` 75、`db` 72、`hidden` 60、`sm` 54、`c` 39、`gm` 37、`f` 36、`a` 27、`dm` 5。
- 与当前 recap 的 206 个（由 `DialogSummaryMapTable` 的 dlg key 推导）对比：**204 个能在 MRA 中找到**；`e11m1` 在列表中（数据源乱码内容已修复）；`c1m1` 不在 MRA 列表。

#### 7.1.2 `a1m2.json` 字段结构

```jsonc
{
  "missionId": "a1m2",
  "missionName": { "key": "a1m2_name" },          // 任务名 TextTable key（权威，见 §7.1.3）
  "rewardId": "reward_mission_a1m2",
  "missionType": 11,                               // 任务类型（语义枚举，见 §7.1.4）
  "baseMissionImportance": 1,
  "charId": "",                                    // 非空 ⟺ 干员故事
  "levelId": "map01_lv001",                        // 关联关卡（map/dung/base/indie）
  "scope": 0,
  "missionChapterBitmask": 0,                      // 章节位掩码 0/1/2
  "missionDescription": { "key": "a1m2_desc_001" },// 任务描述 TextTable key（见 §7.1.3，不得臆造）
  "questDic": { "a1m2_q#11": { ... } },            // 任务目标字典（穿透详情展示内容）
  "mainPathQuests": ["a1m2_q#3", ...],             // 主线目标顺序
  "isWrapperMission": false, "sortId": 0, "properties": []
}
```

穿透进入要展示的信息即来自此 json：任务名、任务描述、任务类型、关联干员、关联关卡、目标清单（`questDic` / `mainPathQuests`）等，全部字段以 json 内实际值为准，**不臆造任何 `{missionId}_xxx` 约定**。

#### 7.1.3 文本字段的权威解析（重点发现）

**任务名 `missionName`**：全量 490 任务中 363 个有 `missionName.key`，126 个没有（`hidden*`、`dm*`、`db` 子任务、`m0m1` 等系统/隐藏任务）。

- **`missionName.key` 是权威 TextTable key**：286/363 恰好等于 `{missionId}_name`（与用户约定一致）；**77 个不等于** `{missionId}_name`，由游戏显式指回：
  - d 后缀子任务指回父任务：`c33m1d5 → c33m1_name`、`e10m5d5 → e10m5_name`、`e11m7d5 → e11m7_name`、`db01m1d6 → db01m1_name`、`a1m6d8 → a1m6d3_name`
  - m 系列合并任务指回首个：`m1m78/m1m79 → m1m77_name`、`m1m16..19 → m1m10_name`
  - e9 系列指回：`e9m5 → e9m1_name`、`e9m7/e9m9 → e9m2_name`
  - 特殊目标描述：`db01m2d1 → objective_db01m2_32_001`
- **对照验证**：当前 recap 的 206 个任务全部命中 `TextTable[{missionId}_name]`（0 遗漏，此前验证成立）；仅 3 个在 MRA 中 key 被改写，故 recap 现有名称逻辑不受影响。

**任务描述 `missionDescription`**：**同样必须使用字段本身的值，`{missionId}_desc_001` 是错误约定**（仅 a1m2 等少数任务恰好等于它，不可推广）。全量 490 任务中 349 个有 `missionDescription.key`，**其中 113 个不等于 `{missionId}_desc_001`**：

- 指向其它任务/条目：`m1m77 → m1m74_desc_001`、`c33m1d5 → c33m1_desc_007`、`db01m10 → objective_db01m10_1_001`
- 直接为纯文本（非 key）：`dm01m5 → "黑盒接取条件隐藏任务"`（`missionDescription` 值本身就是描述文案）
- 141 个为空（`hidden*` 等无描述）

**解析规则（`missionName` / `missionDescription` 通用）**：
1. `{ key }` 对象 → 以 `key` 查 `I18nTextTable_{locale}` 对应 dict；
2. 字符串 → 直接作为文案；
3. 空 / 缺省 → 无文案（回退显示空或原始字段）。

**任务描述示例**（a1m2，`missionDescription.key = a1m2_desc_001`）：「终末地为派遣到四号谷地的干员准备了拓荒环境生存训练，寻找克拉拉教官，参加训练。」

**结论**：所有文本字段一律以 json 字段自身承载的 key 为准（`missionName.key` / `missionDescription.key`），**禁止按 `{missionId}_xxx` 拼接推导**；`{missionId}_name` 仅在字段缺省时作为兜底尝试。

#### 7.1.4 分区可能性探索（`a1/c1` 前缀不能作为分区条件的依据）

全量 490 个任务按前缀 × `missionType` 分布：

| 前缀 | missionType 分布 | 主导值 | 前缀 | missionType 分布 | 主导值 |
|------|-----------------|--------|------|-----------------|--------|
| e | 0:70, 9:6, 12:5, 4:3 | 0 | sm | 10:43, 7:11 | 10 |
| c | 1:32, 0:5, 9:2 | 1 | gm | 7:33, 10:3, 4:1 | 7 |
| f | 2:33, 7:2, 5:1 | 2 | a | 11:26, 7:1 | 11 |
| db | 8:66, 7:6 | 8 | m | 5:68, 7:5, 2:1, 4:1 | 5 |
| hidden | 4:60 | 4 | dm | 4:5 | 4 |

**观察**：
1. **`missionType` 在多数前缀内高度稳定**，是比前缀更贴近「内容类型」的语义枚举（如 e→0 主线、c→1 干员故事、f→2 地区事务、a→11 谷地支线、db→8 协议空间、sm→10 支线）。
2. **`charId` 是干员故事的强判别**：仅 `c` 前缀 39/39 全部非空，且共 8 个不同干员（`chr_0033_camille`、`chr_0016_laevat` 等）；其余前缀全部为空。
3. **`missionChapterBitmask`（0/1/2 位掩码）**：`e/sm/c/f/gm/a` 有非 0（如 e: 1×31, 2×52），`db/m/hidden/dm` 全为 0。疑似与「剧情章/幕」绑定，可作章内分区。
4. **`levelId` 家族**：`map`(339) / `dung`(80) / `base`(15) / `indie`(10)。`db` 几乎全部 `dung`（协议空间/地下城），`m` 含 `indie`（独立空间）。
5. **前缀不可作为分区条件的证据**：`m` 前缀 missionType 为 2/4/5/7 混布、`a` 为 11/7、`gm` 为 7/10/4、`hidden`/`dm` 与部分 `m` 同为 4 —— 前缀本质是「章节编号」，与内容类型并不一一对应；且 MRA 存在 `dm`、`hidden` 等 recap 未覆盖的前缀。

**分区候选方案**（数据驱动，替代「dlg key 前缀归纳」）：
- 候选 A（内容类型分区）：`charId != ''` → 干员故事；其余按 `missionType` 主导值映射现有类型标签（e→主线、sm→支线、f→地区事务、a→谷地支线、gm→委托、db→协议空间、m→其他）；`missionType` 精确语义仍需游戏内文本校准（沿用原提案约束）。
- 候选 B（章/幕 + 区域分区）：外层按 `missionChapterBitmask`（剧情章/幕），内层按 `levelId` 家族（地图/地下城/基地/独立空间）或 `charId`。
- 推荐：候选 A 为主、`missionType` 为键；`charId` 用于拆分干员故事；`missionChapterBitmask` 作为章节排序的补充信号。**分区规则需产品确认后再定稿**。

#### 7.1.5 questId 与 missionId 的关系（新增调查）

穿透详情需要展示任务目标清单，questId 的结构与关联关系如下：

- **questId 一律以 missionId 为前缀**：格式 `{missionId}_q#{suffix}`（如 `a1m2_q#11`、`a1m2_q#Day1`）。全量 4461 个 quest（489 个任务）验证，**0 个例外**。
- **suffix 高度多样**，无固定编号规则：
  - 纯数字：`a1m2_q#3`、`a1m2_q#11`
  - 天循环：`a1m2_q#Day1` ~ `a1m2_q#Day7`、`..._q#Day2Lock`
  - 语义名：`a1m2_q#talk_ui`、`e1m1_q#IntroDialog`、`gm02m17_q#Stage1`、`c16m1_q#boss`、`m1m77_q#firstBattle`、`sm2l4m5_q#Settlement` 等
- **排序**：任务内按 `mainPathQuests`（有序数组）为主路径顺序；各 quest 还有 `flowIndex`、`prevQuestIdList`（前置依赖）描述分支/流程。
- **主路径 vs 分支**：489 个任务中 **236 个存在不在 `mainPathQuests` 中的 quest**（分支/额外目标，如 `e11m8d5_q#4/#5/#7`），详情展示需区分「主路径目标」与「分支/额外目标」。
- **quest 目标文本**：`objectiveList[].description`（4461 中 3473 个带 `{key}`）与 `descriptionOverride`（803 个 quest 置 `overrideMissionDesc`）均为 TextTable key，样式同 §7.1.3（`{key}` → 查 dict；无 → 跳过）。
- **questType**：0（4345）/ 1（35）/ 2（81）。

**展示关系**：`missionId`（穿透入口）→ `questDic` / `mainPathQuests`（任务内目标清单）→ `objectiveList` 各目标（含描述 key 与目标条件）。questId 以 `{missionId}_q#...` 全文展示作为稳定引用，与任务名/描述并列。

### 7.2 重构方案

#### 7.2.1 API 层（`src/lib/api.ts`）

- 新增 `fetchMissionList()`：GET `vfs/JsonData/files/Data/Json/MissionRuntimeAsset`，返回去重后的 `{id}.json` 路径数组（490 任务），经现有 `fetchJson` 直接解析（JSON 均为标准格式，乱码内容已移除，无需 `safeParse`）。
- 新增 `fetchMissionDetail(id)`：GET `.../raw/Data/Json/MissionRuntimeAsset/{id}.json`，返回详情对象，直接 `JSON.parse`。
- 统一经 `getCachedData` 缓存，遵循现有 in-flight 去重与 loading 追踪约定。

#### 7.2.2 数据层（`src/hooks/useData.ts` + `src/lib/adapter.ts` + `types.ts`）

- 新增 `MissionRuntime` 类型（missionId / name / nameKey / desc / descKey / missionType / charId / levelId / bitmask / mainPathQuests / quests / isWrapper 等）。
- 新增通用文本解析辅助（复用 §7.1.3 规则）：`{ key }` 对象 → 查 locale dict；字符串 → 直接文案；空 → 回退。**严禁按 `{missionId}_xxx` 拼接推导 key**。
- 新增 `MissionQuest` 类型（questId / questType / descriptionKey / objectiveDescriptions / prevQuestIds / flowIndex / inMainPath 等）。
- 新增 `useMissionCatalog()`：MRA 列表 → 任务目录（490 条）；名称解析：`missionName.key` →（缺省时兜底 `{missionId}_name`）→ 原始 id（适配 TextTable 各 locale dict）。
- `useStoryRecap` 任务名解析改为复用 MRA 目录（recap 206 任务列表保持不变；`c1m1` 等 MRA 缺失任务按现有回退兜底）。
- 新增 `useMissionDetail(missionId)`：拉取 `{id}.json`，`missionName` / `missionDescription` / quest 各描述字段均按 §7.1.3 规则解析，供穿透详情页使用。

#### 7.2.3 穿透详情（对应 §2.3）

- 新增任务详情视图/路由（如 `/archive/story/recap?mission={missionId}` 或独立详情路由），展示 MRA 详情：
  - 任务名（`missionName.key` 解析）+ 任务编号（mono，保留引用）
  - 任务描述（`missionDescription` 字段本身：`{key}` 查 dict / 字符串直出 / 空则不展示）
  - 元信息：`missionType`、关联干员（`charId`）、关联关卡（`levelId`）、`missionChapterBitmask`、`isWrapperMission`
  - **任务目标清单（quest 列表）**：
    - 每条 quest 展示 `questId` 全文（`{missionId}_q#{suffix}`）作为稳定引用，并区分「主路径」（按 `mainPathQuests` 顺序）与「分支/额外」（不在主路径中）
    - 每条 quest 展示其 `objectiveList` 各目标（`objectiveList[].description` 按 §7.1.3 解析；目标条件字段可视化）
    - 分支/流程：`flowIndex` + `prevQuestIdList` 展示先后依赖
- 深链：`StoryRecap` 支持 `?mission={id}` 加载后滚动到锚点；任务项渲染为可点击入口。

#### 7.2.4 分区重构

- 依据 §7.1.4 候选方案，将 `chapterType` 的推导从「dlg key 前缀」迁移为「MRA `missionType` / `charId` 数据驱动」；分区规则经产品确认后冻结，i18n 标签同步校准。

### 7.3 实施规划

| 阶段 | 内容 | 产出 |
|------|------|------|
| 阶段一 | API 层 `fetchMissionList` / `fetchMissionDetail` + 单测 | 数据可拉取、可容错 |
| 阶段二 | `MissionRuntime` / `MissionQuest` 类型 + `useMissionCatalog` + adapter + 文本解析（name/desc/quest 描述，§7.1.3 规则）单测 | 任务目录接入，名称/描述/quest 解析 |
| 阶段三 | 穿透详情视图（含 questId 清单：主路径/分支区分、目标描述、`flowIndex`/`prevQuestIdList` 依赖）+ 深链 `?mission=` 滚动 | §2.3 闭环 |
| 阶段四 | 分区重构（missionType/charId 数据驱动） | 分区规则定稿 + i18n 校准 |
| 阶段五 | UT / E2E 覆盖 + lint / test / build 全量验证 | 验收闭环 |

### 7.4 风险与待确认

- **`c1m1` 不在 MRA 列表**：recap 现有兜底逻辑须保留（`e11m1` 在列表中，此前本地解析的乱码问题已随数据源修复，网页端直接 `JSON.parse` 即可）。
- **`missionType` 语义未定**：枚举含义需游戏内文本校准，分区标签不可臆测（对照原提案「章节类型前缀为数据规律归纳，命名规则暂不明确」的约束）。
- **vfs 端点稳定性**：`files` 端点返回路径数组，需在版本变更时纳入缓存失效校验（复用现有版本对比机制）。
- **文本 key 一律以字段自身为准**：`missionName.key` / `missionDescription.key` / quest 各 `description.key` 是权威；**`{missionId}_desc_001` 为错误约定**（349 个有 key 的 description 中 113 个不等于它），`{missionId}_name` 仅在字段缺省时作兜底；字段值还可能是直接字符串或空对象，须统一兼容三种形态。

---

### 7.5 实施记录（阶段一 ~ 阶段三）

§7.2.3 的穿透详情已实施并通过冒烟验证（commit `2325081`）：

| 阶段 | 内容 | 实现 |
|------|------|------|
| 阶段一 | `fetchMissionList` / `fetchMissionDetail`（`src/lib/api.ts`，直接 `fetchJson` 解析） | ✅ |
| 阶段二 | `MissionRuntime` / `MissionQuest` / `MissionQuestObjective` 类型；`resolveRuntimeText` / `extractMissionIds` / `adaptMissionRuntime` / `adaptMissionQuest`（`src/lib/adapter.ts`）；`useMissionCatalog` / `useMissionDetail`（`src/hooks/useData.ts`） | ✅ |
| 阶段三 | 任务详情页 `/archive/story/mission/:missionId`（`StoryMissionDetail.tsx`）；recap 任务名链接 + `?mission=` 深链滚动 | ✅ |
| i18n | 新增 `story.missionDesc / missionObjectives / missionType / relatedOperator / relatedLevel / backToRecap / mainPath / branch / noDescription` 与 `api.fetchingMissionList / fetchingMissionDetail`（14 语言，经 `generate-i18n-dicts.ts` 生成） | ✅ |

**验证结果**：
- ✅ `npx vitest run src/lib/__tests__/adapter-story.test.ts`：28/28 passed（新增 mission 适配 7 例）
- ✅ `npm run test`：389 passed（仅存量 `Sidebar.test.tsx` 2 例失败，基线问题）
- ✅ `npm run lint`：0 errors
- ✅ `npm run build`：构建成功（含 tsc）
- ✅ Playwright 冒烟：`/archive/story/mission/a1m2` 渲染任务名「迟到的特训」、任务描述、`a1m2_q#*` 目标清单、「任务目标 / 主路径」分区；recap 页任务名链接存在；无 console/page 错误
- ✅ 真实数据管道验证：490 任务目录提取；`c33m1d5 → c33m1_name`、`m1m77 → m1m74_desc_001`、`dm01m5` 直出字符串等边界均正确解析

---

## 8. 任务目标 condition 数据渲染方案（规划，未实施）

> 验收反馈需解析 quest 的 `objectiveList`（含 `_activityStageId`、`ActivityConditionalMultiStageCompleteConditionTable` 等表），整理渲染方案。本节约 2026-07-31 全量数据调查结论与方案。

### 8.1 objectiveList 数据结构（调查结论）

每个 quest 的 `objectiveList[]` 元素结构：

```jsonc
{
  "multiple": false,
  "condition": {
    "$type": "Beyond.Gameplay.CheckActivityConditionalStageStatus, Gameplay.Beyond",
    "uniqueId": "86c2ba68",
    "useCurrentScope": false,
    "scopeMask": 1,
    "useGraphScope": true,
    "_activityStageId": { "constValue": "dungeon_fighting_5" },
    "_comparer": { "constValue": 3 },
    "_progressToCompare": { "constValue": 1 }
  },
  "description": {},                          // TextTable key（79% 目标有，3483/4407）
  "useMultipleDescription": false,
  "multipleDescription": [],
  "showProgressMethod": 0,
  "mapSubCondition": false,
  "trackingInfoList": [],
  "isObjectiveWrapper": false, "wrapperSystemType": 0, "objectiveWrapperStep": 0,
  "isBlockObjective": true
}
```

要点：
- **`condition` 是类型化条件**：`$type` 为 C# 类全名（`Beyond.Gameplay.Xxx`），常量字段统一用 `{ constValue }` 包装，布尔/枚举字段（`scopeMask`、`useGraphScope`）直接裸露。
- **`CombineCondition`**（250 个）：`conditionEvalString`（如 `"{0} and (({1} and {2}) or {3})"`）+ `subConditions[]` 递归布尔组合。
- **`compareOperator` 恒为 3**（CompleteConditionTable 182 个 + GameMechanicConditionTable 297 个全部为 3），`progressToCompare` 为进度阈值。

### 8.2 condition `$type` 清单与引用表（全量 3289 个 objective）

| $type（简短名） | 数量 | 关键字段 → 引用表 |
|------|-----|------|
| `GameConditionServerPlaceHolder` | 1514 | `_comparer`/`_progressToCompare`（通用进度占位） |
| `ReachDestination` | 531 | `_areaId`（区域）、`_mapId`（地图）→ 区域/地图命名表 |
| `CheckTalkOptionFinish` | 328 | `_dialogId`（dlg key）、`_finishId` |
| `CombineCondition` | 250 | `conditionEvalString` + `subConditions[]` 递归 |
| `WeekRaidPlayerHasItem` | 126 | `_itemId`（item_*）→ ItemTable |
| `CheckLevelScriptPropertyBool/Int` | 97 | `_mapId`、`_scriptId`、`_key`、`_value` |
| `CheckSnapshotIdentifySuccess` | 68 | `_identifyGroupId` |
| `CheckQuestState` | 55 | `_questId`、`_targetQuestState` → 同任务 quest |
| `CheckScriptMonsterKilled` | 51 | `_sceneId`、`_scriptId`、`_slotIds` |
| `CheckMissionState` | 46 | `_missionId`、`_targetMissionState` → 其它任务 |
| `CheckMoney` | 40 | `_moneyId`（item_*）、`_comparer`、`_progressToCompare` |
| **`CheckActivityConditionalStageStatus`** | **30** | **`_activityStageId` → 活动阶段链路（§8.3）** |
| `CheckMonsterKilled` | 21 | `_sceneId`、`_enemyIds[]`（logicId）→ 敌人表 |
| `PlayerHasItemInItemBag` / `PlayerHasItem` | 29 | `_itemId`、计数 → ItemTable |
| `CheckAdventureLevel` / `CheckWorldLevel` | 18 | 等级阈值 |
| `CheckPlayerInMap` | 14 | `_mapId` |
| 其余 20+ 单双次类型 | <10 各 | 引导/科技/建筑/统计/黑盒/FMV 等 |

**objective 主文本**：`description`（TextTable key）覆盖 79%，是首要展示内容；condition 作为补充结构化信息。

### 8.3 活动阶段链路（`_activityStageId` 重点）

`CheckActivityConditionalStageStatus._activityStageId`（如 `dungeon_fighting_5`、`cleaning_test_5`）的解析链：

```
_activityStageId (dungeon_fighting_5)
 ├─ ActivityConditionalMultiStageStageToActivityTable[stageId]
 │     → { activityId, desc(i18n id), rewardId }          ← 阶段显示名/描述
 └─ ActivityConditionalMultiStageCompleteConditionTable[stageId].conditionList[]
       → [{ compareOperator, conditionId, conditionType, parameters[], progressToCompare }]
            └─ conditionType 分派（数据归纳）：
                 5052 → dungeon fighting：param[0]=levelId(dung01_actmonster05)
                        → ActivityDungeonFightingStageTable[levelId] → { levelId, questId }
                        → questId → 所属任务 → 任务名
                 5031 → indie hard 副本通关：param[0]=indie_hard009
                 18   → quest 状态：params=[questId, comparer, targetState]
                 19   → mission 状态：params=[missionId, comparer, targetState]
                 6511/6069 → 统计值（E_StatType_DailyStaminaCost / GameEnterNum / ActivityLogin）
                 6006 → 收集/交互物（TrchestCommon / CampfireCommon / map02_lv007）
                 5915 → 提交食材（activity_submit_food_2_stage_4）
                 6053 → 设施电力（power_pole_3 + map）
                 6502/6503 → 收集计数（阈值 20/40/60）
                 6070/6071 → 副本难度（indie_hard001 / dungeon_highdifficulty）
                 5014 → 地图/枢纽（map02_lv002 / sp_hub_1）
                 4507 → 数量条件（3/6）
```

同时存在 `ActivityConditionalMultiStageConditionTable`（41 个，活动解锁条件，含 `desc` i18n id + `blockShow`）与 `GameMechanicConditionTable`（297 个，`desc` i18n id + `gameMechanicsId` + 同款 compareOperator/progressToCompare）。

### 8.4 渲染策略

1. **主文本优先**：`objective.description` 经 TextTable 解析直接展示（已具备 `resolveRuntimeText` 能力）。
2. **结构化补充**：condition 按 `$type` 分派到格式化器，输出可读描述（如「前往地图 map01_lv007 的 e11m4_004」/「在 dungeons_fighting 达到 X 进度」）；`CombineCondition` 按 `conditionEvalString` 递归渲染子条件树（运算符 and/or）。
3. **深链解析**：跟随引用表解析名称（阶段名 → StageToActivityTable.desc；任务名 → 任务；道具名 → ItemTable；等级/统计值直出数字），统一经 TextTable resolver 本地化。
4. **兜底**：未知 `$type` 渲染原始字段列表（`field: value`），不丢数据。
5. **优先级**：description 为空时展示 condition 渲染结果；description 存在时以 description 为主、condition 细节作为次要行（含 progressToCompare 进度）。

### 8.5 实施规划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 阶段一 | `constValue` 解包 + `$type` 分派框架 + `CombineCondition` 递归 + 兜底；单测 | ✅ 已实施（commit `d15ae29`） |
| 阶段二 | 高频类型格式化器（ReachDestination / CheckTalkOptionFinish / CheckQuestState / CheckMissionState / PlayerHasItem 系 / CheckActivityConditionalStageStatus） | ✅ 已实施（commit `a616130`） |
| 阶段三 | 活动阶段链路数据接入（StageToActivity + CompleteCondition + DungeonFightingStage），任务/道具/区域名称深链 | ✅ 已实施（commit `5685fe7`） |
| 阶段四 | 任务详情页目标节点接入渲染；UT / E2E + lint / test / build 验证 | ✅ 已实施（commit 见下） |

**阶段一实现**（`src/lib/missionCondition.ts`，commit `d15ae29`）：

- `unwrapConstValue`：递归解包 `{ constValue }`，嵌套结构（如 `{ constValue: { scriptId } }`）渲染为 `key=value`。
- `shortConditionType`：从 C# 全名 `Beyond.Gameplay.Xxx, Gameplay.Beyond` 提取短名，缺失回退 `Unknown`。
- `extractConditionFields`：过滤元数据（`$type`/`uniqueId`/`scopeMask`/`useGraphScope`/`useCurrentScope`）与保留键（`subConditions`/`conditionEvalString`），数组展开为 `a, b`。
- `renderMissionCondition`：`CombineCondition` 递归渲染 `subConditions` 子树并保留 `conditionEvalString`；其余按短名查 `registerMissionConditionFormatter` 分派，无格式化器则回退字段列表；空输入返回 `null`。
- 接入 `adaptMissionQuest`：`MissionQuestObjective` 新增 `condition?: MissionConditionRender`（`types.ts`），携带 `resolveKey` 作为 `resolveText` 上下文。
- 测试 `src/lib/__tests__/missionCondition.test.ts`：16 例通过（短名/解包/字段提取/Combine 递归/分派/上下文/回退/空输入）。

**阶段二实现**（`src/lib/missionCondition.ts`，commit `a616130`）：

- `MissionConditionRender` 以 `args`（语义模板变量）取代 `summary`：格式化器把原始 `_field` 名映射为语义 arg（`_mapId→map`、`_itemId→item`、`_progressToCompare→count` 等），页面（阶段四）按 `type` 映射到 `t('story.obj*')` 字面 key 渲染，保证 i18n verify 可见。
- `conditionField`：按字段名取解包后的值；`argFormatter` + `registerArgFormatter` 声明式注册。
- 已注册 12 个高频类型：`ReachDestination`（map/area）、`CheckTalkOptionFinish`（dialog）、`CheckQuestState`（quest）、`CheckMissionState`（mission）、`CheckActivityConditionalStageStatus`（stage）、`PlayerHasItem`/`PlayerHasItemInItemBag`（item/count）、`WeekRaidPlayerHasItem`（item）、`CheckMoney`（item/count）、`CheckAdventureLevel`/`CheckWorldLevel`/`CheckUnlockWorldLevel`（level）。
- 未注册类型（如 `GameConditionServerPlaceHolder`）继续回退 `fields`。
- 阶段二测试新增 11 例（27 例全部通过）；lint / build 通过。

**阶段三实现**（commit `5685fe7`，`src/lib/missionConditionNames.ts` + `src/hooks/useData.ts`）：

- 纯函数 `resolveConditionArgs(render, resolveArg)`：按 `argName` 逐项把原始 id 替换为可读名称，不可解析项保持原值；`CombineCondition` 子条件递归；不改输入。
- `useMissionDetail` 返回 `{ mission, conditionResolver }`（`MissionDetailData`），`conditionResolver` 提供：
  - `resolveArg`：`stage`→StageToActivityTable.desc（i18n 表字典，84/183 可解析，含 a1m2 全部 dungeon_fighting 关卡）、`map`→LevelDescTable.showName（北部禁区/供能高地/深谷旧街）、`item`→ItemTable.name、`mission`→TextTable `${id}_name`、`quest`→本任务 questDic 的描述（override 或首个目标）；其余 arg 保留原值。
  - `stageDetail(stageId)`：StageToActivityTable + ActivityDungeonFightingStageTable + ActivityConditionalMultiStageCompleteConditionTable 拼接活动阶段详情（阶段名/activityId/rewardId/关联 questId/levelId/conditionList）。
- 精度说明：`{id,text}` 大整数 id 依赖 api.ts `safeParse` 转字符串保留精度，`resolveI18n` 才能在 i18n 字典命中。
- 端到端验证：a1m2-v2 的 6 个 `CheckActivityConditionalStageStatus` 目标均解析出阶段名与关联 quest（如 `a1m2_q#11 → dungeon_fighting_5 → a1m2_q#Day5`）。
- 测试新增 4 例（`missionConditionNames.test.ts`）；lint / test / build 通过。

**阶段四实现**（commit `7368768`，`src/lib/missionConditionText.ts` + `src/pages/story/ObjectiveCondition.tsx` + i18n 模板）：

- `renderConditionText(render, t)` 纯函数：按 `render.type` 静态映射到 i18n 模板 key 并传入语义 args；`CombineCondition` 递归渲染子条件并把 `conditionEvalString` 中的 `{n}` 占位符与 `and/or/not` 运算词替换为本地化文案；未知类型回退 `fields`（`name: value`），无可渲染内容返回 `null`。
- `GameConditionServerPlaceHolder`（1514 个，全量最多）补注册 formatter：`_progressToCompare → progress`，渲染「进度达到 {{progress}}」。
- `ObjectiveCondition` 组件：`resolveConditionArgs` 解析名称后调 `renderConditionText`，`t` 走 `useI18n`。
- `StoryMissionDetail`：目标节点 `<li>` 下挂载 `<ObjectiveCondition>`，quest 树递归传入 `resolveArg`；无 resolver 时（异常路径）直接渲染原始 args 不回退报错。
- i18n 新增 14 个 `story.obj*` 模板 key（14 语言本土翻译，含 CN/EN/JP/KR/RU 等），经 `generate-i18n-dicts.ts` 重新生成；`verify-i18n` PASSED。
- 真实数据验证：a1m2（6 个阶段 + 2 个对话 + 9 个进度条件）、m1m75（ReachDestination 解析出地图名）。
- 测试新增 5 例（`missionConditionText.test.ts`，含 Combine and/or/not 与 fields 兜底）；E2E 新增 2 例（a1m2 阶段/对话、m1m75 地图/进度）；全量 lint / test / build 通过（仅存量 Sidebar 2 例基线失败）。

### 8.6 风险与待确认

- **conditionType 语义为数据归纳**：18/19/5031/5052/6502… 等枚举含义依据参数形态推断，需游戏内文本校准（对齐原提案「命名规则暂不明确」约束）。
- **`_comparer` 恒为 3**：其余取值（0/1/2…）未见样例，比较运算语义需实测确认。
- **区域/地图命名表未定位**：`ReachDestination._areaId`（如 `e11m4_004`）在本地表中未检索到对应表，需进一步排查。
- **`GameConditionServerPlaceHolder`（1514 个）** 占绝对多数但字段仅比较器+进度，很可能对应 objective.description 已有文案；渲染以 description 为主即可。
- **CombineCondition 表达式解析**：`conditionEvalString` 的占位符与运算符解析需严格测试。

---

## 9. 三阶段验收问题方案（阶段五：活动关联组件 + quest 展示增强）

> 三阶段验收反馈 3 项：①`_activityStageId` 关联的 Activity 数据表很多未渲染，需抽出独立组件；②单个 quest 需加边框与其他 quest 区分；③quest 依赖关系左侧需画依赖线，「←」字符替换为「前置任务」badge。
>
> **review 追加意见（2026-08-01）**：①奖励单独抽组件、按 `rewardId` 渲染；②dungeon 单独抽组件、按 `dungeonId` 渲染 dungeon 内容及其奖励；③**注意 `Activity.rewardId` 与 `Dungeon.rewardId` 不同**，两者都依赖奖励组件渲染；④dungeon 的 `enemyIds` 需渲染（不限，其余字段尽可能渲染），`dungeonPicPath` 图片需在合适位置渲染；⑤**敌人组件需单独抽出（不放在 Dungeon 组件内实现），按 `{enemyId, level}` 渲染**。本节为修订后方案（待 review 后实施）。

### 9.1 数据调查结论（`dungeon_fighting_2` 完整关联链）

以 `a1m2_q#6` → `_activityStageId = dungeon_fighting_2` 为例，objective 条件实际关联 5 张 Activity 表 + 3 张外围表：

| 表 | 键 | dungeon_fighting_2 命中 | 关键字段 |
|------|-----|------|------|
| `ActivityConditionalMultiStageStageToActivityTable` | stageId | ✅ | `activityId=dungeon_fighting`、`desc{i18n}`、`rewardId` |
| `ActivityConditionalMultiStageTable` | activityId | ✅（`dungeon_fighting`） | `stageList[stageId]`：`name{i18n}`、`missionId=a1m2`、`sortId=2`、`timeId`、`jumpId`、`rankRelatedId` |
| `ActivityConditionalMultiStageCompleteConditionTable` | stageId | ✅ | `conditionList[]`：`conditionType=5052`、`parameters[0]=dung01_actmonster02`、`progressToCompare` |
| `ActivityConditionalMultiStageConditionTable` | stageId | ✅ | `conditionList[]`：`conditionType=5902`、`desc{i18n}="完成前置关卡「物以类聚」后解锁"`、`blockShow` |
| `ActivityDungeonFightingStageTable` | stageId | ✅ | `levelId=dung01_actmonster02`、`questId=a1m2_q#Day2` |
| `DungeonTable`（外围） | levelId | ✅ | `dungeonName{i18n}="爆破练习"`、`dungeonDesc`、`dungeonLevelDesc`、`featureDesc`、`costStamina`、`dungeonCategory`、`enemyIds[]`、`enemyLevels[]`、`dungeonPicPath="dung_surviva_bomb"`、`sceneId`、`sortId`、`rewardId`（多数空）、`firstPassRewardId`（200/299）、`customRewardId`（12）、`extraRewardId`（41）、`hunterModeRewardId`（11） |
| `ActivityTable`（外围） | activityId | ✅ | `name{i18n}="生存特训"`、`desc{i18n}`、`type`、`rewardId=reward_dungeon_fighting_overview`、`conditions[]`、`introMissionJumpId`、`introMissionQuestId` |
| `RewardTable`（外围） | rewardId | ✅ | `itemBundles[]`：`{count, id}` → ItemTable 名称「嵌晶玉」；`probItemBundles[]`（概率奖励） |
| `EnemyTemplateDisplayInfoTable`（外围） | enemyId | ✅ | `name{i18n}="碾骨撕裂牙兽"`、`nickname`、`description`、`abilityDescIds`、`distributionIds`、`templateId` |

**调查要点**：
1. **`MultiStageTable` 是活动主表**（31 条，全部含 `stageList`），stage 的 `name`（如「爆破练习」）、`missionId`（所属任务）、`sortId`（关卡序号）都在这张表；`StageToActivityTable`（183 条）仅含 `desc` 与 `rewardId`，两者互补。
2. **解锁条件 `ConditionTable`** 的 `desc` 是现成文案（i18n 可直接解析，如「完成前置关卡「物以类聚」后解锁」），`conditionType=5902` 参数 `[0]=前一个 stageId`（如 `dungeon_fighting_1`）；`blockShow=true` 时 UI 应隐藏（引导/隐藏条件）。
3. **完成条件 `CompleteConditionTable`** 无自带文案，需按 `conditionType` 分派：`5052`→DungeonTable levelId、`18`→questId、`19`→missionId、`5031`→indie 关卡、`6006/6053`→地图物件、`6511/6069`→统计值、`4507/6502/6503`→数量阈值（沿用 §8.3 分派表）。
4. **dungeon 战斗关系**：`DungeonFightingStageTable` 以 stageId 为键给出 `levelId`（dungeon 关卡）与 `questId`（如 `a1m2_q#Day2` 对应同任务 quest，可经 questDesc map 解析出目标文案）。
5. **i18n 大整数 id**：所有 `name/desc` 的 `{id}` 为 17-19 位大整数，依赖 `api.ts` `safeParse` 转字符串保精度后才能在表字典命中（已验证：`MultiStageTable` 327 个 key、`ActivityTable` 216 个 key、`DungeonTable`、`EnemyTemplateDisplayInfoTable` 均可解析）。
6. **奖励链路**：`RewardTable[rewardId]` → `itemBundles[]`（固定奖励，`itemBundleVisibleList` 标识是否可见）+ `probItemBundles[]`（概率奖励）。现有 `RewardPanel` 组件已封装该渲染（`rewardIds: string[]` + `rewardTable`），可直接复用。
7. **`Activity.rewardId` ≠ `Dungeon.rewardId`**：stage 的奖励来自 `StageToActivityTable.rewardId`（如 `reward_dungeon_actmonster_a1d2`），而 `DungeonTable[dung01_actmonster02].rewardId` 为空；dungeon 自身的奖励集中在 `firstPassRewardId`（200 个 dungeon 有，如 `dung01_bossrush02_03 → reward_dung01_bossrush02_03_firstpass`）、`customRewardId`（12）、`extraRewardId`（41）、`hunterModeRewardId`（11）。两个 rewardId 必须分别渲染。
8. **dungeon 图片路径已验证**：`dungeonPicPath`（如 `dung_surviva_bomb`）对应 `{ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/dungeon/{path}.png`（HTTP 200，webp 679KB）。敌人图标复用现有 `{ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/{templateId}.png`（参照 `EnemyDetail.tsx:174`）。

### 9.2 方案：独立 Reward 组件（review ①）

**目标**：把「奖励」渲染从活动面板/详情内联逻辑中抽出，按 `rewardId` 渲染，供 Activity 与 Dungeon 两处复用。

**结论：复用现有 `RewardPanel`**（`src/components/Items/RewardPanel.tsx`）：
- 现有组件签名 `{ rewardIds: string[]; rewardTable: Record<string, any> }`，内部按 `rewardTable[rid].itemBundles`（固定）与 `probItemBundles`（随机）分类，经 `ItemTile` 渲染名称 + ×count，恰好满足需求（`ActivityTooltip.tsx:132`、`ItemTooltip.tsx:190` 已在用）。
- 活动面板与 dungeon 面板均通过 props 传入 `rewardTable`（resolver 内已加载的 `RewardTable` + `ItemTable`），不新增数据获取。
- 若 review 认为需独立「奖励卡片」展示形态（如面板标题「奖励」+ 分固定/随机），可在 `RewardPanel` 外层包一层分组容器，不改变其核心逻辑。

### 9.3 方案：独立 Enemy 组件（review ⑤）

**目标**：敌人渲染为独立、可复用组件，按 `{enemyId, level}` 渲染，不内聚在 Dungeon 组件中（Dungeon 只负责组合敌人实例）。

**接口**（`src/pages/story/EnemyUnit.tsx`）：
- `EnemyUnit({ enemyId, level }: { enemyId: string; level?: number })`：单个敌人卡片——图标（`monstericonbig/{templateId}.png`，`onError` 隐藏回退）+ 名称（`EnemyTemplateDisplayInfoTable.name` i18n）+ 等级（`Lv.{level}`，`level` 缺失时省略）。
- 纯展示组件，props 注入已解析的 `enemy: EnemySummary | undefined`（`{id, name, nickname, iconUrl, level}`），无内部数据获取；数据由调用方（resolver / Dungeon 组件）预先解析，便于单测。

**数据接入**（`src/hooks/useData.ts` `getMissionConditionResolver`）：
- 新增并行加载：`EnemyTemplateDisplayInfoTable` + i18n（`useData.ts:648` 已有同表加载范式）。
- 新增 `enemySummary(enemyId): EnemySummary | undefined`：拼表返回 `{id, name, nickname, templateId, iconUrl}`；`iconUrl = {ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/{templateId}.png`。
- 本组件独立于 Dungeon 数据流，其他页面（如章节怪物列表）也可复用。

### 9.4 方案：独立 Dungeon 组件（review ②④）

**目标**：按 `dungeonId`（即 `DungeonFightingStageTable.levelId`，如 `dung01_actmonster02`）渲染 dungeon 关卡内容、图片与奖励；敌人委托 §9.3 `EnemyUnit`。

**类型扩展**（`src/lib/missionConditionNames.ts`）：
- 新增 `DungeonDetail` 接口：
  - `dungeonId`、`name`（DungeonTable.dungeonName i18n）、`desc`（dungeonDesc）、`levelDesc`（dungeonLevelDesc）、`featureDesc`（featureDesc，富文本，含 `<@gd.key>` 等标记）
  - `picUrl`（`{ASSET_BASE}/sprites/dungeon/{dungeonPicPath}.png`，`dungeonPicPath` 为空时无图）
  - `costStamina`、`dungeonCategory`、`sortId`、`sceneId`
  - `enemies[]`：`{ enemyId, level }[]`（`enemyIds[i]` 与 `enemyLevels[i]` 按索引对齐；渲染时逐条委托 `EnemyUnit`）
  - `rewards`: `{ fixed: string[]; firstPass: string[]; custom: string[]; extra: string[]; hunter: string[] }`（各 rewardId 分类，均复用 RewardPanel 渲染）
  - 全部字段可空，组件兜底。

**数据接入**（`src/hooks/useData.ts` `getMissionConditionResolver`）：
- 新增并行加载：`DungeonTable` + i18n、`RewardTable`（已有）+ i18n（ItemTable 已有）；敌人名称/图标经 §9.3 `enemySummary()`。
- 新增 `dungeonDetail(dungeonId): DungeonDetail | null` 方法：拼 `DungeonTable` + `RewardTable` + `ItemTable` + §9.3 敌人解析；`enemyIds[i]` 与 `enemyLevels[i]` 按索引对齐生成 `enemies[]`。

**组件**（`src/pages/story/DungeonPanel.tsx`）：
- 纯展示组件，props 注入 `detail: DungeonDetail` + `rewardTable` + `t`。
- 展示结构：
  - 头部：dungeon 名称 + `sortId`/`costStamina`/`dungeonCategory` 元信息 + `dungeonPicPath` 图片（`<img>` 首图位，`onError` 隐藏回退）。
  - 描述：`desc`（富文本）→ `levelDesc`（威胁等级）→ `featureDesc`（机制说明，富文本）。
  - 敌人列表：`detail.enemies[]` 逐条渲染 `<EnemyUnit enemyId={...} level={...} />`（横向排列；`enemySummary` 未命中时组件自身兜底显示 enemyId）。
  - 奖励分组：`firstPassRewardId`（首通）→ `customRewardId` → `extraRewardId` → `hunterModeRewardId` → `rewardId`（若有），各渲染一个 `RewardPanel` 分组，组标题用 i18n key（`story.dungeonFirstPass` 等）。

### 9.5 方案：独立 Activity 阶段组件（问题①，整合 review）

**目标**：把「活动阶段」的关联数据从文本行升级为独立渲染块，`dungeon`、`reward`、`enemy` 分别委托 §9.4 / §9.2 / §9.3 组件。

**类型扩展**（`src/lib/missionConditionNames.ts`）：
- `ActivityStageDetail` 扩展字段：`activityName`（ActivityTable.name）、`stageName`（MultiStageTable.stageList.name，优先）、`missionId`、`sortId`、`timeId`、`activityRewardId`（StageToActivityTable.rewardId）、`unlockTexts[]`（ConditionTable.desc i18n，`blockShow=true` 跳过）、`relatedQuestText`（DungeonFightingStageTable.questId → questDesc map）、`dungeonDetail`（经 §9.4 `dungeonDetail()`，`DungeonFightingStageTable.levelId` 非空时）。
- 保留现有 `stageDetail(stageId)` 签名，内部扩展返回；缺失表/未命中字段全部可空，组件兜底。

**数据接入**（`src/hooks/useData.ts` `getMissionConditionResolver`）：
- 新增并行加载：`ActivityConditionalMultiStageTable` + i18n、`ActivityConditionalMultiStageConditionTable` + i18n、`ActivityTable` + i18n、`DungeonTable` + i18n、`EnemyTemplateDisplayInfoTable` + i18n、`RewardTable`（已有）+ i18n。
- `stageDetail(stageId)` 拼接 5+3 表返回 `ActivityStageDetail`；内部复用 `dungeonDetail()` 生成 dungeon 段；所有表 `getCachedData` 缓存 + `.catch(() => ({}))` 容错。

**组件**（`src/pages/story/ActivityStagePanel.tsx`）：
- `ObjectiveCondition` 中 `CheckActivityConditionalStageStatus` 类型分支改为渲染 `<ActivityStagePanel stageId={rawStageId} detail={stageDetail(...)} rewardTable={rewardTable} resolveArg={resolveArg} />`（仅当 resolver 提供 `stageDetail`；缺失时回退现有文本行）。
- 面板内容（信息分组展示）：
  - 头部：阶段名（stageName）+ 活动名（activityName）+ 关卡序号（sortId）+ 所属任务（missionId 链接到 `/archive/story/mission/:missionId`）。
  - 解锁条件：`unlockTexts[]`（i18n 文案直出；`blockShow=true` 跳过）。
  - 完成条件：按 `conditionType` 分派渲染（5052→levelName / 18→quest / 19→mission / 其余→参数直出），复用 §8.3 语义。
  - 关联 quest：`relatedQuestText`（同任务 quest 描述）。
  - **活动奖励**：`activityRewardId` 经 `RewardPanel` 渲染（review ③：Activity 侧 rewardId）。
  - **dungeon 区块**：`dungeonDetail` 存在时嵌入 `<DungeonPanel detail={...} rewardTable={...} />`（review ②④：dungeon 内容、图片、dungeon 侧奖励；敌人由 DungeonPanel 委托 `EnemyUnit`）。
- 纯展示组件，无内部数据获取；数据经 props 注入，便于单测。

### 9.6 方案：quest 节点边框（问题②）

`StoryMissionDetail.tsx` `QuestNode` 根容器加边框样式：
- 主路径 quest：`border border-archive-border rounded-md p-3`（背景 `bg-archive-file/40` 区分主路径）。
- 分支 quest：与主路径同款边框（或 `border-archive-gold/20`），保持缩进 + 左侧连接线不变。
- 子节点缩进容器 `ml-3 pl-3 border-l` 保留，形成「外层 quest 卡片 + 内层依赖线」的层级。

### 9.7 方案：依赖线 + 「前置任务」badge（问题③）

`QuestNode` 中 `node.prevQuestIds.length > 0` 的渲染从纯文本 `{'← '}{ids.join(', ')}` 改为：
- 左侧连接线：quest 卡片内左上角垂直连线（`border-l-2 border-archive-gold/40` + 小竖线），与子节点缩进线衔接，形成依赖流向视觉。
- 「前置任务」badge：复用 `Badge` 组件（variant="ghost" 或新增 seal/gold 小号），文案 `t('story.prevQuest')`，后接 mono 的 `prevQuestIds`（保留引用能力）。
- 新增 i18n key `story.prevQuest` 与 dungeon 分组标题 keys（`story.dungeonFirstPass / dungeonCustom / dungeonExtra / dungeonHunter` 等，14 语言，经 `generate-i18n-dicts.ts` 生成）。

### 9.8 测试与验证计划（已实施，2026-08-01）

**实现落点**（commit `ccee9e8`）：
- 纯函数聚合（`src/lib/missionConditionNames.ts`）：`buildEnemySummary` / `buildDungeonDetail` / `buildStageDetail` / `extractParamStrings`，类型 `EnemySummary` / `DungeonDetail` / `DungeonEnemy` / 扩展 `ActivityStageDetail`。
- resolver（`src/hooks/useData.ts` `getMissionConditionResolver`）：新增并行加载 `ActivityConditionalMultiStageTable` / `ActivityConditionalMultiStageConditionTable` / `ActivityTable` / `DungeonTable` / `EnemyTemplateDisplayInfoTable` / `RewardTable`（+ i18n）；`MissionConditionResolver` 新增 `enemySummary` / `dungeonDetail` / `rewardTable`。
- 组件：`EnemyUnit.tsx`（按 `{enemyId, level}` 渲染，props 注入 `EnemySummary`）、`DungeonPanel.tsx`（dungeon 名/desc/levelDesc/featureDesc/图片/敌人/奖励分组，委托 `RewardPanel`）、`ActivityStagePanel.tsx`（阶段名/活动名/所属任务/解锁/关联 quest/活动奖励/dungeon 区块）。
- 接入：`ObjectiveCondition` 对 `CheckActivityConditionalStageStatus` 且 resolver 提供 `stageDetail` 时渲染 `<ActivityStagePanel>`（缺失回退原文本行）；`StoryMissionDetail` `QuestNode` 加边框 + 「前置任务」badge + 左侧依赖线（`border-l-2`）。
- i18n 新增 11 个 key（`story.prevQuest` / `stageMission` / `stageUnlock` / `stageRelatedQuest` / `stageRewards` / `enemyLv` / `dungeonSort` / `dungeonStamina` / `dungeonEnemies` / `dungeonFirstPass` / `dungeonCustom` / `dungeonExtra` / `dungeonHunter`，14 语言），`verify-i18n` PASSED。

**单测**（`missionConditionNames.test.ts` 16 例）：
- `extractParamStrings`：包装参数解包（string/int 列表）与原始值兜底。
- `buildEnemySummary`：名称/昵称/图标解析、缺失兜底、templateId 空回退。
- `buildDungeonDetail`：索引对齐敌人等级、奖励分组、dungeon 缺失返回 null、超长 enemyIds 截断。
- `buildStageDetail`：5+3 表拼接、`blockShow` 跳过、无 levelId 时 dungeonDetail 为 null、stage 缺失 null。

**E2E**（`story-chronicle.spec.ts` 19 例）：
- 原「完成活动阶段」断言改为「生存特训」（阶段文本行已升级为面板）。
- 新增「活动阶段渲染为独立面板」：断言「生存特训/活动奖励/敌方单位/Lv./威胁等级/碾骨撕裂牙兽」。
- 新增「quest 节点带边框与前置任务 badge」：断言 `rounded-md p-3` 卡片存在 + 「前置任务」文案。

**全量验证**：
- `npx vitest run`：31 通过 / 1 失败（仅存量 Sidebar 2 例基线失败）。
- `npm run build`：通过（含 tsc）。
- `npm run lint`：通过（含 verify-i18n PASSED）。
- E2E `playwright test src/story-chronicle.spec.ts`：19/19 通过。

### 9.9 风险与待确认

- **`MultiStageTable` activity 名**：`ActivityTable.name`（如「生存特训」）比 `MultiStageTable` 自身更权威，取 `ActivityTable` 优先。
- **`conditionType` 语义沿用数据归纳**：5052/5902 已验证，18/19/5031 等复用 §8.6 风险，面板内不臆测语义、展示原始参数兜底。
- **`blockShow=true` 的解锁条件**：游戏内隐藏（引导条件），面板跳过展示，避免剧透/信息噪音。
- **关联 quest 文案长度**：`relatedQuestText` 可能为长文本（整个目标描述），面板内截断或单行省略号展示。
- **dungeon 奖励字段语义**：`rewardId`（30 个 dungeon 有）与 `firstPassRewardId`（200）/`customRewardId`/`extraRewardId`/`hunterModeRewardId` 的具体发放时机需游戏内校准；面板内按字段名分组展示（首通/定制/额外/猎手模式），不臆测数字。
- **dungeon 图片缺失**：`dungeonPicPath` 空或图片 404 时 `<img>` 需 `onError` 隐藏回退，不影响文字内容。
- **`enemyIds` 与 `enemyLevels` 对齐**：两者均为数组、长度一致（已验证 5/5）；索引错位时仅展示可对齐部分，避免越界。
- **敌人名称/图标缺失**：`EnemyTemplateDisplayInfoTable` 未命中或 `templateId` 空时 `EnemyUnit` 回退显示原始 `enemyId`（mono），图标 `onError` 隐藏。
- **敌人组件复用边界**：`EnemyUnit` 为独立展示组件（props 注入 `enemySummary` + `level`），不感知 dungeon/活动上下文，后续怪物图鉴等其他页面可直接复用。

## 10. 剧情梗概导航数据源修正（任务文件驱动）

**验收反馈（2026-08-01）**：①`/archive/story/recap` 左侧导航未按 `MissionRuntimeAsset` 文件内容生成，出现幽灵任务 `c1m1`（dlg key 解析出但任务文件不存在）；②修正后仅保留有对话场景的任务，导致 `hidden*` 任务缺失。

**根因**：`useStoryRecap` 原以 `DialogSummaryMapTable` 的 dlg key 解析 missionId（185 个）为导航源，其中 9 个（`c1m1/a1m8/f1m4/f1m7/f1m9/f1m18/f1m19/f1m29/e5m0`）无对应任务文件；`hidden*`（60 个）任务在 DialogSummaryMapTable 无对话场景，被「场景驱动」方案排除。

**修复**（commit `9f5d6f7`）：
- 新增纯函数 `buildRecapChaptersFromMissions(missionIds, scenes, missionNameMap)`（`src/lib/adapter.ts`）：以 `MissionRuntimeAsset` 任务列表为权威驱动导航，按 `([a-z]+)\d` 的 `$1` 分组（`a/c/db/dm/e/f/gm/hidden/m/sm`），场景经 dlg 解析后挂接到对应任务下，无场景任务保留在导航。
- `useStoryRecap`：并行加载 `MissionRuntimeList`（复用 `MissionRuntimeList` 缓存 key），`realMissionIds` 作为导航源；场景仅保留 missionId 在任务列表中的（过滤幽灵）；任务名经 TextTable `${id}_name` 解析。
- `StoryRecap.tsx`：`CHAPTER_TYPES` 更新为 10 组；无场景任务右侧显示「暂无剧情文本」占位（新增 `story.noScene` i18n key）。
- 保留 `adaptRecapChapter`（测试兼容）。

**验证**：单测新增 `buildRecapChaptersFromMissions` 2 例（分组/排序/空场景挂接/名称解析）；E2E 更新导航过滤断言（不含 c1m1、含 a1m2 与 hidden）；lint/test/build 通过；E2E 21/21 通过。

### 10.1 二次修订：master-detail 布局 + 路由任务参数

**验收反馈（2026-08-01）**：①左侧列表 group 按 a-z 排序；②单个任务的剧情梗概放入详情页；③右侧直接显示详情页内容而非梗概；④路由体现所选任务（`/archive/story/recap?mission={missionId}`）。

**实现**（commit `6d3f8b5`）：
- `buildRecapChaptersFromMissions`：chapters 按 `chapterType` a-z 排序（原为任务文件插入顺序）。
- 新增 `useMissionScenes(missionId)`（`src/hooks/useData.ts`）：加载 `DialogSummaryMapTable` + `DialogSummaryTable`，解析并过滤该任务的剧情梗概（按 sceneNo/sceneSub 排序）。
- `StoryMissionDetail`：抽取可复用 `MissionDetailContent({ missionId, embedded })`，新增「剧情梗概」section（`story.missionScenes` i18n key，14 语言）；默认导出路由版（`useParams` 读取 missionId）。
- `StoryRecap`：改为 master-detail —— 左侧 a-z 分组导航（选中态 gold 高亮），右侧内嵌 `MissionDetailContent`；点击导航更新 `?mission=`；首次加载默认选中第一个任务并写入路由（replace）；类型筛选保留 `mission` 参数。

**验证**：E2E 新增「点击导航切换任务并更新路由 mission 参数」（22/22 通过）；单测/verify-i18n/lint/test/build 通过（仅存量 Sidebar 2 例基线失败）。

---

## 11. 验收问题（2026-08-02）：对话展开与音频播放

> 本轮受理 6 项验收反馈：①recap 面包屑未翻译；②任务详情 quest 目标内联剧情梗概；③剧情场景可展开完整对话脚本（DialogTextTable）；④endminf 说话行音频 URL 追加 `_f`；⑤无 DialogSummaryMapTable 摘要的对话目标仍可展开；⑥对话音频播放需 HEAD 校验 + 播放列表 + 控制面板。

### 11.0 历史修复回填（§10 之后、本轮之前的中间提交）

以下为 master-detail 布局（§10.1，commit `15a67ae`）之后陆续落地、尚未回填验收文档的修复/增强：

**footer 去掉上边距**（commit `64aad93`）：`src/components/Layout/Footer.tsx` 移除 `mt-16`，消除底部大空隙。

**任务名改用 AllBrief MissionRuntimeAsset**（commit `992ff94`）：quest 详情与列表页任务名改用 `https://endfield-assets.fffdan.com/vfs/JsonData/AllBrief/MissionRuntimeAsset`（980 条，490 条含 missionName）。
- 新增 `fetchMissionBrief()`（`src/lib/api.ts`）、`buildMissionNameMapFromBrief(brief, resolveKey)`（adapter）。
- `getMissionConditionResolver` 的 `mission` arg 优先走 brief 名，回退 `resolveTextKey(\`${id}_name\`)`；`useStoryRecap` 列表名同样走 brief。
- `api.fetchingMissionBrief` i18n 14 语言；单测 +3；E2E 22/22。
- 数据考证：`e11m7d5 → e11m7_name → 归途`；`hidden58` 的 missionName 为空 `{}`（回退原始 id）。

**任务类型/重要性徽标 + 关卡大地图名 + 章节排序**（commit `03cd8b1`）：
- `MISSION_VIEW_TYPE_CFG`（0=main_new/1=discovery/2=side/3=activity/4=other，对照旧本地 MissionTypeInfoTable.json 推导）与 `MISSION_IMPORTANCE_CFG`（0/1/2 → importance_1/2/3）。
- `MissionRuntime` 新增 `importance`（`overrideImportance || baseMissionImportance || 0`，注意必须 `||` 而非 `??` 才能对 0 回退）；resolver 新增 `missionTypeName`/`missionImportanceName`。
- 详情页徽标：任务类型（gold）+ 重要性（ghost）+ wrapper。
- 关卡展示：`useLevelInfo` + `resolveLevelMapId`（levelId 本身命中 MapIdTable 优先，否则剥离 `_lv<数字>`）+ `LevelDisplay` 组件，渲染 `story.levelNameFormat`（各语言语序不同，verify-i18n 要求 MX/BR/DE/FR/VN/TH/ID/IT 与 EN 不同）。
- 章节排序 `CHAPTER_ORDER_PRIORITY = { e:0, c:1, gm:2, sm:3, m:4 }`，其余 fallback 10。
- 单测 +5（resolveLevelMapId 3 + importance 1 + 排序 1）；E2E +2（徽标 a1m2=活动任务/重要、关卡 e11m1=武陵·应龙关）24/24。

### 11.1 recap 面包屑未翻译

**问题描述**：`/archive/story/recap` 面包屑中「recap」显示为原始路径段而非翻译文本。

**根因分析**：`Breadcrumb.tsx` 对 3 段路径 `/archive/story/recap` 的 `detailId='recap'` 走 `DetailLabel` 分支返回原始 id，未走 `listLabel`（`breadcrumb.recap` 已有 CN「剧情梗概」等 14 语言翻译）。

**修复方案**（commit `b2c1773`）：3 段路径优先查 `listLabel[detailId]`，命中即用翻译文本渲染 Badge；未命中才走 `DetailLabel`。

**涉及文件**：`src/components/Layout/Breadcrumb.tsx`；E2E 更新 `tests/e2e/src/story-chronicle.spec.ts` 面包屑断言（main 区域「剧情纪事」+「剧情梗概」）。

**验证结果**：E2E 24/24 通过。

### 11.2 quest 对话目标内联渲染剧情梗概

**问题描述**：任务详情 quest 目标为「完成对话 dlg_e1m3_6」时，需将该 dialogId 对应的剧情梗概（DialogSummaryMapTable → DialogSummaryTable）内联渲染在目标下。

**数据考证**：`DialogSummaryMapTable['dlg_e1m3_6'] = 'summary_e1m3_6_001'`，经 DialogSummaryTable i18n 解析出梗概文本（如「晶体外壳需要大量源矿。安德烈为你准备了自动采矿设备……」）；`e1m3_q#17` 的 `objectiveList[0].condition` 为 `CheckTalkOptionFinish`（`_dialogId=dlg_e1m3_6`）。

**修复方案**（commit `05a9ea5`）：
- `getMissionConditionResolver` 新增并行加载 `DialogSummaryMapTable` / `DialogSummaryTable`（+i18n），`MissionConditionResolver` 新增 `dialogScene(dialogId): StoryRecapScene | null`。
- `ObjectiveCondition` 对 `CheckTalkOptionFinish` 条件调 `dialogScene` 渲染梗概场景（code + 文本，`data-testid="quest-recap-scene"`）；`StoryMissionDetail` 的 `QuestNode` 透传 `dialogScene`。

**验证结果**：E2E 新增「对话型目标渲染对应剧情梗概」断言（`E1·M3·场06` + 便携源石矿机）25/25 通过。

### 11.3 剧情场景可展开完整对话脚本

**问题描述**：任务详情剧情梗概每个场景需可展开，渲染 DialogTextTable 中以该 dlgKey 为前缀的全部台词（actorName 说话人 + audioOverride 音频按钮 + dialogText 富文本）。

**数据考证**：DialogTextTable 以 `dlg_{chapter}{lv}m{mission}_{scene}` 为前缀 + `_{NNN}` 为台词序号（如 `dlg_e1m3_6_001`~`dlg_e1m3_6_005`）；字段 `actorName{id,text}`、`actorNameId`、`audioOverride`、`dialogText{id,text}`、`emotionType`；i18n 大整数 id 依赖 `api.ts safeParse` 转字符串保精度后 `resolveI18n` 命中。

**修复方案**（commit `a6366cb`）：
- 类型 `DialogLine`（types.ts）；adapter `adaptDialogLine` / `buildDialogLines`（按 `${dlgKey}_` 前缀过滤 + localeCompare 排序）。
- `useDialogScript(dlgKey)`（useData.ts）：并行加载 DialogTextTable + i18n。
- `DialogScript` 组件（`src/pages/story/DialogScript.tsx`）：渲染说话人（actorName）+ 播放按钮（audioOverride 存在时）+ 台词（RichText）。
- `StoryMissionDetail` 场景块新增「展开对话/收起对话」切换（`SceneBlock`，i18n `story.expandDialog`/`story.collapseDialog` 14 语言）。

**验证结果**：单测 +5（adaptDialogLine 3 + buildDialogLines 2）；E2E +1（e1m3 场06 展开 → 佩丽卡/安德烈台词/播放按钮）26/26 通过。

### 11.4 endminf 说话行 audioOverride 追加 `_f` 后缀

**问题描述**：获得 audioOverride 时，若 `actorNameId=endminf`，需在当前 audioOverride 后追加 `_f`。

**数据考证**：DialogTextTable 全量 477 条 `endminf` 行的 `audioOverride`（如 `au_dlg_c16m3_2_011`）无后缀 URL 404，追加 `_f`（`au_dlg_c16m3_2_011_f`）后 200；`endminm` 0 条。

**修复方案**（commit `9c9c44b`）：`adaptDialogLine` 检测 `actorNameId==='endminf'` 时 `audioOverride += '_f'`。

**验证结果**：单测 +2（endminf 追加 / 其他角色不变）；E2E +1（e11m1 场01 endminf 行点击播放请求 `_f` URL）28/28 通过。

### 11.5 无 DialogSummaryMapTable 摘要的对话目标仍可展开

**问题描述**：`dlg_gm01m23_2` 在 DialogTextTable 有台词（13 行）但不在 DialogSummaryMapTable（无摘要），`dialogScene` 返回 null 导致目标块不渲染、无展开按钮。

**修复方案**（commit `96ca0c1`）：`ObjectiveCondition` 对 `CheckTalkOptionFinish` 只要有 `dialogId` 就渲染对话块（含「展开对话」按钮）；摘要场景（`scene.code`/`scene.text`）有则显示，无则只显示 dialogId + 展开按钮；展开后 DialogScript 从 DialogTextTable 加载台词。

**验证结果**：E2E +1（gm01m23 展开 dlg_gm01m23_2_001）29/29 通过。

### 11.6 对话音频播放优化（本轮）

**验收反馈**：①展开对话时默认不显示播放按钮，对接口 HEAD 一发，200 才显示；②点击播放时将该条之后的音频加入播放列表，播放完成后自动播放后续一条；③播放控制面板需要显示（未设计则设计）；④历史问题与本次问题更新到验收文档。

**设计**：
- `checkAudioUrl(url)`（`src/lib/audio.ts`）：HEAD 请求 + 模块级缓存，`ok` 返回 200 才显示按钮。
- `dialogAudio.ts` 队列控制器：模块级单例（Audio 元素 + `useSyncExternalStore`），`playFrom(tracks, startIndex)` 从点击行起建立队列，`ended`/`error` 自动推进下一条，`togglePlay`/`playNext`/`playPrev`/`stop`。
- `DialogScript`：`useAudioAvailability` 对每行 audioOverride 发 HEAD，200 才渲染 `LinePlayButton`（`data-testid="line-play-{key}"`）；点击 `playFrom` 建立从该行起的播放队列。
- `DialogPlayerBar` 控制面板（`src/pages/story/DialogPlayerBar.tsx`）：当前说话人/行号/台词、上一条/播放暂停/下一条/停止、进度条与时间，仅在队列活动时显示（`data-testid="dialog-player-bar"`）。
- i18n 新增 `story.audioNowPlaying`（14 语言）。

**实现落点**（本次 commit，待提交）：
- `src/lib/audio.ts` — `checkAudioUrl` + `clearAudioUrlCache`
- `src/lib/dialogAudio.ts`（新建）— 队列控制器
- `src/pages/story/DialogScript.tsx` — HEAD 校验 + 队列播放
- `src/pages/story/DialogPlayerBar.tsx`（新建）— 控制面板
- `scripts/i18n-custom.json` + `src/i18n/dicts/*` — `story.audioNowPlaying`

**验证结果**：
- ✅ 单测 `audio.test.ts` +4（HEAD ok/not-ok/throw/cache）、`dialogAudio.test.ts` 新建 5 例（playFrom 队列/自动推进/末条停止/toggle/前后切换）
- ✅ E2E +2：HEAD 404 不显示按钮、点击播放显示控制面板 + Next 切换下一条；全量 31/31 通过
- ✅ lint（verify-i18n PASSED）/ build / tsc 通过；vitest 全量仅存量 Sidebar 2 例基线失败

---

## 12. 修复总览（§11 补充）

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|------|------|------|-------------|
| 11.1 | recap 面包屑未翻译 | 3 段路径 detailId 走 DetailLabel 返回原始 id | ✅ 已修复 | `b2c1773` |
| 11.2 | quest 对话目标未内联剧情梗概 | 未接 DialogSummaryMapTable → DialogSummaryTable | ✅ 已修复 | `05a9ea5` |
| 11.3 | 剧情场景不能展开完整对话 | 未接入 DialogTextTable 台词 | ✅ 已修复 | `a6366cb` |
| 11.4 | endminf 音频 URL 404 | 未追加 `_f` 后缀 | ✅ 已修复 | `9c9c44b` |
| 11.5 | 无摘要对话目标无展开按钮 | `dialogScene` 为 null 整块不渲染 | ✅ 已修复 | `96ca0c1` |
| 11.6 | 音频播放需 HEAD 校验 + 队列 + 控制面板 | 功能未设计 | ✅ 已修复 | 本次提交 |
