---
description: 宏山档案局界面国际化完善实现方案
type: Fleeting
---

# 宏山档案局界面国际化完善实现方案

**对应产品文档**: [[20260719-globalization-i18n|宏山档案局界面国际化完善方案]]
**对应技术方案**: [[20260719-globalization-i18n|宏山档案局界面国际化完善技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-19
**作者**: 前端工程
**开发分支**: `feat/i18n-globalization`

## 1. 概述

### 1.1 目标

本方案将技术方案中定义的 I18n 架构转化为可执行的代码实现清单，目标是把散落在组件中的中文硬编码文案全部替换为 `useI18n().t(key)` 调用，并为所有支持语言提供前端静态翻译字典。

### 1.2 范围

- **做**：新增 `src/i18n/` 基础设施、翻译字典、替换所有硬编码文案、持久化语言偏好。
- **不做**：修改数据适配器、API 封装、缓存、Diff 系统、富文本解析、路由结构。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/i18n/index.ts` | I18nProvider、useI18n、t 函数、flatten；由生成脚本根据 API 语言列表自动维护 import |
| `src/i18n/dicts/{locale}.json` | 各语言翻译字典，由 `scripts/generate-i18n-dicts.ts` 根据 `GET /i18n` 返回的可用 locale 列表自动生成 |
| `scripts/generate-i18n-dicts.ts` | 字典生成脚本：调用 `/i18n` 与 `/i18n/{locale}/{id}`，输出 `src/i18n/dicts/` 与 `src/i18n/index.ts` |
| `src/i18n/source/custom.json`（可选） | 站点自定义译文源文件，按 locale 组织，供生成脚本合并 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/App.tsx` | 集成 I18nProvider |
| `src/lib/locale.tsx` | 持久化当前语言到 localStorage |
| `src/components/Layout/Sidebar.tsx` | 导航与语言标签国际化 |
| `src/components/Layout/Breadcrumb.tsx` | 面包屑标签国际化 |
| `src/components/Layout/Footer.tsx` | 页脚文案国际化 |
| `src/components/Layout/PlaceholderPage.tsx` | 占位文案国际化 |
| `src/routes/Landing.tsx` | 着陆页文案国际化 |
| `src/routes/ArchiveHome.tsx` | 首页卷宗文案国际化 |
| `src/pages/operators/OperatorList.tsx` | 标题、筛选、排序、分组、分页国际化 |
| `src/pages/operators/OperatorDetail.tsx` | 详情标签、技能类型国际化 |
| `src/pages/weapons/WeaponList.tsx` | 标题、筛选、排序、分组、分页国际化 |
| `src/pages/weapons/WeaponDetail.tsx` | 详情标签、返回国际化 |
| `src/pages/enemies/EnemyList.tsx` | 标题、筛选、排序、分组、分页国际化 |
| `src/pages/enemies/EnemyDetail.tsx` | 详情标签、返回国际化 |
| `src/pages/races/RaceList.tsx` | 标题、计数国际化 |
| `src/pages/races/RaceDetail.tsx` | 详情标签国际化 |
| `src/pages/factions/FactionList.tsx` | 标题、计数国际化 |
| `src/pages/factions/FactionDetail.tsx` | 详情标签国际化 |
| `src/pages/items/ItemList.tsx` | 标题、筛选、排序、分组、分页国际化 |
| `src/pages/story/StoryOverview.tsx` | 标题国际化 |
| `src/pages/professions/ProfessionOverview.tsx` | 标题、分组国际化 |
| `src/pages/updates/UpdateHome.tsx` | 标题、统计文案国际化 |
| `src/pages/updates/UpdateSummary.tsx` | 统计标签、返回、加载文案国际化 |
| `src/pages/updates/UpdateTableDiff.tsx` | 返回、标题国际化 |
| `src/components/Items/RewardPanel.tsx` | 奖励标签国际化 |
| `src/components/Weapons/WeaponSkillPanel.tsx` | 等级标签国际化 |

## 3. 第一阶段：I18n 基础设施

### 3.1 `src/i18n/index.ts`

> **重要**：本文件中的 `import` 列表与 `messages` 映射由 `scripts/generate-i18n-dicts.ts` 根据 `GET /i18n` 返回的可用 locale 列表自动生成，不应手动维护。以下示例假设 API 当前返回 `CN/TC/EN/JP/KR/RU`。

```ts
// 本文件由 scripts/generate-i18n-dicts.ts 自动生成，请勿手动修改 import 列表
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import CN from './dicts/CN.json'
import TC from './dicts/TC.json'
import EN from './dicts/EN.json'
import JP from './dicts/JP.json'
import KR from './dicts/KR.json'
import RU from './dicts/RU.json'

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      result[key] = v
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key))
    }
  }
  return result
}

const messages: Record<string, Record<string, string>> = {
  CN: flatten(CN),
  TC: flatten(TC),
  EN: flatten(EN),
  JP: flatten(JP),
  KR: flatten(KR),
  RU: flatten(RU),
}

function translate(locale: string, key: string, vars?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages.CN
  let text = dict[key] ?? messages.CN[key] ?? key
  if (vars) {
    text = text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''))
  }
  return text
}

interface I18nContextValue {
  locale: string
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'CN',
  t: (key) => key,
})

export function I18nProvider({ children, locale }: { children: ReactNode; locale: string }) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: (key, vars) => translate(locale, key, vars) }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
```

### 3.1.1 字典生成脚本 `scripts/generate-i18n-dicts.ts`

```ts
import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = 'https://endfield-assets.fffdan.com'
const OUT_DIR = path.resolve(__dirname, '../src/i18n/dicts')
const INDEX_FILE = path.resolve(__dirname, '../src/i18n/index.ts')

// 官方 i18n ID 映射：key -> 官方 i18n ID
const OFFICIAL_IDS: Record<string, string> = {
  'nav.operators': '4587871773125153579',
  'nav.weapons': '-5172571920525154197',
  'nav.items': '-6832531754290229270',
  'nav.equipment': '-2258509209715706807',
  'nav.enemies': '8742258141975205570',
  'nav.story': '-2992892562572048332',
  'common.sort': '-5741249201421562043',
  'common.filter': '-1121143716786680081',
  'common.back': '4109135557850577026',
  'common.cancel': '-7995171946680413439',
  'common.loading': '-8683146888103394046',
  'common.loadFailed': '-708947455973234252',
  'common.all': '-6709500628147796913',
  'common.search': '1813795696135907930',
  'common.noResult': '-547783542302619085',
  'operator.race': '-4169092580478466908',
  'operator.skill': '-1627707113686409986',
  'weapon.rarity': '-863081527829739477',
  // ... 其他官方 key
}

// 站点自定义译文源：key -> locale -> text
const CUSTOM: Record<string, Record<string, string>> = {
  'site.name': {
    CN: '宏山档案局',
    TC: '宏山檔案局',
    EN: 'Hongshan Archives Bureau',
    JP: '宏山檔案局',
    KR: '홍산 아카이브국',
    RU: 'Архивное бюро Хуншань',
  },
  // ... 其他自定义 key
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.json() as Promise<T>
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) return ''
  return res.text()
}

async function main() {
  const locales = await fetchJson<string[]>(`${API_BASE}/i18n`)
  console.log('API available locales:', locales)

  await fs.mkdir(OUT_DIR, { recursive: true })

  const dicts: Record<string, Record<string, string>> = {}
  for (const locale of locales) {
    dicts[locale] = {}
  }

  for (const [key, id] of Object.entries(OFFICIAL_IDS)) {
    for (const locale of locales) {
      const text = await fetchText(`${API_BASE}/i18n/${locale}/${id}`)
      if (text) {
        dicts[locale][key] = text
      }
    }
  }

  for (const [key, translations] of Object.entries(CUSTOM)) {
    for (const locale of locales) {
      if (translations[locale]) {
        dicts[locale][key] = translations[locale]
      }
    }
  }

  // 写 JSON 文件
  for (const [locale, flatDict] of Object.entries(dicts)) {
    const nested = unflatten(flatDict)
    await fs.writeFile(
      path.join(OUT_DIR, `${locale}.json`),
      JSON.stringify(nested, null, 2) + '\n',
    )
  }

  // 生成 index.ts
  const imports = locales.map((l) => `import ${l} from './dicts/${l}.json'`).join('\n')
  const messages = locales.map((l) => `  ${l}: flatten(${l}),`).join('\n')
  const indexContent = `// 本文件由 scripts/generate-i18n-dicts.ts 根据 API /i18n 自动生成\n// 请勿手动修改 import 列表\n${imports}\n\nconst messages: Record<string, Record<string, string>> = {\n${messages}\n}\n`
  // ... 后续写入 INDEX_FILE
  console.log('Generated dicts for:', locales)
}

function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current: any = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }
  return root
}

