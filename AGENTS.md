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
| ItemShowingTypeTable | numeric string | `name` (i18n), `icon`, `sortId`, `type` | Item showing type names/icons |
| ValuableDepot | numeric string | `name` (i18n), `icon`, `storageItemType[]`, `type` | Item valuable tab type names/icons |
| FullBottleTable | `itemId` | `liquidId`, `liquidCapacity` | Item full-bottle liquid overlay |
| SystemJumpTable | `wayId` | `iconId`, `desc` (i18n) | Item obtain way hints |
| UsableItemChestTable | `itemId` | `rewardIdList[]` | Item chest contents |
| TextTable | string key | `{ id, text }` i18n object | Global text strings, e.g. `LUA_WEAPON_TYPE_1` → weapon type names |
| EnemyTemplateDisplayInfoTable | `templateId` | `name` (i18n), `nickname` (i18n), `description` (i18n), `displayType`, `abilityDescIds[]`, `tags[]` | Enemy display info (name, desc, abilities, type) |
| EnemyTable | `enemyId` | `attrTemplateId`, `templateId`, `modelId` | Enemy raw data (no name/desc) |
| EnemyAbilityDescTable | `abilityId` | `name` (i18n), `description` (i18n) | Enemy ability descriptions |
| EnemyAttributeTemplateTable | `templateId` | `levelDependentAttributes[]`, `levelIndependentAttributes`, `physicalDmgResistScalar`, `fireDmgResistScalar`, etc. | Enemy combat attributes per level |
| EnemyTagTable | `tagId` | `tagText` (i18n) | Enemy tag display names |
| DisplayEnemyTypeTable | numeric string | `name` (i18n) | Enemy type names (Normal/Elite/Boss/Advanced/Leader) |
| WikiEntryDataTable | string key | `refMonsterTemplateId`, `groupId` | Maps enemies to wiki groups |
| WikiGroupTable | `groupId` | `list[]` with `groupName` (i18n), `iconId` | Wiki group definitions (天使, 裂地者, 宏山, 动物) |
| TagDataTable | tag ID like `tag_race_fox` | `tagName` (i18n), `tagGroupId`, `hideTag` | Race/hobby/expert/disposition/gift tags |
| TagGroupDataTable | group ID like `tag_group_race` | `tagGroupName` (i18n), `desc` (i18n) | Tag group categories (种族/专长/爱好/阵营等) |
| CharacterTagTable | `charId` | `raceTagId`, `blocTagId`, `dispositionTagIds[]`, `hobbyTagIds[]`, `expertTagIds[]`, `giftPreferTagId[]`, `behaviourHateTagIds[]`, `behaviourUnavailableTagIds[]` | Maps operators to their tags (race, bloc, hobbies, etc.) |
| CharacterTagDesTable | `charId` | `tagDesc` map: `{ tagId: { desc: { id, text }, tagId } }` | Per-character tag descriptions (not for race tags) |

### Per-table I18n

Each table's text is resolved at the hook level: the hook fetches the table data and the locale's i18n dict in parallel, then passes the dict into `adapt*`. Domain hooks (`getProfessionMap`, `getElementMap`, `getBattleTagMap`, `getAttributeMap`, `getRaceMap`) are cached per locale in `Map<string, Promise<...>>`.

**Race map** (`getRaceMap`): Fetches `TagDataTable` + i18n dict → filters `tagGroupId === 'tag_group_race'` to build `raceTagId → raceName`, then fetches `CharacterTagTable` to build `charId → raceName`. Used by `useOperators()`, `useOperator()`, and `useOperatorDetail()` to attach `op.race` to each operator.

**Race list** (`useRaces`): Same three-table fetch (`TagDataTable`, `CharacterTagTable`, `CharacterTable`) to produce `Race[]` with `{ id, name, members[] }`. Built data is cached under `__built_races` cache key to avoid recomputation in `useRaceDetail`.

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

### Blackboard % Format
`formatBlackboard` handles `{key:0.0%}` patterns by multiplying the value by 100 before applying decimal formatting and appending `%`. This matches .NET's numeric format string behavior where `%` means "multiply by 100".

### Weapon Type Names from TextTable
Weapon type names (单手剑/施术单元/双手剑/长柄武器/手铳) are stored in `TextTable` with keys `LUA_WEAPON_TYPE_{1,2,3,5,6}`. Fetch `TextTable` + i18n dict to resolve them at the hook level.

