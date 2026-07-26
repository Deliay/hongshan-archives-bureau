---
description: 活动档案模块技术方案：甘特图编年视图、类型与状态筛选、活动详情浮窗
type: Permanent
---

# 活动档案技术方案

## 1. 概述

新增「活动档案」模块：甘特图展示全部游戏活动的排期，支持按类型大类与状态筛选，点击活动弹出详情浮窗。对应产品文档 [[20260726-activity-archive|活动档案]]。

数据来源（均为线上已验证）：

- `ActivityTable` — 活动主表，当前 84 条
- `TimeRangeTable` — 活动时间表，通过 `ActivityData.timeId` 直接关联
- `ActivityTagTable` — 活动标签表，25 个标签

不引入任何新依赖（无图表库、无日期库），甘特图自绘，时间解析用原生 `Date`。

## 2. 范围

**做**：活动编年页（`/archive/activities`）、甘特图、类型/状态筛选、活动详情浮窗（含固定/随机奖励渲染，复用 RewardPanel）、侧边栏入口、i18n（14 语言）、数据映射文档回填。

**不做**：活动子玩法详情（签到奖励逐日列表、阶段关卡等）、活动搜索、分享/深链接到单个活动。

## 3. 数据调研结果

### 3.1 ActivityTable（主表）

`GET /table/ActivityTable/all`，`Record<string, ActivityRaw>`。样本（`activity_checkin_laevat`）：

```json
{
  "id": "activity_checkin_laevat",
  "name": { "id": -5970781935621769250, "text": "" },
  "desc": { "id": 3529041499708277682, "text": "" },
  "type": 2,
  "timeId": "time_special_1_0_1",
  "tagIds": ["activity_tag_checkin_time"],
  "tabImg": "bg_activity_tab_char_sign_laevat",
  "tabImgColor": "#ea0235",
  "themeColor": "",
  "sortId": 8300,
  "rewardId": "",
  "bgImg": "",
  "conditions": [],
  "detailJumpId": "",
  "instructionId": "instru_checkin_laevat"
}
```

要点与陷阱：

- `timeId` 字段**直接给出** TimeRangeTable 的 key：当前 84 条数据全部命中，无需 TianShiTools 的启发式多模式猜测（保留其规则仅作参考）。`timeId` 为空或表内查不到时，该活动视为「无时间信息」。
- `type` 为开放枚举：当前实测出现 31 种值（1,2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18,19,25,26,27,28,29,30,31,40,41,42,43,44,45），随版本增长。**禁止**用封闭枚举硬编码，必须走「大类归并 + 其他兜底」。
- `name`/`desc` 为 i18n 引用 `{id, text}`，`text` 恒为空串，必须用 `String(id)` 查 **ActivityTable 自己的** i18n 字典（64 位 ID 陷阱，`safeParse` 已转字符串）。
- `tabImg`/`bgImg` 是资源名，图片 URL：
  `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/activity/{tabImg}.png`
- 全量 84 条均非空 `timeId` 与 `tabImg`，但仍按可空防御。

### 3.2 TimeRangeTable（时间表）

`GET /table/TimeRangeTable/{timeId}`：

```json
{
  "timeRangeList": [
    { "openTime": "2025/12/9 4:00:00", "closeTime": "2026/2/7 12:00:00" }
  ]
}
```

要点与陷阱：

- 时间格式为字符串 `"yyyy/M/d H:mm:ss"`，**UTC+8**，非时间戳。月/日/时不补零，需手写解析（正则提取数字后按 UTC+8 构造 epoch：`Date.UTC(y, m-1, d, H-8, M, S)`），禁止 `new Date(str)`（浏览器解析不可靠且时区错误）。
- `closeTime` 为空字符串 = 常驻活动。
- `timeRangeList` 可有多个时段，且实测存在**重复时段**（同一条目出现 3 次相同区间），适配时必须去重。
- 一次性拉 `/table/TimeRangeTable/all`（285 keys，体积小）避免 N+1。

### 3.3 ActivityTagTable（标签表）

`GET /table/ActivityTagTable/all`，条目形如 `{ "tagId": "activity_tag_checkin_time", "name": { "id": "...", "text": "" } }`。`name` 查 ActivityTagTable 自己的 i18n 字典。仅用于详情浮窗展示，不用于筛选。

### 3.4 类型大类归并

基于实测 type 值的产品化归并（配置在 `src/data/constants.ts`，新增 type 自动落入 `other`）：

| 大类 | i18n key | 包含 type |
|------|----------|-----------|
| 签到 | `activity.groupCheckin` | 2 |
| 挑战 | `activity.groupChallenge` | 7, 8, 17 |
| 角色试用 | `activity.groupTrial` | 9 |
| 福利奖励 | `activity.groupWelfare` | 1, 3, 5, 16 |
| 回流 | `activity.groupReflow` | 11 |
| 引导 | `activity.groupGuide` | 13 |
| 其他 | `activity.groupOther` | 其余全部（兜底） |

### 3.5 状态判定

对每个活动取去重后的时段列表，按优先级判定（当前时间 `now`）：

