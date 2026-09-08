---
description: 数据 CDN 自动优选实现方案 — cdn.ts 选路模块、api/adapter/cache 基地址动态化、故障切换与版本重校验
type: Fleeting
---

# 数据 CDN 自动优选 - 实现方案

**对应产品文档**: [[20260908-cdn-auto-selection|数据 CDN 自动优选 PRD]]
**对应技术方案**: [[20260908-cdn-auto-selection|数据 CDN 自动优选技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-09-08
**作者**: MiMoCode
**开发分支**: `feat/cdn-auto-selection`

## 1. 概述

### 1.1 目标

1. 新增 `src/lib/cdn.ts`：三节点列表、`/version` 并发测速、localStorage 24h 选路记忆、故障重探测。
2. 改造 `src/lib/api.ts`：基地址动态化（`getApiBase`/`setApiBase`），`trackFetch` 连续失败计数（阈值 3）触发重探测切换。
3. 改造 `src/lib/adapter.ts`：`ASSET_BASE` 从 `const` 改为 `let` + `setAssetBase()`，约 40 处调用点零改动（live binding）。
4. 改造 `src/lib/cache.ts`：`initCache` 前置 `await resolveCdnBase()`，版本请求走选中节点；节点切换后重置版本状态重新校验。
5. `src/main.tsx`：启动时 fire-and-forget 触发选路，不阻塞渲染。
6. 单元测试覆盖测速选路、记忆过期/降级、故障切换；现有 `cache.test.ts` 适配新逻辑。

### 1.2 范围

- **做**：上述目标全部内容。
- **不做**：用户手动切换节点 UI、缓存策略与适配器逻辑变更、页面组件改动、图片请求失败换节点、第三方依赖、新增 i18n 文案（无新 UI 文本）。

### 1.3 对技术提案的一处调整

提案中 `applyCdnBase` 由 `cdn.ts` 直接调用 `api.ts` 的 `setApiBase` 与 `adapter.ts` 的 `setAssetBase`，而 `api.ts` 又需调用 `cdn.ts` 的 `invalidateCdn`，构成 `api.ts ⇄ cdn.ts` 循环 import。本方案改为**订阅模式**（与项目既有 `dialogAudio.setOnBeforePlay` 回调注册模式一致）：

- `cdn.ts` 不 import `api.ts` / `adapter.ts` / `cache.ts`，只暴露 `onCdnChange(listener)` 订阅接口，保持零下游依赖。
- `api.ts`、`adapter.ts`、`cache.ts` 各自 import `cdn.ts` 并注册监听，在回调里更新自身基地址 / 重置版本状态。

依赖方向单向：`api.ts / adapter.ts / cache.ts → cdn.ts`，无循环。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/cdn.ts` | 节点列表、并发测速、选路记忆、故障重探测、变更订阅 |
| `src/lib/__tests__/cdn.test.ts` | 选路模块单元测试 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/api.ts` | `API_BASE` → `let currentApiBase` + `getApiBase`/`setApiBase`；`MISSION_ASSET_BASE` 改为调用时派生；`trackFetch` 连续失败计数触发 `invalidateCdn` |
| `src/lib/adapter.ts` | `ASSET_BASE` 改 `let` + `setAssetBase()`，注册 CDN 变更监听 |
| `src/lib/cache.ts` | `initCache` 前置选路、版本请求走 `getApiBase()`；CDN 变更时重置 `currentVersion`/`versionPromise` |
| `src/main.tsx` | 启动时调用 `resolveCdnBase()`（fire-and-forget） |
| `src/lib/__tests__/cache.test.ts` | 适配动态基地址与选路前置（mock `cdn.ts`） |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 选路模块

**`src/lib/cdn.ts`**（新建）：

```typescript
export const CDN_LIST: readonly string[] = [
  'https://endfield-assets.fffdan.com',
  'https://cn.endfield.fffdan.com',
  'https://cn2.endfield.fffdan.com',
]

const DEFAULT_BASE = CDN_LIST[0]
const SELECTION_KEY = 'cdn:selected'
const SELECTION_TTL = 24 * 60 * 60 * 1000
const PROBE_TIMEOUT = 3000

interface CdnSelection {
  base: string
  expiresAt: number
}

let currentBase = DEFAULT_BASE
let resolvePromise: Promise<string> | null = null
const listeners = new Set<(base: string) => void>()

export function getCdnBase(): string {
  return currentBase
}

export function onCdnChange(listener: (base: string) => void): void {
  listeners.add(listener)
}

function applyCdnBase(base: string): void {
  currentBase = base
  for (const l of listeners) l(base)
}

function readSelection(): string | null {
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    if (!raw) return null
    const sel = JSON.parse(raw) as CdnSelection
    if (!CDN_LIST.includes(sel.base)) return null
    if (Date.now() >= sel.expiresAt) return null
    return sel.base
  } catch {
    return null
  }
}

function writeSelection(base: string): void {
  try {
    const sel: CdnSelection = { base, expiresAt: Date.now() + SELECTION_TTL }
    localStorage.setItem(SELECTION_KEY, JSON.stringify(sel))
  } catch {
    // localStorage 不可用（隐私模式等）：降级为仅本次会话内存记忆
  }
}

function clearSelection(): void {
  try {
    localStorage.removeItem(SELECTION_KEY)
  } catch {
    // 同上，忽略
  }
}

async function probe(base: string): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT)
  const start = performance.now()
  try {
    const res = await fetch(`${base}/version?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('probe failed')
    await res.text()
    return performance.now() - start
  } finally {
    clearTimeout(timer)
  }
}

