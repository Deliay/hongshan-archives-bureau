---
description: 剧情纪事模块验收问题记录与修复方案（本轮：剧情梗概任务名渲染 + 任务穿透规划）
type: Permanent
---

# 剧情纪事模块验收报告

> **状态**: 修复完成，待提交与二次验收。
> 本轮受理 3 项验收反馈：①剧情梗概任务 id 需渲染 `TextTable` 中的任务名（已修复）；②任务名排版换行（已修复）；③missionId 穿透进入（暂缓，已根据新任务数据源制定重构方案，见 §7）。
>
> **重大数据源更新（2026-07-31）**：验收发现任务权威数据源为 `MissionRuntimeAsset`（任务列表 + 任务详情 json）。已据此完成数据调查，并将「任务目录接入 + 穿透详情 + 分区重构」方案写入 §7，待评审后实施。

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
- ⏳ 提交后回填 commit hash
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
- ⏳ 提交后回填 commit hash
---

### 2.3 missionId 穿透进入（暂缓）

**问题描述**：missionId 需要支持穿透进入。

**处理结论**：与产品确认，先完成任务名渲染（§2.1）与排版修复（§2.2）；穿透详情已实现为独立任务详情页 `/archive/story/mission/:missionId`（展示 MRA 任务 json 内容）+ recap 深链 `?mission=` 滚动与任务名链接，见 §7.2.3 与 §7.5 实施记录。

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
