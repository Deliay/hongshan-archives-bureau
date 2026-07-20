---
description: 工程优化：i18n 补全、版本缓存修复、API i18n 缓存与语言切换体验优化
type: Permanent
---

# 工程优化：i18n 补全、缓存修复与语言切换体验

## 背景与目标

当前站点已经支持 14 个 UI 语言，但工程层面存在以下问题：

1. **i18n 字典维护不规范**：部分 UI key（如 `search.*`、`common.loading*`、`nav.search`、`item.explain` 等）只写入了生成的 `src/i18n/dicts/*.json`，没有回到 `scripts/generate-i18n-dicts.ts` 的 `CUSTOM` 表。重新运行生成脚本会导致这些翻译丢失。
2. **版本缓存前缀为 `null`**：`cache.ts` 中的 `currentVersion` 初始为 `null`，`initCache` 是异步的；在版本号返回前，其他数据请求已经用 `null:` 前缀写入 IndexedDB。
3. **单条 i18n API 无缓存**：`fetchI18nText(locale, id)` 在种族/阵营详情页被大量调用，没有走缓存。
4. **语言切换时显示旧语言**：`useData` 在依赖变化时只把 `loading` 置为 `true`，没有清空 `data`，导致切换语言期间仍展示上一次语言的旧数据。
5. **部分页面国际化仍有问题**：
   - **5.1 种族/阵营详情标题语言不跟随切换**：`useRaceDetail` / `useFactionDetail` 把聚合后的结果缓存在 `__built_races` / `__built_factions`（不含 locale），切换语言后仍返回首次加载的语言。
   - **5.2 导航栏「档案搜索」只有中文和英文**：`nav.search` / `nav.searchDesc` 当前并未进入 `generate-i18n-dicts.ts`，只是手写补进了部分字典；重新生成后会丢失，且 MX/BR/DE/FR/VN/TH/ID/IT 等 locale 当前仍显示中文。
   - **5.3 档案搜索组件「找到 32 条相关记载」未本地化**：该文案对应 `search.resultCount`，虽已在部分字典中手写补入，但未进入 `generate-i18n-dicts.ts` 的 `CUSTOM`，重新生成时会丢失；且 MX/BR/DE/FR/VN/TH/ID/IT 等 locale 当前仍显示中文。

本方案的目标是在最小侵入的前提下修复上述问题，并在开发流程文档中明确 i18n key 的添加规范。

## 范围

**做：**

- 补齐 `scripts/generate-i18n-dicts.ts` 中缺失的 `CUSTOM` key，并重新生成 14 个语言文件。
- 修复 `initCache` 的时序，确保任何缓存读写都等待版本号就绪；版本变化时清空 IndexedDB + 内存缓存。
- 给 `fetchI18nText` 增加二级缓存（通过 `getCachedData`）。
- 调整 `useData`：当依赖变化时先清空 `data`，使语言切换期间展示骨架屏/加载态。
- 修复 `useRaceDetail` / `useFactionDetail` 的缓存 key，把 locale 纳入 key。
- 在 `AGENTS.md` 中补充 i18n 添加流程：确定文本 → 逐语言翻译 → 所有语言必须本土翻译（不允许占位、不允许留空、不允许直接复制中文）。

**不做：**

- 不改动 UI 视觉风格、不新增页面。
- 不修改 `OFFICIAL_IDS` 的映射关系（只把官方无小语种翻译的 `nav.search` 改为 `CUSTOM` 覆盖）。
- 不引入新的全局状态库或第三方缓存库。

## 技术方案

### 1. i18n 字典补全与生成脚本

#### 1.1 新增/修正 `CUSTOM` key

在 `scripts/generate-i18n-dicts.ts` 的 `CUSTOM` 中补充以下 key（带 14 语言本土翻译）：

- `common.loadingArchive`
- `common.loadingRequestCount`
- `common.loadingSlow`
- `common.loadingFailed`
- `common.loadingRetry`
- `nav.search`（覆盖官方 ID，原官方只有 CN/EN）
- `nav.searchDesc`
- `search.title`
- `search.placeholder`
- `search.searchButton`
- `search.noResults`
- `search.resultCount`
- `search.source`
- `search.relatedRecords`
- `search.hint`
- `search.prev`
- `search.next`
- `search.searchMore`
- `item.explain`（代码中使用的是 `item.explain`，而 `CUSTOM` 里只有 `item.itemExplain`）
- `diff.skillId`
- `weapon.sortByRarity`

其中：

- `nav.search` / `nav.searchDesc` 新增到 `CUSTOM`，解决 **5.2 导航栏「档案搜索」只有中文和英文** 的问题。
- `search.resultCount` 进入 `CUSTOM` 并补齐 14 语言，解决 **5.3 档案搜索组件「找到 32 条相关记载」未本地化** 的问题。

> 所有新增 key 必须提供全部 14 个语言（CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT）的本土翻译，**不允许使用英文或其他语言占位，也不允许直接复制中文**。

#### 1.2 重新生成字典

```bash
node scripts/generate-i18n-dicts.ts
```

生成后执行：