main().catch(console.error)
```

运行方式：

```bash
npx tsx scripts/generate-i18n-dicts.ts
```

脚本输出后，应通过 `npm run build` 验证 `src/i18n/index.ts` 中无未使用的 import 或缺失的语言映射。

### 3.2 翻译字典结构

所有字典采用统一的嵌套 JSON 结构，`flatten` 后展开为点分 key。字典文件由 `scripts/generate-i18n-dicts.ts` 根据 `GET /i18n` 返回的可用 locale 列表自动生成，**不应手动创建或删除**。以 `CN.json` 为例：

```json
{
  "site": {
    "name": "宏山档案局",
    "subtitle": "塔卫二官方档案管理与调阅系统",
    "enter": "进入档案局",
    "homeTitle": "档案局总览",
    "homeSubtitle": "选择一卷档案开始调阅",
    "footer": "宏山档案局 · 塔卫二官方档案管理与调阅系统",
    "dataSource": "数据来源：天师数据库 API · 管理员记录",
    "placeholder": "该卷宗正在整理中"
  },
  "nav": {
    "archive": "档案局",
    "personnel": "人事档案",
    "personnelDesc": "干员、种族与阵营",
    "threat": "威胁档案",
    "threatDesc": "敌对生物与武装情报",
    "material": "物资档案",
    "materialDesc": "道具、武器、装备与生产",
    "geography": "地理档案",
    "geographyDesc": "塔卫二区域与探索",
    "chronicle": "大事记",
    "chronicleDesc": "叙事与版本变更记录",
    "operators": "干员档案",
    "operatorsDesc": "可操作角色一览",
    "races": "干员种族",
    "racesDesc": "种族资料归集",
    "factions": "干员阵营",
    "factionsDesc": "势力归属梳理",
    "enemies": "敌人图鉴",
    "enemiesDesc": "敌对生物与武装",
    "items": "道具材料",
    "itemsDesc": "物资与收集品",
    "weapons": "武器档案",
    "weaponsDesc": "模块化武器记录",
    "equipment": "装备系统",
    "equipmentDesc": "装备宝石套装",
    "factory": "工厂系统",
    "factoryDesc": "自动化生产线",
    "areas": "地区地理",
    "areasDesc": "地域分布与探索",
    "story": "剧情记录",
    "storyDesc": "叙事资料归档",
    "updates": "更新日志",
    "updatesDesc": "版本间数据变更"
  },
  "common": {
    "all": "全部",
    "allType": "全部类型",
    "allRarity": "全部稀有度",
    "allStar": "全部星级",
    "allShowingType": "全部显示类型",
    "allValuableTab": "全部贵重标签",
    "search": "搜索",
    "sort": "排序",
    "defaultSort": "默认排序",
    "group": "分组",
    "noGroup": "不分组",
    "asc": "正序",
    "desc": "倒序",
    "prev": "上一页",
    "next": "下一页",
    "back": "返回",
    "loading": "加载中",
    "loadFailed": "加载失败",
    "empty": "暂无记录",
    "missingParam": "缺少参数",
    "countUnit": "{{count}} 个",
    "countPeople": "{{count}} 人",
    "countKind": "{{count}} 种",
    "countPiece": "{{count}} 件"
  }
}
```

其他语言字典结构完全一致，仅 value 不同。完整 key 列表见第 9 节，但实际存在的语言文件完全由 API `/i18n` 决定。

### 3.3 `src/App.tsx`

将 `I18nProvider` 接入 `LocaleProvider` 之下，使 `t` 函数能响应 `locale` 变化。

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LocaleProvider } from './lib/locale'
import { I18nProvider } from './i18n'
import ArchiveLayout from './components/Layout/ArchiveLayout'
// ... 其他页面 import
import { useLocale } from './lib/locale'

function AppRoutes() {
  const { locale } = useLocale()
  return (
    <I18nProvider locale={locale}>
      <BrowserRouter>
        <Routes>
          {/* ... 现有路由 ... */}
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <AppRoutes />
    </LocaleProvider>
  )
}
```

### 3.4 `src/lib/locale.tsx`

增加 `localStorage` 持久化，避免刷新后语言重置。

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'hs_locale'

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'CN',
  setLocale: () => {},
})

function getInitialLocale(): string {
  if (typeof window === 'undefined') return 'CN'
  return localStorage.getItem(STORAGE_KEY) || 'CN'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(getInitialLocale)

  const setLocale = (next: string) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
```

## 4. 第二阶段：全局布局与首页

### 4.1 `src/components/Layout/Sidebar.tsx`

将 `NAV_GROUPS` 改为函数，接收 `t` 后返回带 key 的数组；渲染时用 `t()` 取值。

```tsx
import { useI18n } from '../../../i18n'

function useNavGroups() {
  const { t } = useI18n()
  return [
    {
      label: t('nav.personnel'),
      items: [
        { label: t('nav.operators'), path: '/archive/operators' },
        { label: t('nav.races'), path: '/archive/races' },
        { label: t('nav.factions'), path: '/archive/factions' },
      ],
    },
    // ... 其他分组
  ]
}

export default function Sidebar() {
  const { locale, setLocale } = useLocale()
  const { t } = useI18n()
  const navGroups = useNavGroups()
  // ...
  return (
    <aside /* ... */>
      <div className="p-4 border-b border-archive-border">
        <Link to="/archive" className="flex items-center gap-3 text-archive-gold">
          <ArchiveSeal size={36} />
          <span className="font-display font-bold text-lg tracking-wider">{t('site.name')}</span>
        </Link>
      </div>
      <nav /* ... */>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-xs font-medium tracking-wider text-archive-lead uppercase">
              {group.label}
            </div>
            {/* ... */}
          </div>
        ))}
      </nav>
      {/* 语言切换 */}
    </aside>
  )
}
```

`LOCALE_LABELS` 保留，因为它们是语言自描述标签（如「English」），不需要翻译。

### 4.2 `src/components/Layout/Breadcrumb.tsx`

将 `LIST_LABEL` 改为使用 `t`。

```tsx
import { useI18n } from '../../i18n'