### Weapon Data Source (WeaponBasicTable + ItemTable)
Weapons have data in two tables: `WeaponBasicTable` (combat data: weaponType, skills, breakthrough, upgrade templates) and `ItemTable` (display data: name, decoDesc, iconId). The `ItemTable` key is the weaponId (e.g. `wpn_sword_0003`), NOT `item_wpn_xxx`. Always pair both tables when adapting weapons.

### Skill tagId
Each skill in `SkillPatchDataBundle[0]` has a `tagId` field that categorizes it (e.g. `"attr_str"`, `"attr_main"`, `"tactic"`). The third weapon skill (`sk_wpn_*`) always has `tagId: "tactic"`.

### EnemyTemplateDisplayInfoTable (not EnemyDisplayInfoTable)
Enemy names, descriptions, types, tags, and ability IDs come from `EnemyTemplateDisplayInfoTable` (keyed by `templateId`). This table does NOT have an `enemyId` field — use `templateId` as the canonical ID. `EnemyDisplayInfoTable` exists but `EnemyTemplateDisplayInfoTable` has richer data.

### Enemy Template ID as ID
`EnemyTemplateDisplayInfoTable` entries have `templateId` but no `enemyId`. Always fall back to `templateId` when building the enemy ID in `adaptEnemy`.

### Enemy Wiki Groups
Enemy faction/group membership is through `WikiEntryDataTable` (maps `refMonsterTemplateId` → `groupId`) + `WikiGroupTable` (group names with i18n). The `wiki_type_monster` entry in `WikiGroupTable` contains `list[]` with group definitions (天使/裂地者/宏山/动物).

### Enemy Ability Descriptions
`EnemyTemplateDisplayInfoTable.abilityDescIds[]` contains keys into `EnemyAbilityDescTable`. Each ability entry has `name` (often empty/0) and `description` (i18n). Fetch at component level — the detail page needs the raw display info table to find the right abilityDescIds for the given templateId.

### Enemy Attribute Template
`EnemyAttributeTemplateTable` contains per-level attribute arrays (`levelDependentAttributes[]` each with `{attrType, attrValue}`), fixed attributes (`levelIndependentAttributes`), damage resist scalars, and resilience stats.

## Diff System

### Architecture Overview

The diff system compares game data between two versions. It's a two-tier system:

1. **Build-time**: `scripts/diff-tables.ts` reads JSON dumps of two version directories, computes per-field diffs, and writes structured diff files.
2. **Runtime**: React components read diff JSON files via hooks and render them in `UpdateSummary.tsx`.

### Diff Script (`scripts/diff-tables.ts`)

- **Input**: Two directories under `endfield-data/` (version-old, version-new). Each contains `tables/` (game data JSON per table) and `i18n/` (i18n dicts per locale).
- **Output**: A version-pair directory (`{v1}__{v2}`) under `endfield-data/__diffs__/` with `<TableName>.json` and `I18nTextTable_{Locale}.json`.
- **I18n field detection**: `isI18nField()` checks `{ id, text }` shape (≤2 keys, only `id`/`text` keys). Matches exactly `{ id: number|string, text: string }` or `{ id }` or `{ text }`.
- **Entry-level diff**: For each key in a table, compare old vs new entries field by field recursively.
- **Field diff type**: Two types — `{ type: 'value', oldValue, newValue }` for primitive/structural changes; `{ type: 'i18n', changedLocales: { [locale]: { oldText, newText } } }` for i18n field changes (detected when a field's value is an `{ id, text }` i18n object, resolving text from each locale's dict).
- **`expandI18nFields()`**: Preprocesses old/new entry values before output: replaces `{ id, text }` objects with locale-keyed objects (`{ CN: "...", EN: "...", ... }`). This lets the frontend display locale-resolved text without re-fetching i18n dicts.
- **`deepDiff()`**: Recursively diffs objects/arrays. Changes are grouped: structural changes produce `{ type: 'value' }`, i18n field changes produce `{ type: 'i18n', changedLocales }` with the resolved locale texts.

### Runtime Diff Types (`src/lib/types-diff.ts`)

