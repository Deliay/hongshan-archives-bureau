import { fetchI18nSearch, fetchI18nText, fetchTableAll, fetchTableDictAll } from './api'
import { getCachedData } from './cache'
import { resolveI18n, ASSET_BASE } from './adapter'
import type { SearchResult, SearchEntity } from './types'

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractEntityKey(_table: string, path: string): string | null {
  const parts = path.split('.')
  if (parts.length < 2) return null
  return parts[1]
}

export const SEARCH_ENTITY_ALIAS_TABLES: Record<string, string> = {
  CharGrowthTable: 'CharacterTable',
  CharacterTagDesTable: 'CharacterTable',
}

export interface SearchArchiveOptions {
  excludeTables?: string[]
  pageSize?: number
}

export interface LightweightResult {
  table: string
  path: string
  id: string
  entityKey: string | null
}

function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  const cacheKey = `I18nDict_${locale}_${table}`
  return getCachedData<Record<string, string>>(cacheKey, () => fetchTableDictAll(table, locale))
}

export const SEARCH_ENTITY_TABLES: Record<string, {
  keyField: string
  route: string
  buildMap: (locale: string) => Promise<Record<string, SearchEntity>>
}> = {
  WeaponBasicTable: {
    keyField: 'weaponId',
    route: '/archive/weapons',
    buildMap: buildWeaponEntityMap,
  },
  CharacterTable: {
    keyField: 'charId',
    route: '/archive/operators',
    buildMap: buildOperatorEntityMap,
  },
  ItemTable: {
    keyField: 'itemId',
    route: '/archive/items',
    buildMap: buildItemEntityMap,
  },
  EnemyTemplateDisplayInfoTable: {
    keyField: 'templateId',
    route: '/archive/enemies',
    buildMap: buildEnemyEntityMap,
  },
}