export default function Breadcrumb() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  // ...
  const listLabel: Record<string, string> = {
    operators: t('nav.operators'),
    weapons: t('nav.weapons'),
    races: t('nav.races'),
    factions: t('nav.factions'),
    enemies: t('nav.enemies'),
    items: t('nav.items'),
    equipment: t('nav.equipment'),
    factory: t('nav.factory'),
    geography: t('nav.areas'),
    story: t('nav.story'),
    updates: t('nav.updates'),
    professions: t('profession.title'),
  }
  // ...
  return (
    <nav /* ... */>
      <Link to="/archive" className="hover:text-archive-gold transition-colors">{t('nav.archive')}</Link>
      {/* ... */}
    </nav>
  )
}
```

### 4.3 `src/components/Layout/Footer.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-archive-border mt-16 py-6 text-center text-xs text-archive-lead">
      <p className="text-archive-dust">{t('site.footer')}</p>
      <p className="mt-1">{t('site.dataSource')}</p>
    </footer>
  )
}
```

### 4.4 `src/components/Layout/PlaceholderPage.tsx`

```tsx
import { useI18n } from '../../i18n'

export function PlaceholderPage({ title, code }: PlaceholderPageProps) {
  const { t } = useI18n()
  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Card className="text-center py-16">
        <ArchiveSeal size={64} className="mx-auto mb-6 opacity-60" />
        <h1 className="font-display text-2xl font-bold text-archive-ivory mb-2">{title}</h1>
        <p className="text-sm text-archive-dust mb-4">{t('site.placeholder')}</p>
        <Badge variant="ghost">{code}</Badge>
      </Card>
    </div>
  )
}
```

### 4.5 `src/routes/Landing.tsx`

```tsx
import { useI18n } from '../i18n'

export default function LandingPage() {
  const { t } = useI18n()
  // ...
  return (
    <div /* ... */>
      <ArchiveSeal size={80} className="mb-6" />
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-[0.2em] text-archive-gold mb-3">
        {t('site.name')}
      </h1>
      <p className="text-sm md:text-base text-archive-dust tracking-widest mb-12">
        {t('site.subtitle')}
      </p>
      <button /* ... */>
        {t('site.enter')}
      </button>
    </div>
  )
}
```

### 4.6 `src/routes/ArchiveHome.tsx`

```tsx
import { useI18n } from '../i18n'

function useModuleGroups() {
  const { t } = useI18n()
  return [
    {
      label: t('nav.personnel'),
      desc: t('nav.personnelDesc'),
      modules: [
        { label: t('nav.operators'), path: '/archive/operators', desc: t('nav.operatorsDesc') },
        { label: t('nav.races'), path: '/archive/races', desc: t('nav.racesDesc') },
        { label: t('nav.factions'), path: '/archive/factions', desc: t('nav.factionsDesc') },
      ],
    },
    // ...
  ]
}