```typescript
interface FieldChange =
  | { type: 'value'; oldValue: any; newValue: any }
  | { type: 'i18n'; changedLocales: Record<string, { oldText: string; newText: string }> }

interface ChangedEntry { oldValue: Record<string, any>; newValue: Record<string, any>; changed: Record<string, FieldChange> }
```

- `TableDiff.entries.added/removed/changed`: each key maps to an entry (full entry for added/removed, `ChangedEntry` for changed).
- After `expandI18nFields`, `oldValue`/`newValue` contain locale-keyed objects for i18n fields (e.g. `{ CN: "攻击力", EN: "ATK" }`), NOT raw `{ id, text }`.

### Runtime Hooks (`src/hooks/useUpdateDiff.ts`)

- `useTableDiff(versionName, tableFileName)` → fetches the diff JSON via `fetchTableDiff`, returns `{ data: TableDiff | null, loading, error }`.
- Results cached via the 2-tier LRU + IndexedDB system (same as API data).
- `useOperatorAggregatedDiff(versionName)` — aggregates across 6 operator-related tables, linking entries to charIds for an operator-centric view.

### Diff Viewer Components (`src/components/DiffViewer/`)

#### Registry pattern
- `registry.tsx` maintains a `Map<string, ComponentType>` mapping table names to specialized diff viewers.
- `registerTableDiffComponent(tableName, component)` is called at module level in each specialized viewer.
- `getTableDiffComponent(tableName)` returns the registered component or falls back to `DiffViewer`.
- Registered viewers: `CharacterDiff` (干员), `CharGrowthDiff` (成长), `SkillPatchDiff` (技能), `PotentialTalentDiff` (潜能天赋), `SpaceshipSkillDiff` (基建技能), `SpaceshipCharSkillDiff` (基建关联), `WeaponDiff` (武器), `OperatorDiff` (复合).
- Each viewer receives `{ diff: TableDiff }` with locale from `diff.locale`.

#### Generic `DiffViewer`
- Three tabs: added / removed / changed.
- Added/removed: shows raw JSON with `formatJSON()` that handles locale-keyed objects nicely (shows locale labels instead of raw keys).
- Changed: iterates `entry.changed` paths. For `{ type: 'value' }` shows old/new side by side; for `{ type: 'i18n' }` shows per-locale old→new inline.

#### Specialized `CharacterDiff`
- Fetches lookup tables (professions, elements, attributes, battle tags) + i18n dicts to build operator cards with name/rarity/portrait.
- Uses `globalLocale` (via `useLocale()`) for lookup table API fetches — **not** `diff.locale`.
- Uses `diff.locale` only for `I18nTextTable` dict (to resolve i18n text in diff entries since `expandI18nFields` embeds locale data from that locale).
- Groups voice changes (`profileVoice[N].*`) by index, showing voice title+desc header from `newValue` before individual field diffs.
- `resolveFieldText()` handles both `{ id, text }` objects (via `resolveI18n`) and locale-keyed objects (from `expandI18nFields`).

#### `OperatorChangePanel`
- Aggregates 6 operator tables per charId, showing a single card per operator with all table changes.
- Table badges at top of card: shows which tables have changes, with count.
- Badge order follows `allDiffs` processing order in `useOperatorAggregatedDiff.ts`.
- Specialized rendering per table: `SkillPatchTable`→skill name+blackboard+RichText, `SpaceshipSkillTable`→name+desc+RichText, `PotentialTalentEffectTable`→generic change entries.
- Unlock info: `unlockType: 0`→初始解锁, `2`→精英阶段, `4`→信赖值.
- `unlockValue` display depends on related `unlockType` (looks up sibling field in the same entry).
- **Sort order**: Non-operator tables by change count descending, then the 6 operator tables (CharacterTable → CharGrowthTable → SkillPatchTable → SpaceshipSkillTable → SpaceshipCharSkillTable → PotentialTalentEffectTable) at the bottom.

#### `RichTextDiff`
- Renders inline i18n diffs within rich text content.
- Uses character-level longest common prefix/suffix to isolate the changed portion.
- **Only the differing middle part** is highlighted: old portion gets `line-through`+red background, new portion gets green background.
- Common prefix and suffix render normally through `<RichText>` (preserving all hyperlinks, colors, etc.).
- Accepts optional `formatter` for `formatBlackboard` substitution (used by SkillPatchTable diffs).

### Common Pitfalls

