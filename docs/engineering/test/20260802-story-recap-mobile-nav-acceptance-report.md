---
description: 剧情梗概移动端导航验收问题记录与修复方案（剧情切换与筛选合并置顶）
type: Permanent
---

# 剧情梗概移动端导航验收报告

> **状态**: 修复完成，待提交与二次验收。
> 本轮受理 1 项验收反馈：移动端剧情切换（任务导航下拉）需与筛选合并放于 sticky 顶部，滚动时保持可切换（已修复）。
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

## 3. 修复总览

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|------|------|------|-------------|
| 2.1 | 移动端剧情切换与筛选分离，滚动后无法在顶部切换 | 任务导航下拉在独立非 sticky 块中，与筛选头部分离 | ✅ 已修复（并入 sticky 头部） | `1651fb8` |
| 2.2 | 相关 E2E 用例定位失败（存量） | 双 `select` 下选项误取与严格模式冲突 | ✅ 已修复（限定作用域 / `.first()`） | `1651fb8` |

## 4. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ 构建成功（含 tsc） |
| E2E `responsive.spec.ts` + `story-chronicle.spec.ts` | ✅ 44/44 passed（含此前存量失败的 recap 5 例与移动端任务导航 1 例） |

## 5. 经验总结

- **移动端导航控件必须随主操作区一同置顶**：任何承担「切换」职责的控件（下拉/页签）应并入 sticky 头部的同一容器，滚动时保持可达；独立散落在内容区会随内容滚出视口，破坏连续阅读体验。
- **响应式下同一控件移动/桌面形态可并存**：桌面端由左侧章节导航承担切换，移动端由头部任务导航下拉承担，通过 `md:hidden` / `hidden md:block` 按断点切换形态，避免两套交互并存。
- **E2E 断言需限定控件作用域**：页面存在多个同类型控件（如两个 `select`）时，定位必须限定到目标控件内部（`selectOption` 枚举、`locator('select')` 均需 `.first()` 或嵌套作用域），否则严格模式或选项误取导致存量失败。