async function buildOperatorEntityMap(locale: string): Promise<Record<string, SearchEntity>> {
  const [raw, i18nMap] = await Promise.all([
    getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
    getTableI18nDict('CharacterTable', locale),
  ])
  const map: Record<string, SearchEntity> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const id = v.charId ?? v.$key ?? ''
    map[id] = {
      type: 'operator',
      id,
      name: resolveI18n(v.name, i18nMap) || id,
      route: `/archive/operators/${id}`,
      portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${id}.png`,
      rarity: v.rarity ?? 0,
    }
  }
  return map
}

async function buildSkillOwnerIndex(_locale: string): Promise<Record<string, { type: 'operator' | 'weapon'; id: string }>> {
  const [growthRaw, weaponRaw] = await Promise.all([
    getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')),
    getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')),
  ])

  const index: Record<string, { type: 'operator' | 'weapon'; id: string }> = {}

  for (const [, v] of Object.entries<any>(growthRaw)) {
    const charId = v.charId ?? v.$key ?? ''
    for (const group of Object.values<any>(v.skillGroupMap ?? {})) {
      for (const skillId of group.skillIdList ?? []) {
        if (!index[skillId]) index[skillId] = { type: 'operator', id: charId }
      }
    }
  }

  for (const [, v] of Object.entries<any>(weaponRaw)) {
    const weaponId = v.weaponId ?? v.$key ?? ''
    for (const skillId of v.weaponSkillList ?? []) {
      if (!index[skillId]) index[skillId] = { type: 'weapon', id: weaponId }
    }
  }

  return index
}

async function buildTalentEffectOwnerIndex(_locale: string): Promise<Record<string, string>> {
  const growthRaw = await getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable'))
  const index: Record<string, string> = {}

  for (const [, v] of Object.entries<any>(growthRaw)) {
    const charId = v.charId ?? v.$key ?? ''
    for (const node of Object.values<any>(v.talentNodeMap ?? {})) {
      if (node.nodeType === 4 && node.passiveSkillNodeInfo?.talentEffectId) {
        index[node.passiveSkillNodeInfo.talentEffectId] = charId
      }
    }
  }

  return index
}

async function buildWeaponEntityMap(locale: string): Promise<Record<string, SearchEntity>> {
  const [raw, i18nMap, itemRaw, itemI18n] = await Promise.all([
    getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')),
    getTableI18nDict('WeaponBasicTable', locale),
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
    getTableI18nDict('ItemTable', locale),
  ])
  const map: Record<string, SearchEntity> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const id = v.weaponId ?? v.$key ?? ''
    const item = itemRaw[id]
    const name = item ? resolveI18n(item.name, itemI18n) : (resolveI18n(v.engName ?? v.name, i18nMap) || id)
    map[id] = {
      type: 'weapon',
      id,
      name,
      route: `/archive/weapons/${id}`,
      icon: item?.iconId ?? id,
      rarity: v.rarity ?? 0,
      subInfo: `${v.weaponType ?? ''}`,
    }
  }
  return map
}

async function buildItemEntityMap(locale: string): Promise<Record<string, SearchEntity>> {
  const [raw, i18nMap] = await Promise.all([
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
    getTableI18nDict('ItemTable', locale),
  ])
  const map: Record<string, SearchEntity> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const id = v.itemId ?? v.$key ?? ''
    map[id] = {
      type: 'item',
      id,
      name: resolveI18n(v.name, i18nMap) || id,
      route: '',
      icon: v.iconId ?? id,
      rarity: v.rarity ?? 0,
    }
  }
  return map
}

async function buildEnemyEntityMap(locale: string): Promise<Record<string, SearchEntity>> {
  const [raw, i18nMap] = await Promise.all([
    getCachedData<Record<string, any>>('EnemyTemplateDisplayInfoTable', () => fetchTableAll('EnemyTemplateDisplayInfoTable')),
    getTableI18nDict('EnemyTemplateDisplayInfoTable', locale),
  ])
  const map: Record<string, SearchEntity> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const id = v.templateId ?? v.$key ?? ''
    map[id] = {
      type: 'enemy',
      id,
      name: resolveI18n(v.name ?? v.enemyName, i18nMap) || id,
      route: `/archive/enemies/${id}`,
      displayType: v.displayType ?? 0,
      tags: (v.tags ?? []).map((t: any) => t.tagId ?? t),
    }
  }
  return map
}

// Lightweight search — returns raw matches without fetching texts or entity maps
export async function searchArchive(
  query: string,
  _locale: string,
  options: SearchArchiveOptions = {},
): Promise<LightweightResult[]> {
  const { excludeTables = [] } = options
  const trimmed = query.trim()
  if (!trimmed) return []

  const raw = await fetchI18nSearch(escapeRegex(trimmed))
  const filtered = raw.filter(r => !excludeTables.includes(r.Table))

  return filtered.map(r => ({
    table: r.Table,
    path: r.Path,
    id: String(r.Id),
    entityKey: extractEntityKey(r.Table, r.Path),
  }))
}

// Enrich a set of results with texts and entity maps (call only for current page)
export async function enrichResults(
  results: LightweightResult[],
  locale: string,
): Promise<{
  enriched: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
}> {
  const texts = await Promise.all(
    results.map(r => fetchI18nText(locale, r.id)),
  )

  const enriched: SearchResult[] = results.map((r, i) => ({
    table: r.table,
    path: r.path,
    id: r.id,
    text: texts[i],
    entityKey: r.entityKey,
  }))

  const entities: Record<string, Record<string, SearchEntity>> = {}
  const indirectOwners: Record<string, SearchEntity | undefined> = {}

  // Direct entity tables + alias tables
  const directTables = new Set<string>()
  for (const r of results) {
    const targetTable = SEARCH_ENTITY_ALIAS_TABLES[r.table] ?? r.table
    if (r.entityKey && SEARCH_ENTITY_TABLES[targetTable]) {
      directTables.add(targetTable)
    }
  }

  await Promise.all(Array.from(directTables).map(async (table) => {
    const entry = SEARCH_ENTITY_TABLES[table]
    entities[table] = await entry.buildMap(locale)
  }))

  // Indirect association tables (SkillPatchTable, PotentialTalentEffectTable)
  const skillIds = results.filter(r => r.table === 'SkillPatchTable').map(r => r.entityKey).filter(Boolean) as string[]
  const talentIds = results.filter(r => r.table === 'PotentialTalentEffectTable').map(r => r.entityKey).filter(Boolean) as string[]

  if (skillIds.length > 0) {
    const skillIndex = await buildSkillOwnerIndex(locale)
    const operatorMap = entities['CharacterTable'] ?? await buildOperatorEntityMap(locale)
    const weaponMap = entities['WeaponBasicTable'] ?? await buildWeaponEntityMap(locale)
    entities['CharacterTable'] = operatorMap
    entities['WeaponBasicTable'] = weaponMap

    for (const id of skillIds) {
      const owner = skillIndex[id]
      if (!owner) continue
      indirectOwners[id] = owner.type === 'operator' ? operatorMap[owner.id] : weaponMap[owner.id]
    }
  }

  if (talentIds.length > 0) {
    const talentIndex = await buildTalentEffectOwnerIndex(locale)
    const operatorMap = entities['CharacterTable'] ?? await buildOperatorEntityMap(locale)
    entities['CharacterTable'] = operatorMap

    for (const id of talentIds) {
      const charId = talentIndex[id]
      if (!charId) continue
      indirectOwners[id] = operatorMap[charId]
    }
  }

  for (const r of enriched) {
    if (r.table === 'SkillPatchTable' || r.table === 'PotentialTalentEffectTable') {
      r.ownerEntity = indirectOwners[r.entityKey ?? '']
    }
  }

  return { enriched, entities }
}