#### Separate Locale Domains
Two locale concepts coexist in diff components:
- **`diff.locale`**: The locale used when generating the diff (determines which i18n dict resolved locale-keyed objects in `expandI18nFields`). Used only for `I18nTextTable` lookups — these are the locale labels embedded in `changedLocales` keys.
- **`globalLocale`** (`useLocale()`): The user's current UI locale. Used for ALL API-fetched lookup tables (professions, elements, attributes, battle tags, etc.) in diff viewers.

Never use `diff.locale` for API fetches of lookup tables; never use `globalLocale` to interpret `changedLocales` keys.

#### Character Table Name Resolution
When an operator has changes in other tables but NOT in CharacterTable, the card name must be fetched from `CharacterTable` via API (fallback fetch). The name field may be:
- `{ id, text }` raw i18n object → use `resolveI18n(name, charI18nDict)`.
- Locale-keyed object (after `expandI18nFields`) → use `localeText(obj, locale)` which reads `obj[locale] || obj.CN`.

#### Profile Voice/Record Grouping
Voice changes come as `profileVoice[N].fieldName` paths. Always group by index N and show the voice title+desc header (from `newValue`) once before listing individual field diffs. The unlock info (`unlockType`/`unlockValue`) is at the `profileVoice[N]` level, not at individual field level.

#### unlockType/unlockValue Coupling
`unlockType` is a sibling field at the `profileVoice[N]` or `profileRecord[N]` level, while `unlockValue` is at `profileVoice[N].unlockValue`. To display `unlockValue` correctly:
- Parse the N from the change path.
- Look up that entry's `unlockType` from `newValue`.
- Render as `初始解锁` (type 0), `精英阶段 N` (type 2), or `信赖值 N` (type 4).

#### RichText Diff Breaks Rich Tag Structure
DO NOT wrap individual tokens inside `<color>`/`<mark>` tags to highlight diffs — that would break hyperlink and color tag structure. Instead, use character-level prefix/suffix matching (`commonPrefixLen`/`commonSuffixLen`) to isolate the changed portion and wrap whole segments with `<span>` elements that have CSS `line-through`/background styles. Each segment (prefix, old-mid, new-mid, suffix) is independently rendered through `<RichText>`.

#### Added Operator Card Shows All Data
When an operator is entirely new, the card expands to show:
- Full operator info (portrait, name, rarity, profession, element, attributes, tags)
- Skills fetched from `CharGrowthTable` + `SkillPatchTable` with blackboard-substituted descriptions
- Factory/spaceship skills from `SpaceshipCharSkillTable` + `SpaceshipSkillTable`
- Profile records and voices (fetched from `CharacterTable` API fallback)
Has a blue border + "新增" badge.

#### diff-tables Numeric ID Handling
`safeParse` in the diff script uses the same 64-bit integer quoting pattern as `api.ts`. `isI18nField` checks `typeof (value as any).id === 'number' || typeof (value as any).id === 'string'` — after JSON parse, 64-bit IDs are strings. Always compare with `String(field.id)` in both build-time and runtime.

#### Array Diff Uses Index Paths
When an array field changes (e.g. `distributionIds`), the diff output uses **index paths** like `distributionIds[2]`, `distributionIds[3]` — NOT a top-level `distributionIds` key. To detect if an array field changed, use `Object.keys(changed).filter(k => k.startsWith('distributionIds'))`, and to get the full old/new arrays, read `entry.oldValue.distributionIds` and `entry.newValue.distributionIds` directly from the ChangedEntry.

#### Enemy Attribute Template Data Structure
`EnemyAttributeTemplateTable` entries have a non-obvious structure:
- `levelDependentAttributes`: array of `{ attrs: [{ attrType, attrValue }] }` — NO `level` field. Level is encoded by **array index + 1** (position 0 = level 1). If `level` is absent, compute level from index.
- `levelIndependentAttributes`: a **plain object** `{ attrs: [...] }` — NOT an iterable array. Always access via `data.levelIndependentAttributes.attrs`, never iterate the object itself (causes `TypeError: data is not iterable`).
- Top-level resist scalars: `physicalDmgResistScalar`, `fireDmgResistScalar`, etc. are direct float properties.

