import { getCachedData } from './cache'
import { fetchTableAll, fetchTableDictAll, fetchI18nText } from './api'
import type { EquipAttr } from './types'

export interface AttrShowInfo {
  name: string
  valueFormat: string
  showPercent: boolean
}

interface AttrShowListItem {
  name: { id?: number; text?: string }
  valueFormat: string
  showPercent: boolean
  attributeModifier?: number
  resolvedName: string
}

interface AttrShowEntry {
  list: AttrShowListItem[]
}

export interface AttrShowMapEntry {
  list: AttrShowListItem[]
  nameId: string
}

function attrKey(attr: EquipAttr): string {
  return attr.compositeAttr || String(attr.attrType)
}

function pickListItem(list: AttrShowListItem[], modifierType: number): AttrShowListItem {
  if (list.length === 0) return { name: {}, valueFormat: '{value}', showPercent: false, resolvedName: '' }
  const match = list.find(item => item.attributeModifier === modifierType)
  return match ?? list[0]
}

export async function getAttributeShowMap(locale: string): Promise<Record<string, AttrShowMapEntry>> {
  const [normalRaw, compositeRaw, normalDict, compositeDict] = await Promise.all([
    getCachedData<Record<string, AttrShowEntry>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
    getCachedData<Record<string, AttrShowEntry>>('CompositeAttributeShowConfigTable', () => fetchTableAll('CompositeAttributeShowConfigTable')),
    getCachedData<Record<string, string>>(`I18nDict_${locale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', locale)),
    getCachedData<Record<string, string>>(`I18nDict_${locale}_CompositeAttributeShowConfigTable`, () => fetchTableDictAll('CompositeAttributeShowConfigTable', locale)),
  ])

  const keyToNameIds = new Map<string, string[]>()
  const missingIds = new Set<string>()

  const tryResolve = (dict: Record<string, string>, id?: number | string): string => {
    const key = String(id ?? '')
    if (!key || key === '0') return ''
    const fromTable = dict[key]
    if (fromTable) return fromTable
    missingIds.add(key)
    return ''
  }

  const map: Record<string, AttrShowMapEntry> = {}

  const resolveList = (list: AttrShowEntry['list'], dict: Record<string, string>): AttrShowListItem[] => {
    return list.map(item => {
      const resolvedName = tryResolve(dict, item.name?.id)
      return { ...item, resolvedName }
    })
  }

  for (const [k, v] of Object.entries(normalRaw)) {
    const rawList = v?.list ?? []
    if (rawList.length === 0) continue
    const list = resolveList(rawList, normalDict)
    const nameIds = rawList.map(item => String(item.name?.id ?? ''))
    keyToNameIds.set(k, nameIds)
    map[k] = { list, nameId: nameIds[0] }
  }

  for (const [k, v] of Object.entries(compositeRaw)) {
    const rawList = v?.list ?? []
    if (rawList.length === 0) continue
    const list = resolveList(rawList, compositeDict)
    const nameIds = rawList.map(item => String(item.name?.id ?? ''))
    keyToNameIds.set(k, nameIds)
    map[k] = { list, nameId: nameIds[0] }
  }

  if (missingIds.size > 0) {
    const globalTexts = await Promise.all(
      Array.from(missingIds).map(async (id) => ({ id, text: await fetchI18nText(locale, id) }))
    )
    const globalMap = Object.fromEntries(globalTexts.filter(t => t.text).map(t => [t.id, t.text]))
    for (const [k, entry] of Object.entries(map)) {
      const nameIds = keyToNameIds.get(k) ?? []
      for (let i = 0; i < entry.list.length; i++) {
        const item = entry.list[i]
        if (!item.resolvedName) {
          const nameId = nameIds[i] ?? ''
          if (nameId && nameId !== '0' && globalMap[nameId]) {
            item.resolvedName = globalMap[nameId]
          }
        }
      }
    }
  }

  return map
}

export function resolveAttrShow(
  map: Record<string, AttrShowMapEntry>,
  attr: EquipAttr,
  unknownFallback?: string,
): AttrShowInfo {
  const key = attrKey(attr)
  const entry = map[key]
  if (!entry) {
    return { name: unknownFallback ?? '', valueFormat: '{value}', showPercent: false }
  }
  const item = pickListItem(entry.list, attr.modifierType)
  const name = item.resolvedName || (unknownFallback ?? '')
  return {
    name,
    valueFormat: item.valueFormat ?? '{value}',
    showPercent: item.showPercent ?? false,
  }
}