export default function ArchiveHome() {
  const { t } = useI18n()
  const groups = useModuleGroups()
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="font-display text-2xl font-bold text-archive-ivory mb-2">{t('site.homeTitle')}</h2>
        <p className="text-sm text-archive-dust">{t('site.homeSubtitle')}</p>
      </div>
      {/* ... */}
    </div>
  )
}
```

## 5. 第三阶段：列表页

### 5.1 `src/pages/operators/OperatorList.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function OperatorList() {
  const { t } = useI18n()
  const { data: operators, loading, error } = useOperators()
  // ...

  if (loading) return <PageSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!operators || operators.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('operator.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.operators}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <select /* element */>
          <option value="">{t('operator.allElements')}</option>
          {/* ... */}
        </select>
        <select /* profession */>
          <option value="">{t('operator.allProfessions')}</option>
          {/* ... */}
        </select>
        <select /* rarity */>
          <option value="">{t('operator.allRarities')}</option>
          {[0, 1, 2, 3, 4, 5, 6].map((v) => (
            <option key={v} value={v}>{t('operator.rarityLevel', { level: v })}</option>
          ))}
        </select>
        <select /* tag */>
          <option value="">{t('operator.allTags')}</option>
          {/* ... */}
        </select>
        <select /* race */>
          <option value="">{t('operator.allRaces')}</option>
          {/* ... */}
        </select>
        <select /* faction */>
          <option value="">{t('operator.allFactions')}</option>
          {/* ... */}
        </select>
        <select /* main attr */>
          <option value="">{t('operator.allMainAttrs')}</option>
          {/* ... */}
        </select>
        <select /* sub attr */>
          <option value="">{t('operator.allSubAttrs')}</option>
          {/* ... */}
        </select>

        <span className="text-archive-lead">|</span>

        <span className="text-archive-dust">{t('common.sort')}：</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="profession">{t('operator.sortByProfession')}</option>
          <option value="rarity">{t('operator.sortByRarity')}</option>
          <option value="element">{t('operator.sortByElement')}</option>
          <option value="race">{t('operator.sortByRace')}</option>
          <option value="faction">{t('operator.sortByFaction')}</option>
        </select>

        <button onClick={() => setSortDesc((d) => !d)}>
          {sortDesc ? t('common.desc') : t('common.asc')}
        </button>

        <span className="text-archive-lead">|</span>

        <span className="text-archive-dust">{t('common.group')}：</span>
        <select value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}>
          <option value="">{t('common.noGroup')}</option>
          <option value="element">{t('operator.groupByElement')}</option>
          <option value="profession">{t('operator.groupByProfession')}</option>
          <option value="rarity">{t('operator.groupByRarity')}</option>
          <option value="race">{t('operator.groupByRace')}</option>
          <option value="faction">{t('operator.groupByFaction')}</option>
          <option value="mainAttr">{t('operator.groupByMainAttr')}</option>
        </select>
      </div>
      {/* ... */}
    </div>
  )
}
```

分组标题中的 `未知` 改为 `t('common.unknown')`。

### 5.2 `src/pages/weapons/WeaponList.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function WeaponList() {
  const { t } = useI18n()
  // ...

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('weapon.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.weapons}</Badge>
      </div>

      <input
        placeholder={t('common.searchWithName', { name: t('weapon.title') })}
        // ...
      />

      <select /* page size */>
        {PAGE_SIZES.map(ps => (
          <option key={ps} value={ps}>{ps === 0 ? t('common.all') : `${ps} / ${t('common.page')}`}</option>
        ))}
      </select>

      <select /* type */>
        <option value="">{t('weapon.allTypes')}</option>
        {/* ... */}
      </select>

      <select /* rarity */>
        <option value="">{t('common.allRarity')}</option>
        {/* ... */}
      </select>

      <select /* skill1 */>
        <option value="">{t('weapon.skill1')}</option>
        {/* ... */}
      </select>

      <select /* skill2 */>
        <option value="">{t('weapon.skill2')}</option>
        {/* ... */}
      </select>

      <select /* skill3 prefix */>
        <option value="">{t('weapon.skill3Prefix')}</option>
        {/* ... */}
      </select>

      <select /* sort */>
        <option value="rarity">{t('weapon.sortByRarity')}</option>
        <option value="weaponType">{t('weapon.sortByType')}</option>
      </select>

      <button onClick={() => setSortDesc(v => !v)}>
        {sortDesc ? t('common.desc') : t('common.asc')}
      </button>

      <select /* group */>
        <option value="">{t('common.noGroup')}</option>
        <option value="weaponType">{t('weapon.groupByType')}</option>
      </select>
      {/* ... */}
    </div>
  )
}
```

### 5.3 `src/pages/enemies/EnemyList.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function EnemyList() {
  const { t } = useI18n()
  // ...

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('enemy.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.enemies}</Badge>
      </div>

      <input placeholder={t('common.searchWithName', { name: t('enemy.title') })} />

      <select /* page size */>
        {PAGE_SIZES.map(ps => (
          <option key={ps} value={ps}>{ps === 0 ? t('common.all') : `${ps} / ${t('common.page')}`}</option>
        ))}
      </select>

      <select /* star */>
        <option value="">{t('enemy.allStars')}</option>
        {/* ... */}
      </select>

      <select /* group */>
        <option value="">{t('enemy.allGroups')}</option>
        {/* ... */}
      </select>

      <select /* sort */>
        <option value="displayType">{t('enemy.sortByStar')}</option>
        <option value="name">{t('enemy.sortByName')}</option>
      </select>

      <button onClick={() => setSortDesc(v => !v)}>
        {sortDesc ? t('common.desc') : t('common.asc')}
      </button>

      <select /* group */>
        <option value="">{t('common.noGroup')}</option>
        <option value="wikiGroup">{t('enemy.groupByGroup')}</option>
      </select>
      {/* ... */}
    </div>
  )
}
```

### 5.4 `src/pages/items/ItemList.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function ItemList() {
  const { t } = useI18n()
  // ...

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('item.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.items}</Badge>
      </div>

      <input placeholder={t('common.searchWithName', { name: t('item.title') })} />

      <select /* page size */>
        {PAGE_SIZES.map(ps => (
          <option key={ps} value={ps}>{ps === 0 ? t('common.all') : `${ps} / ${t('common.page')}`}</option>
        ))}
      </select>

      <select /* type */>
        <option value="">{t('item.allTypes')}</option>
        {/* ... */}
      </select>

      <select /* rarity */>
        <option value="">{t('common.allRarity')}</option>
        {/* ... */}
      </select>

      <select /* showing type */>
        <option value="">{t('item.allShowingTypes')}</option>
        {/* ... */}
      </select>

      <select /* valuable tab */>
        <option value="">{t('item.allValuableTabs')}</option>
        {/* ... */}
      </select>

      <select /* sort */>
        <option value="">{t('common.defaultSort')}</option>
        <option value="showingType">{t('item.sortByShowingType')}</option>
        <option value="rarity">{t('item.sortByRarity')}</option>
        <option value="type">{t('item.sortByType')}</option>
      </select>

      <button onClick={() => setSortDesc(v => !v)}>
        {sortDesc ? t('common.desc') : t('common.asc')}
      </button>

      <select /* group */>
        <option value="">{t('common.noGroup')}</option>
        <option value="showingType">{t('item.groupByShowingType')}</option>
        <option value="type">{t('item.groupByType')}</option>
        <option value="valuableTabType">{t('item.groupByValuableTab')}</option>
      </select>
      {/* ... */}
    </div>
  )
}
```

## 6. 第四阶段：详情页

### 6.1 `src/pages/operators/OperatorDetail.tsx`

```tsx
import { useI18n } from '../../i18n'

const SKILL_TYPE_LABELS: Record<number, string> = {
  0: 'operator.skillType.normal',
  1: 'operator.skillType.active',
  2: 'operator.skillType.ultimate',
  3: 'operator.skillType.combo',
}

export default function OperatorDetail() {
  const { t } = useI18n()
  // ...

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!detail) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('operator.title') })}</div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* ... */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
        {op.mainAttr.icon && (
          <div className="flex items-center gap-1.5 text-archive-dust">
            <img src={op.mainAttr.icon} alt="" className="w-4 h-4" />
            <span className="text-archive-gold">{t('operator.mainAttr')}</span>
            <span>{op.mainAttr.name}</span>
          </div>
        )}
        {op.subAttr.icon && (
          <div className="flex items-center gap-1.5 text-archive-dust">
            <img src={op.subAttr.icon} alt="" className="w-4 h-4" />
            <span className="text-archive-gold">{t('operator.subAttr')}</span>
            <span>{op.subAttr.name}</span>
          </div>
        )}
      </div>

      <section>
        <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.skill')}</h3>
        {/* ... */}
      </section>

      {talentNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.talent')}</h3>
          {/* ... */}
        </section>
      )}

      {detail.factorySkills.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.factorySkill')}</h3>
          {/* ... */}
        </section>
      )}

      {breakNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.break')}</h3>
          {/* ... */}
        </section>
      )}

      {attrNodes.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.attrBoost')}</h3>
          {/* ... */}
        </section>
      )}

      {wpnRecommend && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.equipFit')}</h3>
          {/* ... */}
        </section>
      )}

      {op.profileRecords.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.profileRecords')}</h3>
          {/* ... */}
        </section>
      )}

      {op.voiceLines.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.voiceRecords')}</h3>
          {/* ... */}
        </section>
      )}
    </div>
  )
}
```

在 `SkillGroupCard` 中：

```tsx
const typeName = t(SKILL_TYPE_LABELS[group.skillGroupType]) ?? `类型${group.skillGroupType}`
```

### 6.2 `src/pages/weapons/WeaponDetail.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function WeaponDetail() {
  const { t } = useI18n()
  // ...

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!weapon) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('weapon.title') })}</div>

  return (
    <div>
      <div className="mb-4">
        <Link to="/archive/weapons" className="text-xs text-archive-lead hover:text-archive-gold transition-colors">
          &larr; {t('common.backToList', { list: t('weapon.title') })}
        </Link>
      </div>
      {/* ... */}

      {weapon.lore && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.itemDesc')}</div>
          {/* ... */}
        </div>
      )}

      {weapon.itemDesc && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.itemExplain')}</div>
          {/* ... */}
        </div>
      )}

      <div className="p-3 rounded border border-archive-border bg-archive-file">
        <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.basicInfo')}</div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-archive-lead">{t('weapon.weaponId')}</dt>
          <dd className="text-archive-ivory font-mono">{weapon.id}</dd>
          <dt className="text-archive-lead">{t('weapon.maxLevel')}</dt>
          <dd className="text-archive-ivory">{weapon.maxLevel}</dd>
          <dt className="text-archive-lead">{t('weapon.breakTemplate')}</dt>
          <dd className="text-archive-ivory font-mono text-[10px]">{weapon.breakthroughTemplateId}</dd>
          <dt className="text-archive-lead">{t('weapon.levelTemplate')}</dt>
          <dd className="text-archive-ivory font-mono text-[10px]">{weapon.levelTemplateId}</dd>
        </dl>
      </div>

      {weapon.description && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.weaponDesc')}</div>
          {/* ... */}
        </div>
      )}
    </div>
  )
}
```

### 6.3 `src/pages/enemies/EnemyDetail.tsx`

```tsx
import { useI18n } from '../../i18n'