1. **常驻 `permanent`**：任一时段 `closeTime` 为空（无结束时间即为常驻，不论是否已开启）
2. **进行中 `ongoing`**：任一时段 `openTime <= now < closeTime`
3. **未开始 `upcoming`**：存在 `openTime > now` 的时段
4. **已结束 `expired`**：所有时段 `closeTime <= now`
5. 无时间信息：`unknown`，不进入甘特图

## 4. 类型定义（`src/lib/types.ts`）

```ts
export type ActivityGroup = 'checkin' | 'challenge' | 'trial' | 'welfare' | 'reflow' | 'guide' | 'other'
export type ActivityStatus = 'ongoing' | 'permanent' | 'upcoming' | 'expired'

export interface ActivityTimeRange {
  openTime: number        // epoch ms (UTC+8 解析后)
  closeTime: number | null // null = 常驻
}

export interface Activity {
  id: string
  name: string
  desc: string
  type: number
  group: ActivityGroup
  status: ActivityStatus
  timeRanges: ActivityTimeRange[]  // 去重、按 openTime 升序
  tags: string[]                   // 已解析的标签名
  tabImg: string                   // 完整图片 URL
  tabImgColor: string
  sortId: number
}
```

## 5. 数据获取

### 5.1 适配器（`src/lib/adapter.ts`）

新增：

- `parseActivityTime(raw: string): number | null` — 正则 `/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/` 提取后 `Date.UTC(y, m-1, d, H-8, M, S)`；空串/不匹配返回 `null`。纯函数，便于单测。
- `adaptActivity(raw, timeRaw, i18nMap, tagNameMap): Activity` — 统一适配模式：解构原始字段 → `resolveI18n` 解析 name/desc → 时段去重排序 → 计算 group（查 `ACTIVITY_TYPE_GROUPS`）与 status。
- `getActivityGroup(type: number): ActivityGroup` 与 `getActivityStatus(ranges, now): ActivityStatus | 'unknown'` 导出为纯函数，便于单测。

### 5.2 Hook（`src/hooks/useData.ts`）

新增 `useActivities()`：

```ts
const [activitiesRaw, timeRangesRaw, tagsRaw, activityI18n, tagI18n] = await Promise.all([
  getCachedData('ActivityTable', () => fetchTableAll('ActivityTable')),
  getCachedData('TimeRangeTable', () => fetchTableAll('TimeRangeTable')),
  getCachedData('ActivityTagTable', () => fetchTableAll('ActivityTagTable')),
  getTableI18nDict('ActivityTable', locale),
  getTableI18nDict('ActivityTagTable', locale),
])
```

随后构建 tagId → 名称 map，逐条 `adaptActivity`。遵循既有规范：每表独立字典、并行获取、可选表 `.catch(() => ({}))` 容错（TimeRangeTable/ActivityTagTable 失败时降级为无时间与无标签，不阻塞主表展示）。

## 6. 新组件

目录 `src/components/Activities/`，视觉沿用档案风格（`border-archive-border bg-archive-file`，金色 accent）。

### 6.1 `ActivityGantt.tsx`

```
┌────────────┬──────────────── 时间轴(横向滚动) ────────────────┐
│ 筛选: 类型[▾] 状态[☑进行中 ☑常驻 ☑未开始 ☐已结束]              │
├────────────┼── 2025/12 ──┬── 2026/1 ──┬── 2026/2 ──┬─────────┤
│ 活动名      │  ▂▂▂▂▂▂     │            │            │  ← bar   │
│ 活动名      │        ▂▂▂▂▂▂▂▂▂▂▶       │            │  ← 常驻   │
│ 活动名      │             │  ▂▂▂▂      │            │          │
│             │             │     ▏今日线│            │          │
└────────────┴─────────────┴────────────┴────────────┴─────────┘
```

- 左侧固定名称列（约 180px，`truncate`），右侧 `overflow-x-auto` 时间轴区；行高约 36px，hover 整行高亮。
- 刻度：按月分格，每月一格（约 120px），月初刻度线 + 月份标签（`toLocaleDateString` 按 UI locale）。
- bar：`absolute` 定位，`left/width` 按 `(time - axisStart) / (axisEnd - axisStart)` 百分比换算；常驻 bar 右端渐变淡出 + 箭头表示开放末端；`expired` bar 降低不透明度；颜色按 group 映射（常量配置，签到=青、挑战=赤、试用=紫、福利=金、回流=蓝、引导=绿、其他=灰，与现有色板协调）。
- 多时段：同一行渲染多个 bar。
- 今日线：红色/金色竖线贯穿时间轴区，`top: 0; bottom: 0`。
- 默认轴范围：取可见活动（筛选后）的 `[min(openTime), max(closeTime ?? now)]` 并向前后各 pad 15 天；若包含「进行中/常驻/未开始」，保证今日落在可视区前 1/3 处（初始 scrollLeft 定位到今日）。
- 行排序：状态优先级（未开始 > 进行中 > 常驻 > 已结束）→ openTime（常驻组内倒序，开始得晚的在前）→ `sortId`。

