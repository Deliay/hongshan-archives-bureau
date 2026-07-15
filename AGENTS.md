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

- `resolveI18n(field, i18nMap)`: resolves `{ id, text }` i18n fields — `i18nMap[id] ?? field.text ?? ''`. Use `i18nMap[String(field.id)]` since 64-bit IDs become strings after `safeParse`.
- `adaptOperator(raw, i18nMap, professionMap, elementMap, battleTagMap, attrMap)` — transforms raw table entries to typed `Operator` objects, resolving all text fields via i18n and lookup maps
- Each `adapt*` function follows the same pattern: destructure raw fields, resolve i18n, return typed object
- Icons built as: `` `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/{category}/${field}.png` ``

## Rich Text (`src/lib/richText.tsx`)

- **Parser**: Stack-based, matches Blazor `RichTextRender` logic. Master regex: `(<(@|#)?(.*?)>)|(<\/.*?>)|(\n)`
- **Tags**: `color`, `mark`, `b`, `br`, `align`, `image`. `image` with `="path"` attr is orphan; bare `<image>path</image>` uses inline text as src.
- **Hyperlinks**: `#` prefix → clickable button with tooltip (`HyperlinkTag` + `HyperlinkTooltip`). `@` prefix → styled span (color via `STYLE_COLORS` mapping).
- **Style colors**: `RichTextStyleTable` async loading is unreliable in Vite HMR. Hardcode common `ba.*` colors in `STYLE_COLORS` instead (natur→`#b4d945`, fire→`#ff623d`, poise→`#ffbb03`, heal→`#26bbfd`, etc.).
- **HyperlinkTooltip**: Content (name/desc from `HyperlinkTextTable`) can itself contain rich text — render through `<RichText>` recursively. Position via `useEffect` + `getBoundingClientRect` to stay in viewport.
- **I18NText**: Resolves `{ id, text }` → locale text → `<RichText>`.
- **`ensureStyleTable`** was removed — the async module-level cache pattern doesn't trigger React re-renders properly. Use synchronous state + `useEffect` for data that triggers re-render.

## Data Mapping Tables

| Table | Key | Fields | Used For |
|---|---|---|---|---|
| CharacterTable | `charId` | `profession`, `charTypeId`, `rarity`, `mainAttrType`, `subAttrType`, `charBattleTagIds[]`, `name` (i18n), `profileRecord[]`, `profileVoice[]` | Operators |
| CharProfessionTable | numeric ID | `name` (i18n), `iconId` | Profession icons/names |
| CharTypeTable | string key | `name` (i18n), `color`, `icon` | Element icons/names/colors |
| CharBattleTagTable | string key | (i18n of value) | Battle tags |
| AttributeMetaTable | numeric attrType | `iconName` | Attribute icons |
| AttributeShowConfigTable | numeric attrType | `list[0].name` (i18n) | Attribute display names |
| CompositeAttributeShowConfigTable | `"Main"`, `"Sub"`, `"All"` | Attribute group config | Attribute grouping |
| WeaponBasicTable | `weaponId` | `name` (i18n), `rarity`, `weaponDesc`, `decoDesc` | Weapons |
| CharGrowthTable | `charId` | `skillGroupMap`, `skillLevelUp`, `charBreakCostMap`, `talentNodeMap` | Operator growth, skills, talents |
| SkillPatchTable | `skillId` | `SkillPatchDataBundle[]` (blackboard, coolDown, skillName, description, etc.) | Skill level data |
| HyperlinkTextTable | string key | `name` (i18n), `desc` (i18n), `iconPath` | Hyperlink tooltip content (in rich text) |
| RichTextStyleTable | string key | `preDef[]`, `postDef[]` | Style definitions for rich text tags |
| SpaceshipCharSkillTable | `charId` | `maxSkillCount`, `skillList[]` (charId, skillId, unlockHint) | Factory/spaceship skill mapping |
| SpaceshipSkillTable | `skillId` | `name`, `desc`, `icon`, `roomType`, `effectType`, `parameters` | Factory/spaceship skill data |
| ItemTable | `itemId` | `name` (i18n), `rarity`, `type` (numeric), `desc` (i18n), `decoDesc` (i18n), `iconId`, `iconCompositeId`, `obtainWayIds[]`, `noObtainWayHint` (i18n) | Items/materials |
| ItemTypeTable | numeric string | `name` (i18n), `itemType`, `storageSpace` | Item type display names |
| FullBottleTable | `itemId` | `liquidId`, `liquidCapacity` | Item full-bottle liquid overlay |
| SystemJumpTable | `wayId` | `iconId`, `desc` (i18n) | Item obtain way hints |
| UsableItemChestTable | `itemId` | `rewardIdList[]` | Item chest contents |

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

