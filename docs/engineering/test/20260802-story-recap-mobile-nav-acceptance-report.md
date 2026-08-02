---
description: 剧情梗概移动端导航验收问题记录与修复方案（剧情切换与筛选合并置顶）
type: Permanent
---

# 剧情梗概移动端导航验收报告

> **状态**: 修复完成，待提交与二次验收。
> 本轮受理 3 项验收反馈：①移动端剧情切换（任务导航下拉）需与筛选合并放于 sticky 顶部，滚动时保持可切换（已修复）；②Baker 聊天表情尺寸被压缩至 4×4 且短文本异常换行（已修复，同根因）；③切换 topic 时聊天滚动位置未重置到顶部（已修复）。
>
> 历史验收报告已归档至 `docs/engineering/test/archived/`（工厂系统 `20260726-*`、剧情纪事 `20260731-*`）。

**关联 PRD**: [[20260730-story-chronicle|剧情纪事]]
**关联技术方案**: [[20260730-story-chronicle|剧情纪事 - 技术提案]]
**关联实现方案**: [[20260731-story-chronicle-implementation|剧情纪事 - 实现方案]]
**关联分支**: `fix/mobile-story-recap-nav`
**验收日期**: 2026-08-02

---

## 1. 需求概述

剧情梗概页 `/archive/story/recap` 需在移动端提供剧情切换能力：

1. **剧情切换与筛选放在一块**：章节类型筛选（`type=` 下拉）与任务导航下拉合并展示，移动端不拆分两处。
2. **往下滑动时顶部可切换**：合并后的控制区在页面滚动时始终固定在视口顶部（sticky），用户阅读长卷时无需回滚即可切换剧情。

## 2. 验收问题清单

### 2.1 移动端剧情切换与筛选分离，滚动后无法在顶部切换

**问题描述**：移动端界面中，剧情切换（任务导航下拉）与筛选（章节类型下拉）分离展示——类型筛选位于 `sticky top-0` 头部，任务导航下拉在头部下方的内容区，向下滑动时任务导航随内容滚出视口，用户需回滚到顶部才能切换剧情。

**根因分析**：`StoryRecap.tsx` 将任务导航下拉放在独立的 `md:hidden` `div` 中（非 sticky），与 sticky 的筛选头部分离。此前提交 `36ac2f6` 为解决移动端左侧导航不可见问题而新增任务导航下拉，但未将其并入 sticky 头部。

**修复方案**（`src/pages/story/StoryRecap.tsx`）：
1. 任务导航下拉移入 sticky 顶部头部（`sticky top-0 z-10`），与类型筛选并列：头部容器由单行 `flex items-center` 改为 `flex flex-col gap-2 md:flex-row md:items-center md:gap-4`——移动端纵向堆叠两行（筛选 + 任务导航），桌面端保持单行不变。
2. 移动端类型筛选改为整行宽度（`w-full md:w-auto`）；任务导航 `label` 标记 `md:hidden`（桌面端隐藏，由左侧章节导航承担切换）。
3. 删除原头部下方独立的移动端任务导航块；剧透提示保留在 sticky 头部内，移动端/桌面端均可见。

**涉及文件**：
- `src/pages/story/StoryRecap.tsx`

**验证结果**：
- ✅ 移动端（375px）：sticky 头部同时含 2 个 `select`（类型筛选 + 任务导航）与剧透提示；滚动 600px 后头部仍 `position: sticky` 且 `getBoundingClientRect().top === 0`，可在顶部随时切换。
- ✅ 桌面端（1280px）：sticky 头部仅类型筛选可见，任务导航隐藏（`md:hidden`），左侧章节导航正常切换；侧栏 `nav` 任务按钮可见。
- ✅ `npm run lint`：0 errors；`npm run build`：构建成功（含 tsc）。

### 2.2 相关 E2E 测试修正（随本轮修复）

**问题描述**：任务导航下拉合并进 sticky 头部后，页面存在两个 `select`，既有 E2E 用例出现两类定位错误：

1. `responsive.spec.ts` 移动端用例通过 `page.locator('select option')` 取全部下拉选项，把类型筛选的值（如 `a`、`c`）误当作任务导航选项，`selectOption` 报「did not find some options」超时。
2. `story-chronicle.spec.ts` 5 例 recap 用例用 `page.locator('select')` 定位类型筛选，严格模式（strict mode）下匹配到 2 个元素而失败。

**修复方案**：
1. `responsive.spec.ts`：选项枚举限定到任务导航下拉内部（`missionNav.locator('option')`），排除类型筛选选项。
2. `story-chronicle.spec.ts`：类型筛选定位改为 `page.locator('select').first()`，避免严格模式冲突。

**涉及文件**：
- `tests/e2e/src/responsive.spec.ts`
- `tests/e2e/src/story-chronicle.spec.ts`

**验证结果**：
- ✅ `responsive.spec.ts`：移动端任务导航下拉可切换任务并更新路由（1/1 passed，此前存量失败）。
- ✅ `story-chronicle.spec.ts`：recap 相关 8 例全数通过（含此前存量的 5 例失败）。

### 2.3 Baker 聊天表情被压缩至 4×4 且短文本异常换行

**问题描述**：`/archive/baker?chat=sns_chr_0024_deepfin&topic=topic_chr_0024_deepfin_1` 中：

1. 干员回复的纯表情消息（如 `<image="sns_emoji_011">`）渲染为 4×4 像素，肉眼几乎不可见。
2. 短文本「你的钓鳞技术真不错。」（9 字符 ≈ 144px）在页面宽度充足时仍被换行为两行（气泡仅 130px）。