### 6.2 `ActivityFilters.tsx`

- 类型：7 个大类的 chip 多选；状态：4 个状态的 chip 多选。
- 默认勾选：`ongoing / permanent / upcoming`。
- 本地状态 `useState` + 父组件 `useMemo` 过滤（遵循列表页筛选规范）。

### 6.3 `ActivityTooltip.tsx`

复用 `ItemTooltip` 的弹层模式：受控组件，父级 `useState<Activity | null>` 控制；`fixed inset-0 z-50 bg-black/60` overlay + 居中面板 `max-w-lg max-h-[80vh] overflow-y-auto`；`mousedown` 外部点击 + ✕ 关闭。内容：

- `tabImg` 主视觉图（`img` 加载失败时隐藏）
- 名称 + group Badge + status Badge
- 时段列表：每个时段一行 `yyyy/M/d HH:mm ~ yyyy/M/d HH:mm`，常驻显示「常驻」；按 UI locale 格式化
- `desc` 用 `<RichText text={desc}>` 渲染，为空则不显示该区块
- 标签 chips

数据由页面级 `useActivities()` 一次性提供，浮窗为纯展示组件，不自行拉取数据（与 ItemTooltip 不同，避免重复请求 84 条的 join 结果）。

### 6.4 页面 `src/pages/activities/ActivityArchive.tsx`

遵循页面骨架模式：`useI18n()` → `useActivities()` → loading `<PageSkeleton/>` / error `common.loadFailed` / empty `common.empty`；标题行 `font-display text-xl font-bold text-archive-ivory` + `<Badge variant="ghost">{MODULE_CODES.activity}</Badge>`。

## 7. 页面集成

- `src/App.tsx`：`<Route path="activities" element={<ActivityArchive />} />`。
- `src/components/Layout/Sidebar.tsx`：`useNavGroups()` 的 chronicle 分组追加 `{ label: t('nav.activities'), path: '/archive/activities' }`。
- `src/data/archiveMeta.ts`：`MODULE_CODES` 增加 `activity` 项（沿用现有编号风格）。
- `scripts/i18n-custom.json`：新增 `nav.activities` 与 `activity.*`（title、group* ×7、status* ×4、filterType、filterStatus、permanent、detailTime、detailTags、empty 等），全部 14 语言翻译后运行 `node scripts/generate-i18n-dicts.ts`。

## 8. 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/pages/activities/ActivityArchive.tsx` | 活动编年页 |
| 新建 | `src/components/Activities/ActivityGantt.tsx` | 甘特图 |
| 新建 | `src/components/Activities/ActivityFilters.tsx` | 类型/状态筛选 |
| 新建 | `src/components/Activities/ActivityTooltip.tsx` | 活动详情浮窗 |
| 修改 | `src/lib/types.ts` | Activity 相关类型 |
| 修改 | `src/lib/adapter.ts` | parseActivityTime / adaptActivity / group / status |
| 修改 | `src/hooks/useData.ts` | useActivities |
| 修改 | `src/data/constants.ts` | ACTIVITY_TYPE_GROUPS、group 颜色 |
| 修改 | `src/data/archiveMeta.ts` | MODULE_CODES.activity |
| 修改 | `src/App.tsx` | 路由 |
| 修改 | `src/components/Layout/Sidebar.tsx` | 导航入口 |
| 修改 | `scripts/i18n-custom.json` | activity.* keys |
| 生成 | `src/i18n/dicts/*.json` | generate-i18n-dicts.ts 产物 |
| 修改 | `docs/engineering/references/data-mapping-tables.md` | 新增「活动相关」一节 |
| 新建 | `src/lib/__tests__/activity.test.ts` | 时间解析/状态/归并单测 |
| 新建 | `tests/e2e/activities.spec.ts` | E2E |

## 9. 测试策略

- 单元测试：`parseActivityTime`（补零/不补零、空串、UTC+8 正确性）、时段去重、`getActivityStatus` 五分支、`getActivityGroup` 已知 type 与兜底。
- 组件测试：ActivityGantt 给定 mock 数据渲染正确行数、筛选联动、点击 bar 打开浮窗。
- E2E：进入 `/archive/activities` → 甘特图可见 → 切换状态筛选 → 点击活动 → 浮窗出现并关闭。

## 10. 验证方案

1. `node scripts/generate-i18n-dicts.ts`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. `npm run dev` 视觉验证：默认视图、全部筛选组合、常驻/多时段活动、今日线位置、移动端横向滑动

## 11. 验收标准

- 84 个活动全部可展示，时间与 `TimeRangeTable` 一致
- 新 type 出现时不报错，落入「其他」
- 浮窗信息与点击的活动一一对应，富文本正常渲染
- 14 语言无缺失（verify:i18n 通过）

## 相关文档

- [[20260726-activity-archive|活动档案产品文档]]（docs/product/draft）
- [[data-mapping-tables|数据表映射参考]]
- [[data-pitfalls|数据层常见陷阱]]
- [[engineering-spec|工程架构规范]]