**Important**: Each table has its own i18n dict. Using the wrong table's dict (e.g., `SkillPatchTable` dict for `SpaceshipSkillTable` data) results in empty/fallback text. Always pair `getTableI18nDict(table, locale)` with the correct table name.

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

## Key Conventions

- No comments in production code
- No emojis unless requested
- `ASSET_BASE` exported from `adapter.ts`, imported by `useData.ts`
- AttributeShowConfigTable has nested `{ list: [{ name: { id, text } }] }` structure
- Rarity levels map to colors: `['black', 'black', 'gray', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']`
- Card layout: portrait (left) + name/rarity (right) / element+profession+attr / tags (each on own line)
- Filters and sort implemented as local state in list pages (useState + useMemo)
- Build command: `npm run build` (tsc + vite)

## Common Pitfalls

### 64-bit Integer IDs
API data uses 64-bit integer IDs that exceed `Number.MAX_SAFE_INTEGER`. When `safeParse` quotes them, they become strings. Always use `String(field.id)` when looking up in i18n dicts — never assume `field.id` is a number.

### Talent Node Name/Icon Location
Talent nodes have different data structures depending on `nodeType`:
- `nodeType === 3` (attribute): name in `attributeNodeInfo.title`/`.desc`, icon via `talenttreeicon/icon_talenttree_{attrType}.png`
- `nodeType === 4` (passive skill): name in `passiveSkillNodeInfo.name`, icon via `skillicon/{iconId}.png`
- `nodeType === 5` (factory): references `SpaceshipCharSkillTable[charId].skillList[index].skillId`, then `SpaceshipSkillTable[skillId]`
- `nodeType === 1/2` (break): icon via `talenticon/{iconId}.png`

### Skill Data
In `SkillPatchDataBundle`, `skillName` and `description` fields are often empty locale maps `{ id: 0, text: "" }`. The actual skill name comes from `CharGrowthTable.skillGroupMap[groupId].name`, and the description from `.desc` with blackboard (`{key}`) substitution using values from the skill patch's `blackboard` array.

### RichTextStyleTable
Async loading of `RichTextStyleTable` via `getCachedData` does not trigger React re-renders properly because the cache is module-level, not React state. Hardcode the common `ba.*` style colors in `STYLE_COLORS` instead. The table contains `preDef[0]` (opening tags like `<color=#b4d945>`) and `postDef[0]` (closing tags like `</color>`) — only index 0 is used by the Blazor source.

### Raw Data Components Must Fetch I18n
Components like `ItemPanel` and `ItemTooltip` that fetch raw table data directly (not through adapted hooks) must also fetch the table's i18n dict. Raw `{ id, text }` locale objects do NOT have locale keys — the actual locale text is in the i18n dict. Never access `ref[locale]` on a raw name/desc field. Always use `resolveI18n(raw.name, i18nMap)` or fall back to the i18n dict lookup pattern `i18nMap[String(raw.name.id)] || raw.name.text || ''`.

### Factory Skills (nodeType 5)
Data flow: `talentNodeMap[nodeId].factorySkillNodeInfo.index` → index into `SpaceshipCharSkillTable[charId].skillList[]` → `skillId` → `SpaceshipSkillTable[skillId]` for actual name/desc/icon. i18n dict comes from `SpaceshipSkillTable`, not `SkillPatchTable`.

### Hyperlink Tooltip Positioning
Fixed-position tooltips (`position: fixed`) must be measured after render via `getBoundingClientRect` and adjusted if they extend beyond the viewport. Always use `useEffect` for post-render position calculation, not inline style computation.

### Item Tooltip
`ItemTooltipOverlay` uses a centered modal (`fixed inset-0`) — this is safe for viewport overflow. The `HyperlinkTooltip` component uses positioned tooltips and needs manual viewport clamping.
