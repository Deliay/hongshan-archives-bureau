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

export interface SearchArchiveOptions {
  excludeTables?: string[]
  pageSize?: number
}

export interface SearchArchiveRawResult {
  allResults: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
}

function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  const cacheKey = `I18nDict_${locale}_${table}`
  return getCachedData<Record<string, string>>(cacheKey, () => fetchTableDictAll(table, locale))
}

async function buildEntityMaps(results: SearchResult[], locale: string): Promise<Record<string, Record<string, SearchEntity>>> {
  const entities: Record<string, Record<string, SearchEntity>> = {}
  const tablesNeeded = new Set<string>()

  for (const r of results) {
    if (r.entityKey && SEARCH_ENTITY_TABLES[r.table]) {
      tablesNeeded.add(r.table)
    }
  }

  const loaders: Promise<void>[] = []
  for (const table of tablesNeeded) {
    loaders.push((async () => {
      const entry = SEARCH_ENTITY_TABLES[table]
      const map = await entry.buildMap(locale)
      entities[table] = map
    })())
  }
  await Promise.all(loaders)

  return entities
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
      rarity: v.displayType ?? 0,
      tags: (v.tags ?? []).map((t: any) => t.tagId ?? t),
    }
  }
  return map
}

export async function searchArchive(
  query: string,
  locale: string,
  options: SearchArchiveOptions = {},
): Promise<SearchArchiveRawResult> {
  const { excludeTables = [] } = options
  const trimmed = query.trim()
  if (!trimmed) return { allResults: [], entities: {} }

  const raw = await fetchI18nSearch(escapeRegex(trimmed))
  const filtered = raw.filter(r => !excludeTables.includes(r.Table))

  const texts = await Promise.all(
    filtered.map(r => fetchI18nText(locale, String(r.Id))),
  )

  const allResults: SearchResult[] = filtered.map((r, i) => ({
    table: r.Table,
    path: r.Path,
    id: String(r.Id),
    text: texts[i],
    entityKey: extractEntityKey(r.Table, r.Path),
  }))

  const entities = await buildEntityMaps(allResults, locale)
  return { allResults, entities }
}
