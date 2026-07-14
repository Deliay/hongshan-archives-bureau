# Agents Guide

## Project Overview

Hongshan Archives Bureau — a React + TypeScript + Vite + Tailwind CSS 4 static site for browsing Endfield game data. Data is fetched at build/runtime from `https://endfield-assets.fffdan.com`.

## Architecture

- **Routing**: react-router-dom v7, `<BrowserRouter>` with an `<ArchiveLayout>` wrapper shell
- **Styling**: Tailwind CSS 4 (no `tailwind.config.js`), dark theme (`#0F0F12` bg, `#E8E6E3` text, `#C9A96E` accent gold)
- **Caching**: 2-tier — in-memory LRU (100 entries) + IndexedDB persistence; cache invalidated when server version changes
- **Data flow**: Pages use domain hooks from `useData.ts` → hooks call `getCachedData` → data fetched via `api.ts` → raw data adapted by `adapter.ts` into typed interfaces

## Directory Layout

```
src/
  lib/           API client, adapter, cache, types, locale context
  hooks/         All data-fetching hooks (useData.ts)
  components/    Reusable UI components (Rarity, Layout/*)
  pages/         Page components by domain (operators/, weapons/, enemies/, ...)
  routes/        Top-level route components (Landing, ArchiveHome)
  data/          Static constants (constants.ts)
tests/
  e2e/           Playwright E2E tests
```

## API Layer (`src/lib/api.ts`)

- Base: `https://endfield-assets.fffdan.com`
- Endpoints:
  - `GET /table/{table}/all` — full table dump
  - `GET /table/{table}/{key}` — single entry
  - `GET /i18n/dict/{locale}/table/{table}/all` — i18n flat dict (keys are 64-bit i18n IDs as strings)
  - `GET /i18n` — available locales
- **64-bit integers**: IDs exceeding `Number.MAX_SAFE_INTEGER` must be handled — `api.ts` has `safeParse` that quotes `-?\d{17,}` numbers before `JSON.parse`
- `fetchTableAll`, `fetchTableEntry`, `fetchTableDictAll`, `fetchI18nLocales`

## Data Adapter (`src/lib/adapter.ts`)

- `RESOLVE_I18N(field, i18nMap)`: resolves `{ id, text }` i18n fields — `i18nMap[id] ?? field.text ?? ''`
- `adaptOperator(raw, i18nMap, professionMap, elementMap, battleTagMap, attrMap)` — transforms raw table entries to typed `Operator` objects, resolving all text fields via i18n and lookup maps
- Each `adapt*` function follows the same pattern: destructure raw fields, resolve i18n, return typed object
- Icons built as: `` `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/{category}/${field}.png` ``

## Data Mapping Tables

| Table | Key | Fields | Used For |
|---|---|---|---|
| CharacterTable | `charId` | `profession`, `charTypeId`, `rarity`, `mainAttrType`, `subAttrType`, `charBattleTagIds[]`, `name` (i18n), `profileRecord[]`, `profileVoice[]` | Operators |
| CharProfessionTable | numeric ID | `name` (i18n), `iconId` | Profession icons/names |
| CharTypeTable | string key | `name` (i18n), `color`, `icon` | Element icons/names/colors |
| CharBattleTagTable | string key | (i18n of value) | Battle tags |
| AttributeMetaTable | numeric attrType | `iconName` | Attribute icons |
| AttributeShowConfigTable | numeric attrType | `list[0].name` (i18n) | Attribute display names |
| CompositeAttributeShowConfigTable | `"Main"`, `"Sub"`, `"All"` | Attribute group config | Attribute grouping |
| WeaponBasicTable | `weaponId` | `name` (i18n), `rarity`, `weaponDesc`, `decoDesc` | Weapons |

## Data Flow Pattern (example: operators)

```
OperatorList
  └─ useOperators()
       └─ useData(async () => {
            CharacterTable + i18n  ─┐
            CharProfessionTable + i18n  ├─ Promise.all ── adaptOperator(raw, i18nMap, profMap, elemMap, tagMap, attrMap)
            CharTypeTable + i18n    ─┘
            CharBattleTagTable + i18n
            AttributeMetaTable + AttributeShowConfigTable + i18n
          }) → Operator[]
```

### Per-table I18n

Each table's text is resolved at the hook level: the hook fetches the table data and the locale's i18n dict in parallel, then passes the dict into `adapt*`. Domain hooks (`getProfessionMap`, `getElementMap`, `getBattleTagMap`, `getAttributeMap`) are cached per locale in `Map<string, Promise<...>>`.

## Key Conventions

- No comments in production code
- No emojis unless requested
- `ASSET_BASE` exported from `adapter.ts`, imported by `useData.ts`
- AttributeShowConfigTable has nested `{ list: [{ name: { id, text } }] }` structure
- Rarity levels map to colors: `['black', 'black', 'gray', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']`
- Card layout: portrait (left) + name/rarity (right) / element+profession+attr / tags (each on own line)
- Filters and sort implemented as local state in list pages (useState + useMemo)
- Build command: `npm run build` (tsc + vite)