async function probeFastest(excludeBase?: string): Promise<string> {
  const results = await Promise.allSettled(CDN_LIST.map(async (base) => ({ base, ms: await probe(base) })))
  const ok = results
    .filter((r): r is PromiseFulfilledResult<{ base: string; ms: number }> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => a.ms - b.ms)
  const preferred = ok.find((r) => r.base !== excludeBase)
  return (preferred ?? ok[0])?.base ?? DEFAULT_BASE
}

export function resolveCdnBase(): Promise<string> {
  if (!resolvePromise) {
    resolvePromise = (async () => {
      const remembered = readSelection()
      const base = remembered ?? (await probeFastest())
      applyCdnBase(base)
      if (!remembered) writeSelection(base)
      return base
    })()
  }
  return resolvePromise
}

export function invalidateCdn(excludeBase: string): void {
  clearSelection()
  resolvePromise = (async () => {
    const base = await probeFastest(excludeBase)
    applyCdnBase(base)
    writeSelection(base)
    return base
  })()
}
```

**要点**：
- 探针 `GET /version?t=<ts>` + `cache: 'no-store'` + `AbortController` 3s 超时；探针请求**不经过** `trackFetch`，不出现在加载提示中。
- 重探测时故障节点仍参与测速，但仅在其余节点全部失败时才可回选（`preferred ?? ok[0]`）。
- 三节点全部探测失败时回退 `DEFAULT_BASE`，后续请求失败由现有加载提示与重试兜底，不无限等待。
- `resolvePromise` 单例保证并发调用只测一次；`invalidateCdn` 重置该单例。
- 测速用 `performance.now()` 计时，避免系统时钟回拨影响排序。
- 生产代码不写注释（上述 `catch` 内注释在实现时删除，此处仅表意）。

### 3.2 api.ts 改造

**`src/lib/api.ts`**：

```typescript
import { invalidateCdn, onCdnChange } from './cdn'

let currentApiBase = 'https://endfield-assets.fffdan.com'
let consecutiveFailures = 0
const FAIL_THRESHOLD = 3

export function getApiBase(): string {
  return currentApiBase
}

onCdnChange((base) => {
  currentApiBase = base
  consecutiveFailures = 0
})

function reportFetchResult(ok: boolean): void {
  if (ok) {
    consecutiveFailures = 0
    return
  }
  consecutiveFailures += 1
  if (consecutiveFailures >= FAIL_THRESHOLD) {
    consecutiveFailures = 0
    invalidateCdn(currentApiBase)
  }
}
```

- 全部 URL 拼接改为 `` `${getApiBase()}/table/${table}` `` 形式（`fetchTableKeys` / `fetchTableAll` / `fetchTableEntry` / `fetchVersion` / `fetchI18nLocales` / `fetchTableDictAll` / `fetchTableDictEntry` / `fetchI18nSearch` / `fetchI18nText`）。
- `MISSION_ASSET_BASE`（api.ts:108，当前模块级求值）删除常量，`fetchMissionList` / `fetchMissionDetail` / `fetchMissionBrief` 内改为调用时 `` `${getApiBase()}/vfs/JsonData` `` 派生。
- `trackFetch` 的 `execute` 内：成功路径调用 `reportFetchResult(true)`，`catch` 分支在 `failLoading` 后调用 `reportFetchResult(false)` 再 `throw`。**不改变**原有错误抛出、加载提示与 `retryHandlers` 行为。
- 切换节点重置失败计数（`onCdnChange` 回调内清零），避免切换后旧计数立刻再次触发重探测。

### 3.3 adapter.ts 改造

**`src/lib/adapter.ts`** — 替换第 5 行：

```typescript
import { onCdnChange } from './cdn'