#### Enemy Display Tables: Two Separate Sources
Two tables coexist with similar data:
- **`EnemyTemplateDisplayInfoTable`**: Richer source with `displayType`, `tags`, `distributionIds`, `templateId` (key IS templateId). Used by `adaptEnemy()` at runtime.
- **`EnemyDisplayInfoTable`**: Simpler source with `name`, `nickname`, `description`, `abilityDescIds`, `enemyId`, `templateId`. Entries often have `templateId` that **differs from the key** (key = enemyId variant, templateId = base template).

Always track BOTH tables in aggregations. The key is the primary ID (`enemyId` for DisplayInfo, `templateId` for TemplateDisplayInfo). For grouping, prefer `templateId` when it differs from entry key.

#### Enemy Variant Grouping by templateId
Many enemy entries are variants with keys like `eny_0046_lbshamman_hdg016` and `templateId: eny_0046_lbshamman`. When aggregating changes, build a `keyToGroupId` map that maps every entry key to its group ID: prefer the entry's `templateId` field when it differs from the key. This ensures variants from all tables (EnemyDisplayInfoTable, EnemyTable, EnemyAttributeTemplateTable) are grouped under the base templateId.

#### DistributionInfoTable Lookup
`EnemyTemplateDisplayInfoTable` entries contain `distributionIds[]` — array of distribution area IDs. To resolve these to human-readable area names:
- Fetch `DistributionInfoTable` + its i18n dict
- Look up each ID → `entry.areaName` (i18n)
- Display as color-coded badges: green for added, strikethrough red for removed, neutral for unchanged

#### Inline Attribute Panel for EnemyTable
`EnemyTable` entries have `attrTemplateId` referencing `EnemyAttributeTemplateTable`. When rendering EnemyTable changes, fetch the referenced attribute template and display it inline below the generic change entry. This gives context about the enemy's combat stats without requiring a separate attribute table expansion.

#### EnemyTable attrModifiers
`EnemyTable` entries can have an `attrModifiers[]` array that applies per-attribute corrections. Each entry has:
- `attrType`: attribute type ID (1=HP, 2=ATK, 20=move speed)
- `attrValue`: modifier magnitude
- `modifierType`: 0=flat add, 1=multiplicative (final = base × (1+attrValue)), 4=multiplicative (same formula as 1)
- `modifyAttributeType`: 0=modify base attribute

Dummy/training enemies use `attrType:1, attrValue:1000, modifierType:1` for ×1001 HP (+100000%). Always fetch `EnemyTable` alongside attribute template data and apply modifiers when displaying stats. Use `AttributeShowConfigTable` + i18n to resolve attribute names for modifier display.

### HyperlinkTooltip 传 ref 而非 anchorId
每个 `HyperlinkTag` 持有自己的 `ref`。`HyperlinkTooltip` 通过 `anchorRef` prop 直接使用该 ref 定位和检测点击外部，而非 `document.getElementById(anchorId)`。避免同一 tag 在页面中出现多次时 `getElementById` 只返回第一个元素导致 tooltip 定位错误。

### `mark` Tag Requires Color Attribute
RichText's `<mark>` tag is parsed as `<mark=#hexcolor>` (color attribute). Bare `<mark>` without `=color` results in `attrs.mark === undefined` and no visible highlight. Always write `<mark=#C9A96E>text</mark>` or similar.

### Card-as-Link with Nested Child Links
To make an entire card clickable (navigating to a detail page) while keeping nested operator/entity links working: wrap the card in `<Link>` and add `onClick={(e) => e.stopPropagation()}` on the child link container. Also add `onKeyDown` + `role="none"` for a11y compliance.

### I18n Search for Content Discovery
Use `fetchI18nSearch(regex)` → `GET /i18n/search/all/{regex}` to find all i18n text entries matching a pattern across all tables. Results are `{ Table, Path, Id }[]`. Resolve actual text via `fetchI18nText(locale, id)` → `GET /i18n/{locale}/{id}` (returns plain string, not JSON). Race descriptions can be discovered this way — the game has no dedicated per-race description table.

### Breadcrumb for New Detail Pages
When adding a detail page (e.g., `RaceDetail`), update `src/components/Layout/Breadcrumb.tsx`:
- Add a case in `DetailLabel` for the new list key
- Create a sub-component that fetches the entity name and renders it
- This prevents the breadcrumb from showing raw IDs like `tag_race_fox` instead of the localized name