export default function EnemyDetail() {
  const { t } = useI18n()
  // ...

  const resistMap: Record<string, string> = {
    physicalDmgResistScalar: t('enemy.physical'),
    fireDmgResistScalar: t('enemy.fire'),
    crystDmgResistScalar: t('enemy.cryst'),
    pulseDmgResistScalar: t('enemy.pulse'),
    naturalDmgResistScalar: t('enemy.natural'),
  }

  if (loading) return <Skeleton className="h-32 w-full" />
  if (!enemy) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('enemy.title') })}</div>

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link to="/archive/enemies" className="text-xs text-archive-lead hover:text-archive-gold transition-colors">
          &larr; {t('common.backToList', { list: t('enemy.title') })}
        </Link>
      </div>
      {/* ... */}

      {enemy.description && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('enemy.description')}</div>
          {/* ... */}
        </div>
      )}

      {enemy.distributionIds.length > 0 && Object.keys(distNameMap).length > 0 && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1.5">{t('enemy.distribution')}</div>
          {/* ... */}
        </div>
      )}

      {!extraLoading && abilities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-archive-gold mb-2">{t('enemy.skill')}</h3>
          {/* ... */}
        </div>
      )}
      {/* ... */}
    </div>
  )
}
```

### 6.4 `src/pages/races/RaceList.tsx` 与 `RaceDetail.tsx`

RaceList:

```tsx
const { t } = useI18n()
// ...
<h2 className="font-display text-xl font-bold text-archive-ivory">{t('race.title')}</h2>
<span className="text-xs text-archive-lead">{t('common.countPeople', { count: race.members.length })}</span>
```

RaceDetail:

```tsx
const { t } = useI18n()
// ...
<h3 className="text-sm font-medium text-archive-dust mb-2">{t('race.relatedRecords')}</h3>
<h3 className="text-sm font-medium text-archive-dust mb-2">{t('race.members')}</h3>
```

### 6.5 `src/pages/factions/FactionList.tsx` 与 `FactionDetail.tsx`

与 Race 类似，标题使用 `t('faction.title')`，标签使用 `t('faction.relatedRecords')` 与 `t('faction.members')`。

## 7. 第五阶段：其他页面与组件

### 7.1 `src/pages/story/StoryOverview.tsx`

```tsx
const { t } = useI18n()
// ...
<h2 className="font-display text-xl font-bold text-archive-ivory">{t('story.title')}</h2>
```

### 7.2 `src/pages/professions/ProfessionOverview.tsx`

```tsx
const { t } = useI18n()
// ...
<h2 className="font-display text-xl font-bold text-archive-ivory">{t('profession.title')}</h2>
<h3 className="text-sm font-medium text-archive-gold mb-2 tracking-wider">{t('profession.profession')}</h3>
<h3 className="text-sm font-medium text-archive-gold mb-2 tracking-wider">{t('profession.element')}</h3>
```

### 7.3 `src/pages/updates/UpdateHome.tsx`

```tsx
const { t } = useI18n()
// ...
<h2 className="font-display text-xl font-bold text-archive-ivory">{t('update.title')}</h2>
<p className="text-sm text-archive-dust mb-6">
  {t('update.versionPair', { count: manifest.folders.length })} · {t('update.lastGenerated', { time: manifest.generatedAt })}
</p>
<h3 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
  {t('update.generatedAt', { time: manifest.generatedAt })}
</h3>
<p className="text-xs text-archive-lead mt-2">
  {t('update.tableChanged', { count: folder.fileCount })}
</p>
```

### 7.4 `src/pages/updates/UpdateSummary.tsx`

```tsx
const { t } = useI18n()
// ...
if (!versionName) return <div className="text-red-400 text-sm">{t('common.missingParam')}</div>
if (!folder) {
  return (
    <div>
      <p className="text-archive-dust text-sm mb-4">{t('update.loadingVersion')}</p>
      {/* ... */}
    </div>
  )
}
// ...
<Link to="/archive/updates">← {t('update.backToList')}</Link>
<StatCard label={t('update.added')} value={totalAdded} color="#26bbfd" />
<StatCard label={t('update.removed')} value={totalRemoved} color="#ef4444" />
<StatCard label={t('update.changed')} value={totalChanged} color="#ffbb03" />
<h3 className="text-sm font-medium text-archive-ivory mb-3">
  {t('update.tableList', { count: tables.length })}
</h3>
<button onClick={() => setMaxTables(Infinity)}>
  {t('update.showAll', { count: tables.length })}
</button>
```

### 7.5 `src/pages/updates/UpdateTableDiff.tsx`

```tsx
const { t } = useI18n()
// ...
if (!versionName || !tableFile) return <div className="text-red-400 text-sm">{t('common.missingParam')}</div>
if (loading) return <Skeleton className="h-32 w-full" />
if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
if (!diff) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>
// ...
<Link to={`/archive/updates/${versionName}`}>← {t('update.backToSummary')}</Link>
<p className="text-sm text-archive-lead">
  {t('update.versionLabel', { old: diff.versionOld, new: diff.versionNew })}
</p>
```

### 7.6 `src/components/Items/RewardPanel.tsx`

```tsx
const { t } = useI18n()
// ...
<div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('reward.contains')}</div>
<div className="text-[10px] text-archive-ivory mb-1">{t('reward.fixed')}</div>
<div className="text-[10px] text-archive-ivory mb-1">{t('reward.random')}</div>
```

### 7.7 `src/components/Weapons/WeaponSkillPanel.tsx`

```tsx
const { t } = useI18n()
// ...
<span className="text-[10px] text-archive-lead font-mono ml-auto">{t('common.level', { level: current.level })}</span>
<div className="flex justify-between text-[10px] text-archive-lead mt-1">
  <span>{t('common.level', { level: sorted[0].level })}</span>
  <span>{t('common.level', { level: sorted[sorted.length - 1].level })}</span>
</div>
```

## 8. 第六阶段：测试与验证

### 8.1 新增单元测试 `src/i18n/index.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { translate } from './index'

