import { getCachedData } from './cache'
import { fetchTableAll, fetchTableDictAll, fetchI18nText } from './api'
import type { EquipAttr } from './types'

export interface AttrShowInfo {
  name: string
  valueFormat: string
  showPercent: boolean
}

interface AttrShowEntry {
  list: { name: { id?: number; text?: string }; valueFormat: string; showPercent: boolean; attributeModifier?: number }[]
}

function attrKey(attr: EquipAttr): string {
  return attr.compositeAttr || String(attr.attrType)
}

export async function getAttributeShowMap(locale: string): Promise<Record<string, AttrShowInfo>> {
  const [normalRaw, compositeRaw, normalDict, compositeDict] = await Promise.all([
    getCachedData<Record<string, AttrShowEntry>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
    getCachedData<Record<string, AttrShowEntry>>('CompositeAttributeShowConfigTable', () => fetchTableAll('CompositeAttributeShowConfigTable')),
    getCachedData<Record<string, string>>(`I18nDict_${locale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', locale)),
    getCachedData<Record<string, string>>(`I18nDict_${locale}_CompositeAttributeShowConfigTable`, () => fetchTableDictAll('CompositeAttributeShowConfigTable', locale)),
  ])

  const missingIds = new Set<string>()
  const tryResolve = (dict: Record<string, string>, id?: number | string): string => {
    const key = String(id ?? '')
    if (!key || key === '0') return ''
    const fromTable = dict[key]
    if (fromTable) return fromTable
    missingIds.add(key)
    return ''
  }

  const map: Record<string, AttrShowInfo> = {}

  for (const [k, v] of Object.entries(normalRaw)) {
    const list = v?.list ?? []
    if (list.length === 0) continue
    const entry = list[0]
    const name = tryResolve(normalDict, entry?.name?.id)
    map[k] = {
      name,
      valueFormat: entry?.valueFormat ?? '{value}',
      showPercent: entry?.showPercent ?? false,
    }
  }

  for (const [k, v] of Object.entries(compositeRaw)) {
    const list = v?.list ?? []
    if (list.length === 0) continue
    const entry = list[0]
    const name = tryResolve(compositeDict, entry?.name?.id)
    map[k] = {
      name,
      valueFormat: entry?.valueFormat ?? '{value}',
      showPercent: entry?.showPercent ?? false,
    }
  }

  if (missingIds.size > 0) {
    const globalTexts = await Promise.all(
      Array.from(missingIds).map(async (id) => ({ id, text: await fetchI18nText(locale, id) }))
    )
    const globalMap = Object.fromEntries(globalTexts.filter(t => t.text).map(t => [t.id, t.text]))
    for (const info of Object.values(map)) {
      if (!info.name) {
        const nameId = (() => {
          for (const entries of [Object.values(normalRaw), Object.values(compositeRaw)]) {
            for (const v of entries) {
              const entry = v?.list?.[0]
              if (entry && String(entry.name?.id ?? '') && globalMap[String(entry.name?.id ?? '')]) {
                return String(entry.name?.id ?? '')
              }
            }
          }
          return ''
        })()
        if (nameId) info.name = globalMap[nameId] || info.name
      }
    }
  }

  return map
}

export function resolveAttrShow(
  map: Record<string, AttrShowInfo>,
  attr: EquipAttr,
  unknownFallback?: string,
): AttrShowInfo {
  const key = attrKey(attr)
  const info = map[key]
  if (info?.name) return info
  return {
    name: unknownFallback ?? '',
    valueFormat: info?.valueFormat ?? '{value}',
    showPercent: info?.showPercent ?? false,
  }
}