```bash
npm run lint && npm run test && npm run build
```

#### 1.3 新增一致性校验脚本（必须）

新增 `scripts/verify-i18n.ts`，并在 `package.json` 中注册为 `verify:i18n`：

```json
{
  "scripts": {
    "verify:i18n": "node scripts/verify-i18n.ts"
  }
}
```

该校验脚本逻辑：

1. 扫描 `src/**/*.tsx` 中所有 `t('...')` 调用。
2. 扫描 `scripts/generate-i18n-dicts.ts` 的 `OFFICIAL_IDS` + `CUSTOM`。
3. 报出「代码使用但生成脚本未定义」的 key（error）。
4. 报出「生成脚本定义但代码未使用」的 key（warning）。
5. 检查每个 `CUSTOM` key 是否 14 个语言都有值（不允许 undefined 或空字符串）。

同时调整 `package.json` 的 `lint` 和 `build` 脚本，使校验成为必经流程：

```json
{
  "scripts": {
    "lint": "oxlint && npm run verify:i18n",
    "build": "npm run verify:i18n && tsc -b && vite build"
  }
}
```

CI/本地提交前只要执行 `npm run lint` 或 `npm run build`，都会先跑 i18n 一致性校验，防止再次出现「字典手写补了但生成脚本没补」或「新增 key 没有 14 语言翻译」的问题。

### 2. 版本缓存修复

当前 `cache.ts` 的问题：

```ts
let currentVersion: string | null = null

export async function initCache(): Promise<string> {
  const version = await fetch('...')
  // ... 在 await 期间，其他 getCachedData 会用 null: 前缀
  currentVersion = version
}
```

#### 2.1 方案：所有缓存操作等待版本就绪

引入一个模块级 version promise：

```ts
let versionPromise: Promise<string> | null = null

export function initCache(): Promise<string> {
  if (!versionPromise) {
    versionPromise = (async () => {
      const version = await fetchVersion()
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

export async function getCachedData<T>(...) {
  if (!versionPromise) await initCache()
  // 后续逻辑不变，此时 currentVersion 已就绪
}
```

关键点：

- `initCache` 返回单例 promise，避免重复请求 `/version`。
- `getCachedData` 如果没有版本就先 `await initCache()`，确保不会写出 `null:` 前缀。
- 版本变化时：`idbClear()` + `memoryCache.clear()`，并更新 `_version`。

#### 2.2 启动入口

`App.tsx` 中的 `useVersion` 已经会触发 `initCache()`。其他 hook 即使不等待 `useVersion`，也会在第一次 `getCachedData` 时自动等待版本就绪。

### 3. API 单条 i18n 缓存

当前 `fetchI18nText(locale, id)` 直接请求远端。方案：改为走 `getCachedData`。

```ts
export async function fetchI18nText(locale: string, id: string): Promise<string> {
  return getCachedData<string>(`__i18n_text_${locale}`, async () => {
    return trackFetch(..., () => fetch(`${API_BASE}/i18n/${locale}/${id}`).text())
  }, id)
}
```

缓存 key 最终为 `${version}:__i18n_text_${locale}:${id}`，与已有的 `__i18n_search_${locale}_${id}` 等内部缓存命名保持一致，前缀显式表明这是按 locale 分区的单条 i18n 文本缓存。

> 注意：`fetchI18nText` 现在依赖 `getCachedData`，而 `getCachedData` 已经会等待版本就绪，因此不会写出 `null:` 前缀。

### 4. 语言切换加载骨架屏

当前 `useData`：

```ts
const load = useCallback(() => {
  setLoading(true)
  setError(null)
  fetcher().then(setData).catch(...).finally(() => setLoading(false))
}, deps)
```

问题：`setData` 不会清空旧数据。切换语言时 `deps` 变化触发 `load`，但旧语言的 `data` 仍然保留，页面不会进入骨架屏。

#### 4.1 修复

在 `load` 开始时清空 `data`：

```ts
const load = useCallback(() => {
  setLoading(true)
  setError(null)
  setData(null)   // 新增
  fetcher()
    .then(setData)
    .catch((e: Error) => setError(e.message))
    .finally(() => setLoading(false))
}, deps)
```

影响：所有使用 `useData` 的 hook（`useOperators`、`useWeapons`、`useRaceDetail` 等）在 locale 变化时都会先回到 `data = null` 状态，页面展示 `DetailSkeleton` / `ListSkeleton`。

#### 4.2 额外优化：避免快速切换语言导致旧请求覆盖新数据

虽然 `useData` 每次依赖变化都会重新触发，但旧的 Promise 仍可能在后面 resolve 并覆盖新数据。可以在 effect 中增加 `cancelled` 标志：

```ts
useEffect(() => {
  let cancelled = false
  setLoading(true)
  setError(null)
  setData(null)
  fetcher()
    .then(d => { if (!cancelled) setData(d) })
    .catch(e => { if (!cancelled) setError(e.message) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [load])
```

> 这一步属于体验优化，可根据实际测试决定是否纳入本次实现。

### 5. 种族/阵营详情语言不跟随切换