describe('i18n translate', () => {
  it('returns current locale text', () => {
    expect(translate('EN', 'nav.operators')).toBe('Operators')
  })

  it('falls back to CN when key missing in target locale', () => {
    expect(translate('EN', 'site.name')).toBe('宏山档案局')
  })

  it('falls back to key when missing everywhere', () => {
    expect(translate('CN', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('replaces variables', () => {
    expect(translate('CN', 'common.countPeople', { count: 3 })).toBe('3 人')
  })
})
```

### 8.2 组件测试更新

- `Sidebar.test.tsx`：切换语言后验证导航文案。
- `OperatorList.test.tsx`：验证筛选器占位符语言。
- `WeaponDetail.test.tsx`：验证标签语言。

### 8.3 E2E 测试

新增 `tests/e2e/i18n.spec.ts`：

```ts
import { test, expect } from '@playwright/test'

test('切换语言后导航与筛选器文案更新', async ({ page }) => {
  await page.goto('/archive')
  await expect(page.locator('nav')).toContainText('干员档案')
  await page.locator('button:has-text("简中")').click()
  await page.locator('button:has-text("English")').click()
  await expect(page.locator('nav')).toContainText('Operators')
  await page.goto('/archive/operators')
  await expect(page.locator('select').first()).toContainText('All Elements')
})
```

### 8.4 静态扫描

新增脚本 `scripts/check-i18n.ts`（或 shell 脚本），扫描 `src/` 中是否仍有未通过 `t()` 包裹的中文硬编码。由于实现阶段全部替换完成，该脚本可先作为本地检查工具，后续纳入 CI。

## 9. 翻译字典内容

### 9.1 字典 key 总表

下表列出所有需要翻译的 key 及其在 CN 中的值。其他语言字典由 `scripts/generate-i18n-dicts.ts` 根据 `GET /i18n` 返回的 locale 列表，按相同 key 填充对应译文。若 API 新增了 locale（如 `DE`、`FR`），重新运行脚本即可自动产出对应字典，无需手动枚举。

| key | CN 译文 | 来源 |
|-----|---------|------|
| `site.name` | 宏山档案局 | 站点品牌 |
| `site.subtitle` | 塔卫二官方档案管理与调阅系统 | 站点品牌 |
| `site.enter` | 进入档案局 | 站点品牌 |
| `site.homeTitle` | 档案局总览 | 站点品牌 |
| `site.homeSubtitle` | 选择一卷档案开始调阅 | 站点品牌 |
| `site.footer` | 宏山档案局 · 塔卫二官方档案管理与调阅系统 | 站点品牌 |
| `site.dataSource` | 数据来源：天师数据库 API · 管理员记录 | 站点品牌 |
| `site.placeholder` | 该卷宗正在整理中 | 站点品牌 |
| `nav.archive` | 档案局 | 导航 |
| `nav.personnel` | 人事档案 | 导航 |
| `nav.personnelDesc` | 干员、种族与阵营 | 导航 |
| `nav.threat` | 威胁档案 | 导航 |
| `nav.threatDesc` | 敌对生物与武装情报 | 导航 |
| `nav.material` | 物资档案 | 导航 |
| `nav.materialDesc` | 道具、武器、装备与生产 | 导航 |
| `nav.geography` | 地理档案 | 导航 |
| `nav.geographyDesc` | 塔卫二区域与探索 | 导航 |
| `nav.chronicle` | 大事记 | 导航 |
| `nav.chronicleDesc` | 叙事与版本变更记录 | 导航 |
| `nav.operators` | 干员档案 | 官方 i18n |
| `nav.operatorsDesc` | 可操作角色一览 | 站点自定义 |
| `nav.races` | 干员种族 | 站点自定义 |
| `nav.racesDesc` | 种族资料归集 | 站点自定义 |
| `nav.factions` | 干员阵营 | 站点自定义 |
| `nav.factionsDesc` | 势力归属梳理 | 站点自定义 |
| `nav.enemies` | 敌人图鉴 | 官方 i18n |
| `nav.enemiesDesc` | 敌对生物与武装 | 站点自定义 |
| `nav.items` | 道具材料 | 站点自定义 |
| `nav.itemsDesc` | 物资与收集品 | 站点自定义 |
| `nav.weapons` | 武器档案 | 官方 i18n |
| `nav.weaponsDesc` | 模块化武器记录 | 站点自定义 |
| `nav.equipment` | 装备系统 | 官方 i18n |
| `nav.equipmentDesc` | 装备宝石套装 | 站点自定义 |
| `nav.factory` | 工厂系统 | 站点自定义 |
| `nav.factoryDesc` | 自动化生产线 | 站点自定义 |
| `nav.areas` | 地区地理 | 站点自定义 |
| `nav.areasDesc` | 地域分布与探索 | 站点自定义 |
| `nav.story` | 剧情记录 | 站点自定义 |
| `nav.storyDesc` | 叙事资料归档 | 站点自定义 |
| `nav.updates` | 更新日志 | 站点自定义 |
| `nav.updatesDesc` | 版本间数据变更 | 站点自定义 |
| `common.all` | 全部 | 官方 i18n |
| `common.allType` | 全部类型 | 站点自定义 |
| `common.allRarity` | 全部稀有度 | 站点自定义 |
| `common.allStar` | 全部星级 | 站点自定义 |
| `common.allShowingType` | 全部显示类型 | 站点自定义 |
| `common.allValuableTab` | 全部贵重标签 | 站点自定义 |
| `common.search` | 搜索 | 官方 i18n |
| `common.searchWithName` | 搜索{{name}}名称或 ID… | 站点自定义 |
| `common.sort` | 排序 | 官方 i18n |
| `common.defaultSort` | 默认排序 | 站点自定义 |
| `common.group` | 分组 | 站点自定义 |
| `common.noGroup` | 不分组 | 站点自定义 |
| `common.asc` | 正序 | 站点自定义 |
| `common.desc` | 倒序 | 站点自定义 |
| `common.prev` | 上一页 | 官方 i18n |
| `common.next` | 下一页 | 官方 i18n |
| `common.back` | 返回 | 官方 i18n |
| `common.backToList` | 返回{{list}}列表 | 站点自定义 |
| `common.loading` | 加载中 | 官方 i18n |
| `common.loadFailed` | 加载失败 | 官方 i18n |
| `common.empty` | 暂无记录 | 站点自定义 |
| `common.noResult` | 未找到匹配{{name}} | 站点自定义 |
| `common.missingParam` | 缺少参数 | 站点自定义 |
| `common.countUnit` | {{count}} 个 | 站点自定义 |
| `common.countPeople` | {{count}} 人 | 站点自定义 |
| `common.countKind` | {{count}} 种 | 站点自定义 |
| `common.countPiece` | {{count}} 件 | 站点自定义 |
| `common.page` | 页 | 站点自定义 |
| `common.level` | 等级 {{level}} | 站点自定义 |
| `common.unknown` | 未知 | 站点自定义 |
| `operator.title` | 干员档案 | 官方 i18n |
| `operator.allElements` | 全部元素 | 站点自定义 |
| `operator.allProfessions` | 全部职业 | 站点自定义 |
| `operator.allRarities` | 全部稀有度 | 站点自定义 |
| `operator.allTags` | 全部Tags | 站点自定义 |
| `operator.allRaces` | 全部种族 | 官方 i18n |
| `operator.allFactions` | 全部阵营 | 站点自定义 |
| `operator.allMainAttrs` | 全部主属性 | 站点自定义 |
| `operator.allSubAttrs` | 全部副属性 | 站点自定义 |
| `operator.sortByProfession` | 职业 | 官方 i18n |
| `operator.sortByRarity` | 稀有度 | 官方 i18n |
| `operator.sortByElement` | 元素 | 官方 i18n |
| `operator.sortByRace` | 种族 | 官方 i18n |
| `operator.sortByFaction` | 阵营 | 站点自定义 |
| `operator.groupByElement` | 元素 | 官方 i18n |
| `operator.groupByProfession` | 职业 | 官方 i18n |
| `operator.groupByRarity` | 稀有度 | 官方 i18n |
| `operator.groupByRace` | 种族 | 官方 i18n |
| `operator.groupByFaction` | 阵营 | 站点自定义 |
| `operator.groupByMainAttr` | 主属性 | 站点自定义 |
| `operator.rarityLevel` | 稀有度 {{level}} | 站点自定义 |
| `operator.skill` | 技能 | 官方 i18n |
| `operator.talent` | 干员天赋 | 站点自定义 |
| `operator.factorySkill` | 后勤技能 | 站点自定义 |
| `operator.break` | 精英化 | 官方 i18n |
| `operator.attrBoost` | 能力值提升 | 站点自定义 |
| `operator.equipFit` | 装备适配 | 站点自定义 |
| `operator.profileRecords` | 档案记录 | 站点自定义 |
| `operator.voiceRecords` | 语音记录 | 站点自定义 |
| `operator.mainAttr` | 主能力 | 站点自定义 |
| `operator.subAttr` | 副能力 | 站点自定义 |
| `operator.skillType.0` | 普通攻击 | 站点自定义 |
| `operator.skillType.1` | 主动技能 | 站点自定义 |
| `operator.skillType.2` | 必杀技能 | 站点自定义 |
| `operator.skillType.3` | 连携技能 | 站点自定义 |
| `weapon.title` | 武器档案 | 官方 i18n |
| `weapon.allTypes` | 全部类型 | 站点自定义 |
| `weapon.skill1` | 技能一 | 站点自定义 |
| `weapon.skill2` | 技能二 | 站点自定义 |
| `weapon.skill3Prefix` | 技能三前缀 | 站点自定义 |
| `weapon.sortByRarity` | 稀有度 | 官方 i18n |
| `weapon.sortByType` | 武器类型 | 站点自定义 |
| `weapon.groupByType` | 按武器类型分组 | 站点自定义 |
| `weapon.itemDesc` | 物品描述 | 站点自定义 |
| `weapon.itemExplain` | 道具说明 | 站点自定义 |
| `weapon.basicInfo` | 基本信息 | 站点自定义 |
| `weapon.weaponDesc` | 武器说明 | 站点自定义 |
| `weapon.weaponId` | 武器 ID | 站点自定义 |
| `weapon.maxLevel` | 最大等级 | 官方 i18n |
| `weapon.breakTemplate` | 突破模板 | 站点自定义 |
| `weapon.levelTemplate` | 升级模板 | 站点自定义 |
| `enemy.title` | 敌人图鉴 | 站点自定义 |
| `enemy.allStars` | 全部星级 | 站点自定义 |
| `enemy.allGroups` | 全部阵营 | 站点自定义 |
| `enemy.sortByStar` | 敌人星级 | 站点自定义 |
| `enemy.sortByName` | 名称 | 官方 i18n |
| `enemy.groupByGroup` | 按阵营分组 | 站点自定义 |
| `enemy.description` | 描述 | 官方 i18n |
| `enemy.distribution` | 分布区域 | 站点自定义 |
| `enemy.skill` | 技能 | 官方 i18n |
| `enemy.attrs` | 属性（等级 {{level}}） | 站点自定义 |
| `enemy.fixedAttrs` | 固定属性 | 站点自定义 |
| `enemy.resist` | 抗性 | 站点自定义 |
| `enemy.resilience` | 韧性 | 站点自定义 |
| `enemy.variants` | 变体（{{count}}） | 站点自定义 |
| `enemy.basicInfo` | 基本信息 | 站点自定义 |
| `enemy.id` | ID | 站点自定义 |
| `enemy.templateId` | 模板 ID | 站点自定义 |
| `enemy.enemyId` | 敌人 ID | 站点自定义 |
| `enemy.maxLevel` | 最大等级 | 官方 i18n |
| `enemy.physical` | 物理 | 官方 i18n |
| `enemy.fire` | 灼热 | 官方 i18n |
| `enemy.cryst` | 寒冷 | 官方 i18n |
| `enemy.pulse` | 电磁 | 官方 i18n |
| `enemy.natural` | 自然 | 官方 i18n |
| `race.title` | 种族一览 | 站点自定义 |
| `race.relatedRecords` | 相关记载 | 站点自定义 |
| `race.members` | 所属干员 | 站点自定义 |
| `faction.title` | 势力阵营 | 站点自定义 |
| `faction.relatedRecords` | 相关记载 | 站点自定义 |
| `faction.members` | 所属干员 | 站点自定义 |
| `item.title` | 道具材料 | 站点自定义 |
| `item.allTypes` | 全部类型 | 站点自定义 |
| `item.allShowingTypes` | 全部显示类型 | 站点自定义 |
| `item.allValuableTabs` | 全部贵重标签 | 站点自定义 |
| `item.sortByShowingType` | 显示类型 | 站点自定义 |
| `item.sortByRarity` | 稀有度 | 官方 i18n |
| `item.sortByType` | 物品类型 | 站点自定义 |
| `item.groupByShowingType` | 按显示类型分组 | 站点自定义 |
| `item.groupByType` | 按物品类型分组 | 站点自定义 |
| `item.groupByValuableTab` | 按贵重标签分组 | 站点自定义 |
| `profession.title` | 职业与属性 | 站点自定义 |
| `profession.profession` | 职业 | 官方 i18n |
| `profession.element` | 属性形态 | 站点自定义 |
| `story.title` | 剧情记录 | 站点自定义 |
| `update.title` | 更新日志 | 站点自定义 |
| `update.noUpdates` | 暂无更新记录 | 站点自定义 |
| `update.backToList` | 返回版本列表 | 站点自定义 |
| `update.backToSummary` | 返回版本概要 | 站点自定义 |
| `update.loadingVersion` | 正在加载版本信息… | 站点自定义 |
| `update.added` | 新增 | 站点自定义 |
| `update.removed` | 移除 | 站点自定义 |
| `update.changed` | 变更 | 站点自定义 |
| `update.tableList` | 变更表一览（{{count}} 个表） | 站点自定义 |
| `update.showAll` | 显示全部 {{count}} 个表 | 站点自定义 |
| `update.versionPair` | 共 {{count}} 个版本对 | 站点自定义 |
| `update.lastGenerated` | 最后一次生成 {{time}} | 站点自定义 |
| `update.generatedAt` | 生成于 {{time}} | 站点自定义 |
| `update.tableChanged` | {{count}} 个表有变更 | 站点自定义 |
| `update.versionLabel` | 版本：{{old}} → {{new}} | 站点自定义 |
| `reward.contains` | 包含内容 | 站点自定义 |
| `reward.fixed` | 固定奖励 | 站点自定义 |
| `reward.random` | 随机奖励 | 站点自定义 |

### 9.2 多语言译文示例

下表展示部分高频 key 的六语言译文，用于验证翻译来源与风格一致性。

| key | CN | TC | EN | JP | KR | RU |
|-----|----|----|----|----|----|----|
| `nav.operators` | 干员档案 | 幹員檔案 | Operator Files | オペレーター記録 | 오퍼레이터 도감 | Оперативники |
| `nav.weapons` | 武器档案 | 武器檔案 | Weapon Files | 武器記録 | 무기 도감 | Файлы оружия |
| `nav.items` | 道具材料 | 道具材料 | Item Files | アイテム記録 | 아이템 도감 | Файлы предметов |
| `nav.enemies` | 敌人图鉴 | 敵人圖鑑 | Threat Files | 脅威記録 | 위협 도감 | Файлы угроз |
| `common.sort` | 排序 | 排序 | Sort | 並び順 | 정렬 | Сортировать |
| `common.filter` | 筛选 | 篩選 | Filter | フィルタ | 필터 | Фильтр |
| `common.back` | 返回 | 返回 | Return | 戻る | 돌아가기 | Назад |
| `common.loading` | 加载中 | 載入中 | Loading | 読み込み中 | 로딩 중 | Loading |
| `common.loadFailed` | 数据加载失败 | 資料載入失敗 | Failed to load data | データのロードに失敗しました | 데이터를 불러오는 데 실패했습니다 | Не удалось загрузить данные |
| `common.all` | 全部 | 全部 | All | すべて | 모두 | Все |
| `operator.skill` | 技能 | 技能 | Skill | スキル | 스킬 | Навык |
| `operator.race` | 种族 | 種族 | Race | 種族 | 종족 | Раса |
| `weapon.maxLevel` | 最大等级 | 最大等級 | Max Level | 最大レベル | 최대 레벨 | Макс. уровень |
| `enemy.description` | 描述 | 描述 | Description | 説明 | 설명 | Описание |
| `update.added` | 新增 | 新增 | Added | 追加 | 추가 | Добавлено |
| `update.removed` | 移除 | 移除 | Removed | 削除 | 제거 | Удалено |
| `update.changed` | 变更 | 變更 | Changed | 変更 | 변경 | Изменено |

完整翻译字典由 `scripts/generate-i18n-dicts.ts` 自动生成：

1. 脚本首先调用 `GET /i18n` 获取服务器当前支持的 locale 列表；
2. 对 `OFFICIAL_IDS` 中的每个 key，调用 `/i18n/{locale}/{id}` 获取各语言官方译文；
3. 对 `CUSTOM` 中的站点自定义 key，按 locale 合并人工维护的译文；
4. 最终输出 `src/i18n/dicts/{locale}.json`。

因此，**不应直接手动编辑 `dicts/*.json`**；若需修正某个 key 的译文，应修改 `CUSTOM` 源数据并重新运行生成脚本。

## 10. 实现顺序

### 阶段一：基础设施（第 1 轮提交）

1. 新增 `scripts/generate-i18n-dicts.ts`，调用 `GET /i18n` 获取可用 locale 列表，并生成对应字典文件。
2. 运行生成脚本，产出 `src/i18n/dicts/{locale}.json`（locale 列表来自 API）。
3. 新增 `src/i18n/index.ts`，由生成脚本自动维护 import 列表。
4. 修改 `src/lib/locale.tsx`，增加 localStorage 持久化。
5. 修改 `src/App.tsx`，接入 `I18nProvider`。

### 阶段二：全局布局（第 2 轮提交）

1. 修改 `Sidebar.tsx`、`Breadcrumb.tsx`、`Footer.tsx`。
2. 修改 `PlaceholderPage.tsx`。
3. 修改 `Landing.tsx`、`ArchiveHome.tsx`。

### 阶段三：列表页（第 3 轮提交）

1. 修改 `OperatorList.tsx`。
2. 修改 `WeaponList.tsx`。
3. 修改 `EnemyList.tsx`。
4. 修改 `ItemList.tsx`。

### 阶段四：详情页（第 4 轮提交）

1. 修改 `OperatorDetail.tsx`。
2. 修改 `WeaponDetail.tsx`。
3. 修改 `EnemyDetail.tsx`。
4. 修改 `RaceList.tsx`、`RaceDetail.tsx`。
5. 修改 `FactionList.tsx`、`FactionDetail.tsx`。

### 阶段五：其他页面与组件（第 5 轮提交）

1. 修改 `StoryOverview.tsx`、`ProfessionOverview.tsx`。
2. 修改 `UpdateHome.tsx`、`UpdateSummary.tsx`、`UpdateTableDiff.tsx`。
3. 修改 `RewardPanel.tsx`、`WeaponSkillPanel.tsx`。

### 阶段六：测试与验证（第 6 轮提交）

1. 新增 `src/i18n/index.test.ts`。
2. 更新相关组件测试。
3. 新增 E2E 测试 `tests/e2e/i18n.spec.ts`。
4. 运行 `npm run lint`、`npm run test`、`npm run build`。
5. 全语言人工走查。

## 11. 验收标准

- [ ] `src/` 中无新增硬编码中文静态文案（测试文件中的中文断言除外）。
- [ ] 切换 `CN / TC / EN / JP / KR / RU` 后，导航、筛选器、按钮、提示即时刷新。
- [ ] 翻译缺失时按 `目标语言 → 简中 → key` 回退，不空白、不报错。
- [ ] `npm run build` 通过，无 TypeScript 错误。
- [ ] `npm run lint` 通过，无新增错误。
- [ ] `npm run test` 通过。
- [ ] E2E 新增语言切换用例通过。

## 12. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 字典体积过大 | 构建产物增长 | 仅支持 6 种语言，避免一次性引入全部 14 种 API 语言 |
| key 遗漏导致部分文案仍显示中文 | 体验不一致 | 实现后使用静态扫描工具全量检查 |
| 翻译变量占位符格式不一致 | 显示异常 | 统一使用 `{{name}}` 格式 |
| 列表页 `useMemo` 依赖未更新 | 切换语言不刷新 | 所有依赖 `t` 的 memo/useEffect 加入 locale 依赖 |
| 繁中/简中部分 key 未区分 | 显示错误 | 分别维护 TC.json 与 CN.json |

回滚策略：本改动为纯前端文案层，若出现严重问题，可直接回滚 `feat/i18n-globalization` 分支到方案提交点，不影响数据与接口。

## 13. 相关文档

- [[20260719-globalization-i18n|宏山档案局界面国际化完善方案]]
- [[20260719-globalization-i18n|宏山档案局界面国际化完善技术方案]]
- [[common-rules|通用开发规范]]
- [[frontend-spec|前端开发规范]]
- [[engineering-spec|工程架构规范]]