**根因分析**（两现象同根因）：
- 气泡宽度约束位置错误。`BakerMessageBubble` 把 `max-w-[70%]` 加在**气泡自身**上，而气泡的父容器是 shrink-to-fit 的 flex 列（`flex flex-col min-w-0`）。`max-width: 70%` 是百分比，需解析父容器宽度，但父容器宽度又由内容（气泡）决定，形成循环依赖 → 浏览器按最小可行值收缩父列（实测 40px）与气泡（28px）。
- 表情消息：气泡 28px 减去 `px-3`（24px）内边距后内容盒仅 4px，RichText 的 `<img>` 受 `max-width: 100%` 钳制被压成 4×4。
- 短文本：气泡被收缩至 130px < 文本自然宽度 144px，触发换行。

**修复方案**：
1. **气泡宽度约束上移**（`src/components/Baker/BakerMessageBubble.tsx`）：`max-w-[70%]` 从气泡移到父 flex 列（`flex flex-col min-w-0 max-w-[70%]`，非本人消息加 `items-start`、本人消息保留 `items-end`）；气泡自身改 `w-fit`（`width: fit-content`），按内容自适应且不超父列上限。
2. **表情尺寸对齐选项**（`src/lib/richText.tsx` + `BakerMessageBubble.tsx`）：`RichText` 新增可选 `imageSize` prop（默认 `1rem`），Baker 文本消息传 `2rem`（32px），与 `BakerOptionGroup` 选项表情（`w-8 h-8`）尺寸一致。

**涉及文件**：
- `src/components/Baker/BakerMessageBubble.tsx`
- `src/lib/richText.tsx`

**验证结果**：
- ✅ 表情消息 `sns_emoji_011` 由 4×4 → 32×32（`width: 2rem`），与选项表情一致。
- ✅ 短文本「你的钓鳞技术真不错。」单行展示（气泡 186px，span 高度 24px 单行）。
- ✅ 图片消息（contentType 2，`max-w-xs` 320×180）不受影响。
- ✅ E2E `story-chronicle.spec.ts` Baker 相关 16 例全数通过；lint / build 通过。

### 2.4 切换 topic 时聊天滚动位置未重置到顶部

**问题描述**：Baker 聊天面板在滚动到中后部后切换 topic，滚动位置保持原值，用户看到的是新 topic 的中部而非开头。

**根因分析**：`BakerChatPanel` 的滚动容器（`overflow-y-auto`）由组件内部持有，无外部 ref；topic 切换仅更新 `beats`，滚动位置不随内容变化而重置。

**修复方案**（`src/components/Baker/BakerChatPanel.tsx` + `src/pages/baker/BakerTerminal.tsx`）：
1. `BakerChatPanel` 新增可选 `topicId` prop 与 `scrollRef`。
2. `useEffect(() => scrollRef.current?.scrollTo({ top: 0 }), [topicId])`：topic 变化时重置滚动到顶部。
3. `BakerTerminal` 传入 `topicId={activeTopic?.topicId}`。

**涉及文件**：
- `src/components/Baker/BakerChatPanel.tsx`
- `src/pages/baker/BakerTerminal.tsx`

**验证结果**：
- ✅ E2E 新增「切换 topic 后滚动位置重置到顶部」：面板 `scrollTop` 200 → 切换 topic → `scrollTop === 0`。
- ✅ E2E Baker 全量 12/12 passed；lint / build 通过。

## 3. 修复总览

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|------|------|------|-------------|
| 2.1 | 移动端剧情切换与筛选分离，滚动后无法在顶部切换 | 任务导航下拉在独立非 sticky 块中，与筛选头部分离 | ✅ 已修复（并入 sticky 头部） | `1651fb8` |
| 2.2 | 相关 E2E 用例定位失败（存量） | 双 `select` 下选项误取与严格模式冲突 | ✅ 已修复（限定作用域 / `.first()`） | `1651fb8` |
| 2.3 | Baker 表情 4×4 + 短文本异常换行 | 气泡 `max-w-[70%]` 百分比依赖 shrink-to-fit 父列，循环收缩 | ✅ 已修复（约束上移 + `w-fit` + 表情 2rem） | `6bdd5f1` |
| 2.4 | 切换 topic 时滚动位置未重置 | 滚动容器无外部控制，内容变化不重置滚动 | ✅ 已修复（`topicId` 变化 `scrollTo(top:0)`） | `b329f3e` |

## 4. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ 构建成功（含 tsc） |
| E2E `responsive.spec.ts` + `story-chronicle.spec.ts` | ✅ 44+1 passed（含新增 topic 滚动重置用例） |

## 5. 经验总结

- **移动端导航控件必须随主操作区一同置顶**：任何承担「切换」职责的控件（下拉/页签）应并入 sticky 头部的同一容器，滚动时保持可达；独立散落在内容区会随内容滚出视口，破坏连续阅读体验。
- **响应式下同一控件移动/桌面形态可并存**：桌面端由左侧章节导航承担切换，移动端由头部任务导航下拉承担，通过 `md:hidden` / `hidden md:block` 按断点切换形态，避免两套交互并存。
- **E2E 断言需限定控件作用域**：页面存在多个同类型控件（如两个 `select`）时，定位必须限定到目标控件内部（`selectOption` 枚举、`locator('select')` 均需 `.first()` 或嵌套作用域），否则严格模式或选项误取导致存量失败。
- **百分比宽度约束不可放在 shrink-to-fit 容器内部**：`max-width: 70%` 这类百分比解析依赖父容器宽度，若父容器宽度又由子内容决定则形成循环依赖，浏览器会收缩到最小可行值。约束应放在有确定宽度的 flex 项（列）上，子元素用 `w-fit` 自适应。