export let ASSET_BASE = 'https://endfield-assets.fffdan.com/vfs/Bundle/file'

export function setAssetBase(base: string): void {
  ASSET_BASE = `${base}/vfs/Bundle/file`
}

onCdnChange(setAssetBase)
```

调用点全部在调用时以模板字符串求值，live binding 自动生效，无需改动。已知唯一模块级求值点 `Sidebar.tsx` 的 `LANGUAGE_ICON_URL` 固定为默认节点，仅影响一张设置图标，接受此行为（同技术提案结论）。

### 3.4 cache.ts 改造

**`src/lib/cache.ts`**：

```typescript
import { getApiBase } from './api'
import { onCdnChange, resolveCdnBase } from './cdn'

export function initCache(): Promise<string> {
  if (!versionPromise) {
    versionPromise = (async () => {
      await resolveCdnBase()
      const version = await (await fetch(`${getApiBase()}/version`)).text()
      const old = await idbGet<string>('_version')
      if (old != null && old !== version) {
        await idbClear()
        memoryCache.clear()
      }
      await idbSet('_version', version)
      currentVersion = version
      return version
    })()
  }
  return versionPromise
}

onCdnChange(() => {
  currentVersion = null
  versionPromise = null
})
```

**要点**：
- `initCache` 先 `await resolveCdnBase()`，保证版本校验与后续缓存读写都基于最终选中节点；去掉硬编码 URL（cache.ts:105）。
- CDN 切换时重置版本状态：下一次 `getCachedData` 会以新节点重新拉取版本号，版本不同则按现有机制清空缓存，避免跨节点版本短暂不同步导致的脏数据（对应提案风险表第 1 条）。
- 其余缓存逻辑（内存 LRU、IndexedDB、inflight 去重、TTL）一律不动。

### 3.5 启动接入

**`src/main.tsx`**：

```typescript
import { resolveCdnBase } from './lib/cdn'

resolveCdnBase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

fire-and-forget，不阻塞 `createRoot`；数据请求路径上 `initCache` 会 await 选路完成，保证首个业务请求落在最终节点。有有效记忆时选路零网络耗时。

## 4. 实现顺序

### 阶段一：选路模块（第 1 轮提交）

1. `src/lib/cdn.ts` — 新建。
2. `src/lib/__tests__/cdn.test.ts` — 新建测试。
3. 校验：`npx tsc --noEmit && npx vitest run src/lib/__tests__/cdn.test.ts`。

### 阶段二：基地址动态化（第 2 轮提交）

1. `src/lib/api.ts` — `getApiBase`/`onCdnChange` 接入、URL 拼接改造、`MISSION_ASSET_BASE` 调用时派生、失败计数。
2. `src/lib/adapter.ts` — `let ASSET_BASE` + `setAssetBase` + 订阅。
3. `src/lib/cache.ts` — 选路前置、动态版本 URL、CDN 变更重置版本。
4. `src/main.tsx` — 启动触发选路。
5. `src/lib/__tests__/cache.test.ts` — 适配。
6. 校验：`npx tsc --noEmit && npm run lint && npm run test`。

### 阶段三：最终验证（第 3 轮提交，如有修复）

1. `npm run lint && npm run test && npm run build` 全量通过。
2. E2E 回归：`cd tests/e2e && npm run test` 现有用例不受影响。
3. 手工验证（见 5.4）。

## 5. 测试计划

### 5.1 类型检查

- `npx tsc --noEmit` — 无类型错误。

### 5.2 单元测试

**`src/lib/__tests__/cdn.test.ts`**（新建，mock `fetch` 与 `localStorage`，用 `vi.useFakeTimers` 或可控延迟的 mock 模拟节点耗时）：