`useRaceDetail` 与 `useFactionDetail` 中使用了不带 locale 的缓存 key：

```ts
getCachedData<Race[]>('__built_races', async () => { ... })
getCachedData<Faction[]>('__built_factions', async () => { ... })
getCachedData<...>(`__i18n_search_${raceId}`, async () => { ... })
```

#### 5.1 修复

把 locale 加入缓存 key：

```ts
getCachedData<Race[]>(`__built_races_${locale}`, async () => { ... })
getCachedData<Faction[]>(`__built_factions_${locale}`, async () => { ... })
getCachedData<...>(`__i18n_search_${locale}_${raceId}`, async () => { ... })
```

这样切换语言后会重新按新语言解析种族名/阵营名，标题与成员名都会跟随变化。

### 6. 开发流程文档更新

在根目录 `AGENTS.md` 的「Agents Guide」之后新增「i18n 添加流程」小节：

```markdown
### i18n 添加流程

所有 UI 文案必须通过 `scripts/generate-i18n-dicts.ts` 生成，禁止直接修改 `src/i18n/dicts/*.json`。

1. **确定文本**：在代码中使用 `t('namespace.key')` 确定 key。
2. **逐语言翻译**：
   - 若是游戏已有官方文案，在 `scripts/generate-i18n-dicts.ts` 的 `OFFICIAL_IDS` 中新增 `key → id` 映射。
   - 若是站点自定义文案，在 `CUSTOM` 中新增 key。
   - 每个 `CUSTOM` key 必须提供全部 14 个语言（CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT）的本土翻译，**不允许使用任何语言占位、不允许留空、不允许直接复制中文**。
3. **重新生成**：运行 `node scripts/generate-i18n-dicts.ts`。
4. **校验**：运行 `npm run lint && npm run test && npm run build`。
```

同时更新 `docs/engineering/references/i18n-spec.md` 中「添加或修改翻译」小节，强调不允许直接编辑 dict 文件，并指向 `AGENTS.md` 的流程说明。

## 实现计划

1. **创建分支**：`feat/i18n-cache-optimization`
2. **修复缓存层**：`src/lib/cache.ts`（版本单例 promise + getCachedData 等待版本）
3. **修复 API i18n 缓存**：`src/lib/api.ts`（`fetchI18nText` 走 `getCachedData`）
4. **修复语言切换骨架屏**：`src/hooks/useData.ts`（清空 data + 可选取消标志）
5. **修复种族/阵营缓存 key**：`src/hooks/useData.ts`（`useRaceDetail` / `useFactionDetail`）
6. **补全 i18n 生成脚本**：`scripts/generate-i18n-dicts.ts`（新增缺失 key 的 14 语言翻译）
7. **重新生成字典**：`node scripts/generate-i18n-dicts.ts`
8. **新增校验脚本**：`scripts/verify-i18n.ts`，并接入 `npm run lint` 与 `npm run build`
9. **更新开发文档**：`AGENTS.md`、`docs/engineering/references/i18n-spec.md`
10. **跑通检查**：`npm run lint && npm run test && npm run build`（其中 lint/build 已包含 i18n 校验）
11. **提交 PR**

## 测试策略

- **单元测试**：
  - `src/i18n/index.test.ts`：验证新增 key 在所有 locale 都能取到非 key 值。
  - `src/lib/cache.test.ts`（如不存在则新建）：验证 `initCache` 单例、版本变化时清空缓存、`getCachedData` 不会使用 `null:` 前缀。
- **组件测试**：
  - `Sidebar.test.tsx`：验证切换语言后 `nav.search` 显示目标语言。
  - `ArchiveSearchResults.test.tsx`：验证 `search.resultCount` 的变量插值。
- **E2E**：
  - 切换语言后访问 `/archive/races/:id`，验证标题为新语言。
  - 切换语言后访问 `/archive/search`，验证搜索结果计数文案为新语言。

## 验收标准

- [ ] `node scripts/generate-i18n-dicts.ts` 后，`search.*`、`common.loading*`、`nav.search`、`item.explain`、`diff.skillId`、`weapon.sortByRarity` 等 key 不会丢失；`npm run verify:i18n` 通过。
- [ ] **5.2** 导航栏 `nav.search` 在 14 个语言下都显示对应语言，不再只有中文/英文。
- [ ] **5.3** 档案搜索组件的 `search.resultCount`（「找到 32 条相关记载」）在 14 个语言下都显示对应语言，MX/BR/DE/FR/VN/TH/ID/IT 不再显示中文。
- [ ] IndexedDB 中不存在 `null:` 前缀的 key；版本变化后旧 key 被清空。
- [ ] 语言切换时页面展示骨架屏，不再显示旧语言数据。
- [ ] `/archive/races/:id` 与 `/archive/factions/:id` 切换语言后，标题与成员名跟随变化。
- [ ] `npm run lint && npm run test && npm run build` 全部通过。
- [ ] `AGENTS.md` 已补充 i18n 添加流程。

## 相关文档

- [[AGENTS|工程协作说明]]
- [[i18n-spec|国际化规范]]
- [[engineering-spec|工程架构规范]]