| 用例 | 断言 |
|------|------|
| 三节点不同延迟 | 选中耗时最短节点，`getApiBase` 方向正确（经 `onCdnChange` 通知） |
| 部分节点失败/超时 | 从成功节点中选最快；失败节点不入选 |
| 全部节点失败 | 回退 `DEFAULT_BASE`，promise 正常 resolve |
| 有效记忆 | 不发起任何探测请求，直接应用记忆节点 |
| 过期记忆 | 重新探测并覆写 localStorage |
| 非法 base 记忆（不在 CDN_LIST） | 视为无效，重新探测 |
| localStorage 抛异常（隐私模式） | 功能正常，仅会话内记忆，不崩溃 |
| `invalidateCdn(exclude)` | 清除记忆并重探测，排除节点不被选中（除非其余全失败） |
| 并发 `resolveCdnBase()` | 只触发一轮探测 |

**`src/lib/__tests__/cache.test.ts`**（修改）：

- mock `cdn.ts`（`resolveCdnBase` resolve 固定 base、`onCdnChange` 捕获回调）与 `api.ts` 的 `getApiBase`。
- 新增：`onCdnChange` 触发后 `currentVersion`/`versionPromise` 重置，下次 `getCachedData` 重新请求版本。

**`api.ts` 失败计数**（可并入 `cdn.test.ts` 或现有 api 测试）：mock fetch 连续失败 3 次后 `invalidateCdn` 被调用；中途成功一次计数清零。

### 5.3 E2E 测试

不新增用例。`cd tests/e2e && npm run test` 全量回归，确认关键路径（入口页 → 列表 → 详情）与 `loading-indicator.spec.ts` 不受影响。

### 5.4 构建与手工验证

- `npm run lint` / `npm run test` / `npm run build` — 全部通过。
- 手工（DevTools Network）：
  - 首次访问（清 localStorage）：观察三个 `/version?t=` 探测请求，随后业务请求均发往同一最快节点。
  - 刷新（记忆有效期内）：无探测请求，业务请求直接走记忆节点。
  - 阻断当前节点域名（Network request blocking）：连续失败后自动切换，加载恢复。
  - 阻断全部三节点：页面呈现现有加载失败提示与重试入口，无无限等待。

## 6. 验收标准

- [ ] 首次访问（无记忆）时，业务数据与图片请求均发往测速最快的节点。
- [ ] 记忆有效期（24h）内回访不触发测速请求。
- [ ] 阻断当前节点后，请求自动切换到其他可用节点并完成加载。
- [ ] 三个节点全部不可用时，展示加载失败提示与重试入口。
- [ ] 切换节点后版本重新校验，不出现脏数据。
- [ ] 节点列表硬编码于 `cdn.ts`，不暴露任何外部配置入口。
- [ ] `npm run lint` / `npm run test` / `npm run build` 通过，E2E 全量回归通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 三节点版本号短暂不同步 | 缓存以旧版本标记 | 版本校验固定走选中节点；CDN 切换时重置版本状态强制重校验 |
| 测速探针被劫持/代理干扰 | 选到非最优节点 | 探针要求 2xx 响应；影响仅限速度，不影响正确性 |
| `ASSET_BASE` 模块级求值点使用旧节点 | 个别图标走默认节点 | 已知仅 `Sidebar` 语言图标，行为可接受 |
| 切换节点后在途请求失败 | 单次请求报错 | 现有加载提示提供重试，重试即走新节点 |
| localStorage 被清空/不可用 | 每次会话重新测速 | 探测为秒级并发请求，开销可接受 |
| 订阅回调抛异常阻断选路 | 选路失败 | 各订阅方回调逻辑极简（赋值/重置），无抛错路径 |

回滚策略：纯前端基础设施改动，不涉及数据与契约；按阶段提交可逐阶段回滚，整体回滚 = 删除 `cdn.ts` 及其测试 + 还原 4 个修改文件，即恢复单一默认节点行为。

## 8. 相关文档

- [[20260908-cdn-auto-selection|数据 CDN 自动优选 PRD]]
- [[20260908-cdn-auto-selection|数据 CDN 自动优选技术提案]]
- [通用开发规范](../common-rules.md)
- [工程架构规范](../engineering-spec.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
