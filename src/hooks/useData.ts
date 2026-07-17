import { useState, useEffect, useCallback } from 'react'
import { fetchTableAll, fetchTableDictAll, fetchI18nLocales, fetchI18nSearch, fetchI18nText } from '../lib/api'
import { getCachedData, initCache } from '../lib/cache'
import { useLocale } from '../lib/locale'
import type { Operator, OperatorDetailData, CharacterAttributeSet, BreakCostNode, TalentNode, WeaponRecommendation, SkillGroup, SkillCondition, SkillPatchData, SkillLevelUpCost, FactorySkill, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area, Race, RaceMember, Faction, FactionMember } from '../lib/types'
import { adaptOperator, adaptWeapon, adaptEnemy, adaptItem, adaptEquip, adaptSuit, adaptGem, adaptDocument, adaptArea, resolveI18n, ASSET_BASE } from '../lib/adapter'
import { formatBlackboard } from '../lib/formatText'
import { WEAPON_TYPE_KEYS } from '../data/constants'

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ---------- Generic hooks ----------

function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}

// ---------- Version ----------

let versionPromise: Promise<string> | null = null

export function useVersion(): UseDataResult<string> {
  return useData(async () => {
    if (!versionPromise) {
      versionPromise = initCache()
    }
    return versionPromise
  })
}

// ---------- Table hooks ----------

function useTableData<T>(table: string, adapt: (raw: any) => T): UseDataResult<T[]> {
  return useData(async () => {
    const raw = await getCachedData<Record<string, any>>(table, () => fetchTableAll(table))
    return Object.entries(raw).map(([, v]) => adapt(v))
  })
}

// ---------- Domain hooks ----------

const i18nDictCaches = new Map<string, Promise<Record<string, string>>>()

function getTableI18nDict(table: string, locale: string): Promise<Record<string, string>> {
  const key = `${locale}:${table}`
  if (!i18nDictCaches.has(key)) {
    i18nDictCaches.set(key, getCachedData<Record<string, string>>(`I18nDict_${locale}_${table}`, () => fetchTableDictAll(table, locale)))
  }
  return i18nDictCaches.get(key)!
}

export function useI18nLocales(): UseDataResult<string[]> {
  return useData(() => getCachedData<string[]>('I18nLocales', () => fetchI18nLocales()))
}

let profMapCaches = new Map<string, Promise<Record<number, { name: string; icon: string }>>>()

function getProfessionMap(locale: string): Promise<Record<number, { name: string; icon: string }>> {
  if (!profMapCaches.has(locale)) {
    profMapCaches.set(locale, (async () => {
      const [raw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('CharProfessionTable', () => fetchTableAll('CharProfessionTable')),
        getTableI18nDict('CharProfessionTable', locale),
      ])
      const map: Record<number, { name: string; icon: string }> = {}
      for (const [k, v] of Object.entries(raw)) {
        const id = Number(k)
        map[id] = {
          name: resolveI18n(v.name, i18nMap) || `职业${k}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charprofessionicon/${v.iconId}.png`,
        }
      }
      return map
    })())
  }
  return profMapCaches.get(locale)!
}

let elemMapCaches = new Map<string, Promise<Record<string, { name: string; color: string; icon: string }>>>()

function getElementMap(locale: string): Promise<Record<string, { name: string; color: string; icon: string }>> {
  if (!elemMapCaches.has(locale)) {
    elemMapCaches.set(locale, (async () => {
      const [raw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('CharTypeTable', () => fetchTableAll('CharTypeTable')),
        getTableI18nDict('CharTypeTable', locale),
      ])
      const map: Record<string, { name: string; color: string; icon: string }> = {}
      for (const [k, v] of Object.entries(raw)) {
        map[k] = {
          name: resolveI18n(v.name, i18nMap) || k,
          color: v.color ? `#${v.color.replace('#', '')}` : '#888888',
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/elementicon/${v.icon}.png`,
        }
      }
      return map
    })())
  }
  return elemMapCaches.get(locale)!
}

let battleTagCaches = new Map<string, Promise<Record<string, string>>>()

function getBattleTagMap(locale: string): Promise<Record<string, string>> {
  if (!battleTagCaches.has(locale)) {
    battleTagCaches.set(locale, (async () => {
      const [raw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('CharBattleTagTable', () => fetchTableAll('CharBattleTagTable')),
        getTableI18nDict('CharBattleTagTable', locale),
      ])
      const map: Record<string, string> = {}
      for (const [tagId, entry] of Object.entries(raw)) {
        map[tagId] = resolveI18n(entry, i18nMap) || tagId
      }
      return map
    })())
  }
  return battleTagCaches.get(locale)!
}

let attrMapCaches = new Map<string, Promise<Record<number, { id: number; name: string; icon: string }>>>()

function getAttributeMap(locale: string): Promise<Record<number, { id: number; name: string; icon: string }>> {
  if (!attrMapCaches.has(locale)) {
    attrMapCaches.set(locale, (async () => {
      const [metaRaw, showRaw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')),
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
        getTableI18nDict('AttributeShowConfigTable', locale),
      ])
      const map: Record<number, { id: number; name: string; icon: string }> = {}
      for (const [k, v] of Object.entries(metaRaw)) {
        const attrType = Number(k)
        const configItem = showRaw[k]?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        map[attrType] = {
          id: attrType,
          name: (nameId && i18nMap[nameId]) || v.iconName?.replace('icon_attribute_', '') || `属性${k}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/attributeicon/${v.iconName}.png`,
        }
      }
      return map
    })())
  }
  return attrMapCaches.get(locale)!
}

let raceMapCaches = new Map<string, Promise<Record<string, string>>>()

function getRaceMap(locale: string): Promise<Record<string, string>> {
  if (!raceMapCaches.has(locale)) {
    raceMapCaches.set(locale, (async () => {
      const [tagRaw, tagI18n, charTagRaw] = await Promise.all([
        getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
        getTableI18nDict('TagDataTable', locale),
        getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
      ])
      const raceNameMap: Record<string, string> = {}
      for (const [, tag] of Object.entries<any>(tagRaw)) {
        if (tag.tagGroupId === 'tag_group_race') {
          raceNameMap[tag.tagId] = resolveI18n(tag.tagName, tagI18n) || tag.tagId
        }
      }
      const charToRace: Record<string, string> = {}
      for (const [, entry] of Object.entries<any>(charTagRaw)) {
        if (entry.raceTagId && raceNameMap[entry.raceTagId]) {
          charToRace[entry.charId] = raceNameMap[entry.raceTagId]
        }
      }
      return charToRace
    })())
  }
  return raceMapCaches.get(locale)!
}

let blocMapCaches = new Map<string, Promise<Record<string, string>>>()

function getBlocMap(locale: string): Promise<Record<string, string>> {
  if (!blocMapCaches.has(locale)) {
    blocMapCaches.set(locale, (async () => {
      const [tagRaw, tagI18n, charTagRaw] = await Promise.all([
        getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
        getTableI18nDict('TagDataTable', locale),
        getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
      ])
      const blocNameMap: Record<string, string> = {}
      for (const [, tag] of Object.entries<any>(tagRaw)) {
        if (tag.tagGroupId === 'tag_group_power') {
          blocNameMap[tag.tagId] = resolveI18n(tag.tagName, tagI18n) || tag.tagId
        }
      }
      const charToBloc: Record<string, string> = {}
      for (const [, entry] of Object.entries<any>(charTagRaw)) {
        if (entry.blocTagId && blocNameMap[entry.blocTagId]) {
          charToBloc[entry.charId] = blocNameMap[entry.blocTagId]
        }
      }
      return charToBloc
    })())
  }
  return blocMapCaches.get(locale)!
}

export function useOperators(): UseDataResult<Operator[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[rawData, i18nMap], profMap, elemMap, tagMap, attrMap, raceMap, blocMap] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
        getTableI18nDict('CharacterTable', locale),
      ]),
      getProfessionMap(locale),
      getElementMap(locale),
      getBattleTagMap(locale),
      getAttributeMap(locale),
      getRaceMap(locale),
      getBlocMap(locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptOperator(v, i18nMap, profMap, elemMap, tagMap, attrMap, raceMap, blocMap))
  }, [locale])
}

export function useOperator(id: string): UseDataResult<Operator> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[rawData, i18nMap], profMap, elemMap, tagMap, attrMap, raceMap, blocMap] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
        getTableI18nDict('CharacterTable', locale),
      ]),
      getProfessionMap(locale),
      getElementMap(locale),
      getBattleTagMap(locale),
      getAttributeMap(locale),
      getRaceMap(locale),
      getBlocMap(locale),
    ])
    return adaptOperator(rawData[id], i18nMap, profMap, elemMap, tagMap, attrMap, raceMap, blocMap)
  }, [locale, id])
}

export function useOperatorDetail(id: string): UseDataResult<OperatorDetailData> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[rawData, i18nMap], profMap, elemMap, tagMap, attrMap, raceMap, blocMap] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
        getTableI18nDict('CharacterTable', locale),
      ]),
      getProfessionMap(locale),
      getElementMap(locale),
      getBattleTagMap(locale),
      getAttributeMap(locale),
      getRaceMap(locale),
      getBlocMap(locale),
    ])
    const raw = rawData[id]
    if (!raw) throw new Error(`Operator ${id} not found`)

    const [growthRaw, growthI18n, wpnRaw, skillPatchRaw, skillPatchI18n, spaceshipCharRaw, spaceshipSkillRaw, spaceshipI18n, skillConditionRaw, skillConditionI18n, potentialTalentEffectRaw, potentialTalentEffectI18n] = await Promise.all([
      getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')).then(r => r[id]),
      getTableI18nDict('CharGrowthTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('CharWpnRecommendTable', () => fetchTableAll('CharWpnRecommendTable')).then(r => r[id]).catch(() => null),
      getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SkillPatchTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('SpaceshipCharSkillTable', () => fetchTableAll('SpaceshipCharSkillTable')).catch(() => ({}) as Record<string, any>),
      getCachedData<Record<string, any>>('SpaceshipSkillTable', () => fetchTableAll('SpaceshipSkillTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SpaceshipSkillTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('SkillConditionTable', () => fetchTableAll('SkillConditionTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SkillConditionTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('PotentialTalentEffectTable', () => fetchTableAll('PotentialTalentEffectTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('PotentialTalentEffectTable', locale).catch(() => ({}) as Record<string, string>),
    ])

    const op = adaptOperator(raw, i18nMap, profMap, elemMap, tagMap, attrMap, raceMap, blocMap)

    const attributes: CharacterAttributeSet[] = (raw.attributes ?? []).map((a: any) => ({
      breakStage: a.breakStage ?? a.BreakStage ?? 0,
      attrs: (a.Attribute?.attrs ?? a.attrs ?? []).map((at: any) => ({
        attrType: at.attrType,
        attrValue: at.attrValue,
      })),
    }))

    const breakCostMap: Record<string, BreakCostNode> = {}
    if (growthRaw?.charBreakCostMap) {
      for (const [k, v] of Object.entries<any>(growthRaw.charBreakCostMap)) {
        breakCostMap[k] = {
          breakStage: v.breakStage,
          nodeId: v.nodeId,
          nodeType: v.nodeType,
          name: resolveI18n(v.name, growthI18n) || v.nodeId,
          description: resolveI18n(v.description, growthI18n) || '',
          equipTierLimit: v.equipTierLimit,
          requiredItem: (v.requiredItem ?? []).map((r: any) => ({ id: r.id, count: r.count })),
        }
      }
    }

    const talentNodeMap: Record<string, TalentNode> = {}
    if (growthRaw?.talentNodeMap) {
      for (const [k, v] of Object.entries<any>(growthRaw.talentNodeMap)) {
        const psi = v.passiveSkillNodeInfo ?? {}
        const ani = v.attributeNodeInfo ?? {}
        const nameFromAni = resolveI18n(ani.title, growthI18n) || resolveI18n(ani.desc, growthI18n)
        const talentEffDesc = v.nodeType === 4 && psi.talentEffectId && potentialTalentEffectRaw[psi.talentEffectId]
          ? (() => {
              const entry = potentialTalentEffectRaw[psi.talentEffectId]
              const raw = resolveI18n(entry.desc, potentialTalentEffectI18n)
              if (!raw) return ''
              const bb: Record<string, number> = {}
              for (const dl of entry.dataList ?? []) {
                for (const b of dl.attachSkill?.blackboard ?? []) {
                  if (!(b.key in bb)) bb[b.key] = b.value
                }
                for (const b of dl.attachBuff?.blackboard ?? []) {
                  if (!(b.key in bb)) bb[b.key] = b.value
                }
              }
              return formatBlackboard(raw, bb)
            })()
          : ''
        talentNodeMap[k] = {
          nodeId: v.nodeId,
          nodeType: v.nodeType,
          name: resolveI18n(psi.name, growthI18n) || nameFromAni || v.nodeId,
          description: talentEffDesc || resolveI18n(ani.desc, growthI18n) || '',
          iconId: psi.iconId || '',
          level: psi.level || 0,
          breakStage: psi.breakStage || ani.breakStage || 0,
          requiredItem: (v.requiredItem ?? []).map((r: any) => ({ id: r.id, count: r.count })),
          attrType: ani.attributeModifier?.attrType ?? undefined,
        }
      }
    }

    const wpnRecommend: WeaponRecommendation | null = wpnRaw ? {
      weaponIds1: wpnRaw.weaponIds1 ?? [],
      weaponIds2: wpnRaw.weaponIds2 ?? [],
      weaponIds3: wpnRaw.weaponIds3 ?? [],
    } : null

    const skillGroups: SkillGroup[] = growthRaw?.skillGroupMap
      ? Object.values(growthRaw.skillGroupMap).map((g: any) => ({
          skillGroupId: g.skillGroupId,
          skillGroupType: g.skillGroupType ?? 0,
          name: resolveI18n(g.name, growthI18n) ? { text: resolveI18n(g.name, growthI18n) } : (g.name ?? { text: '' }),
          icon: g.icon ?? '',
          skillIdList: g.skillIdList ?? [],
          desc: resolveI18n(g.desc, growthI18n) ? { text: resolveI18n(g.desc, growthI18n) } : (g.desc ?? { text: '' }),
          condition1: g.conditionId1 ? {
            conditionId: g.conditionId1,
            name: resolveI18n(g.conditionName1, growthI18n) || '',
            icon: g.conditionIcon1 || '',
            desc: resolveI18n(g.conditionDesc1, growthI18n) || '',
            postDesc: resolveI18n(g.conditionPostDesc1, growthI18n) || '',
            descInactive: resolveI18n(g.conditionDescInactive1, growthI18n) || '',
          } : undefined,
          condition2: g.conditionId2 ? {
            conditionId: g.conditionId2,
            name: resolveI18n(g.conditionName2, growthI18n) || '',
            icon: g.conditionIcon2 || '',
            desc: resolveI18n(g.conditionDesc2, growthI18n) || '',
            postDesc: resolveI18n(g.conditionPostDesc2, growthI18n) || '',
            descInactive: resolveI18n(g.conditionDescInactive2, growthI18n) || '',
            skillId: g.skillIdList?.length > 1 ? g.skillIdList[g.skillIdList.length - 1] : undefined,
          } : undefined,
        }))
      : []

    const skillLevelUp: SkillLevelUpCost[] = growthRaw?.skillLevelUp
      ? (growthRaw.skillLevelUp as any[]).map((c: any) => ({
          skillGroupId: c.skillGroupId,
          level: c.level,
          goldCost: c.goldCost ?? 0,
          itemBundle: (c.itemBundle ?? []).map((i: any) => ({ id: i.id, count: i.count })),
        }))
      : []

    const allSkillIds = new Set(skillGroups.flatMap(g => g.skillIdList))
    const skillPatchMap: Record<string, SkillPatchData[]> = {}
    for (const skillId of allSkillIds) {
      const entry = skillPatchRaw[skillId]
      if (entry?.SkillPatchDataBundle) {
        skillPatchMap[skillId] = entry.SkillPatchDataBundle.map((p: any) => ({
          blackboard: p.blackboard ?? [],
          coolDown: p.coolDown ?? 0,
          costType: p.costType ?? 0,
          costValue: p.costValue ?? 0,
          description: p.description ?? { text: '' },
          iconId: p.iconId ?? '',
          level: p.level,
          skillId: p.skillId,
          skillName: p.skillName ?? { text: '' },
          subDescDataList: (p.subDescDataList ?? []).map((s: any) => ({
            conditionId: s.conditionId ?? '',
            desc: s.desc ?? '',
            name: resolveI18n(s.name, skillPatchI18n)
              ? { text: resolveI18n(s.name, skillPatchI18n) }
              : s.name ?? { text: '' },
          })),
        }))
      }
    }

    const charSpaceshipSkills = spaceshipCharRaw[id] as { maxSkillCount?: number; skillList?: { charId: string; skillId: string; skillIndex: number; unlockHint: any }[] } | undefined
    const factorySkills: FactorySkill[] = []
    if (growthRaw?.talentNodeMap && charSpaceshipSkills?.skillList) {
      for (const [, v] of Object.entries<any>(growthRaw.talentNodeMap)) {
        if (v.nodeType !== 5) continue
        const fsi = v.factorySkillNodeInfo ?? {}
        const idx = fsi.index ?? 0
        const charSkill = charSpaceshipSkills.skillList[idx]
        if (!charSkill) continue
        const skillData = spaceshipSkillRaw[charSkill.skillId] as any
        if (!skillData) continue
        factorySkills.push({
          nodeId: v.nodeId,
          skillId: charSkill.skillId,
          name: resolveI18n(skillData.name, spaceshipI18n) || skillData.id || '',
          desc: resolveI18n(skillData.desc, spaceshipI18n) || resolveI18n(skillData.talentName, spaceshipI18n) || '',
          icon: skillData.icon ?? '',
          roomType: skillData.roomType ?? 0,
          effectType: skillData.effectType ?? 0,
          level: fsi.level ?? 0,
          parameters: skillData.parameters ?? [],
        })
      }
    }

    const skillConditions: Record<string, SkillCondition> = {}
    for (const [k, v] of Object.entries<any>(skillConditionRaw)) {
      skillConditions[k] = {
        condId: v.condId,
        condType: v.condType,
        leftAttrType: v.leftAttrType,
        rightAttrType: v.rightAttrType,
        compareOp: v.compareOp,
        toastText: resolveI18n(v.toastText, skillConditionI18n) || '',
      }
    }

    return { op, attributes, breakCostMap, talentNodeMap, wpnRecommend, skillGroups, skillLevelUp, skillPatchMap, factorySkills, skillConditions }
  }, [locale, id])
}

async function getWeaponTypeNameMap(locale: string): Promise<Record<number, string>> {
  const [textTable, textI18n] = await Promise.all([
    getCachedData<Record<string, any>>('TextTable', () => fetchTableAll('TextTable')),
    getTableI18nDict('TextTable', locale),
  ])
  const map: Record<number, string> = {}
  for (const [type, key] of Object.entries(WEAPON_TYPE_KEYS)) {
    const entry = textTable[key]
    if (entry) {
      map[Number(type)] = resolveI18n(entry, textI18n) || key
    }
  }
  return map
}

export function useWeapons(): UseDataResult<Weapon[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap, itemRaw, itemI18nMap, typeNameMap] = await Promise.all([
      getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')),
      getTableI18nDict('WeaponBasicTable', locale),
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
      getWeaponTypeNameMap(locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptWeapon(v, itemRaw, i18nMap, itemI18nMap, typeNameMap))
  }, [locale])
}

export function useWeapon(id: string): UseDataResult<Weapon | null> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap, itemRaw, itemI18nMap, typeNameMap] = await Promise.all([
      getCachedData<Record<string, any>>('WeaponBasicTable', () => fetchTableAll('WeaponBasicTable')),
      getTableI18nDict('WeaponBasicTable', locale),
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
      getWeaponTypeNameMap(locale),
    ])
    const raw = rawData[id]
    if (!raw) throw new Error(`Weapon ${id} not found`)
    return adaptWeapon(raw, itemRaw, i18nMap, itemI18nMap, typeNameMap)
  }, [locale, id])
}

let typeNameMapCaches = new Map<string, Promise<Record<number, string>>>()

export function getEnemyTypeNameMap(locale: string): Promise<Record<number, string>> {
  if (!typeNameMapCaches.has(locale)) {
    typeNameMapCaches.set(locale, (async () => {
      const [raw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('DisplayEnemyTypeTable', () => fetchTableAll('DisplayEnemyTypeTable')),
        getTableI18nDict('DisplayEnemyTypeTable', locale),
      ])
      const map: Record<number, string> = {}
      for (const [k, v] of Object.entries<any>(raw)) {
        map[Number(k)] = resolveI18n(v.name, i18nMap) || `类型${k}`
      }
      return map
    })())
  }
  return typeNameMapCaches.get(locale)!
}

let attrNameMapCaches = new Map<string, Promise<Record<number, string>>>()

export function getEnemyAttrNameMap(locale: string): Promise<Record<number, string>> {
  if (!attrNameMapCaches.has(locale)) {
    attrNameMapCaches.set(locale, (async () => {
      const [showRaw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
        getTableI18nDict('AttributeShowConfigTable', locale),
      ])
      const map: Record<number, string> = {}
      for (const [k, v] of Object.entries<any>(showRaw)) {
        const attrType = Number(k)
        const configItem = v?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        map[attrType] = (nameId && i18nMap[nameId]) || `属性${k}`
      }
      return map
    })())
  }
  return attrNameMapCaches.get(locale)!
}

export function useEnemies(): UseDataResult<Enemy[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[rawDisplay, wikiRaw, wikiGroupRaw], i18nMap, groupI18n] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('EnemyTemplateDisplayInfoTable', () => fetchTableAll('EnemyTemplateDisplayInfoTable')),
        getCachedData<Record<string, any>>('WikiEntryDataTable', () => fetchTableAll('WikiEntryDataTable')),
        getCachedData<Record<string, any>>('WikiGroupTable', () => fetchTableAll('WikiGroupTable')),
      ]),
      getTableI18nDict('EnemyTemplateDisplayInfoTable', locale),
      getTableI18nDict('WikiGroupTable', locale).catch(() => ({}) as Record<string, string>),
    ])
    const groupRaw = wikiGroupRaw['wiki_type_monster'] as { list?: { groupId: string; groupName: { id: number; text: string } }[] } | undefined
    const groupNameMap: Record<string, string> = {}
    if (groupRaw?.list) {
      for (const g of groupRaw.list) {
        groupNameMap[g.groupId] = resolveI18n(g.groupName, groupI18n) || g.groupId
      }
    }
    const enemyToGroup: Record<string, string> = {}
    for (const [, entry] of Object.entries<any>(wikiRaw)) {
      if (entry.refMonsterTemplateId && entry.groupId) {
        enemyToGroup[entry.refMonsterTemplateId] = groupNameMap[entry.groupId] || entry.groupId
      }
    }
    return Object.values(rawDisplay).map((v: any) => adaptEnemy(v, i18nMap, enemyToGroup))
  }, [locale])
}

export function useItems(): UseDataResult<Item[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap] = await Promise.all([
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptItem(v, i18nMap))
  }, [locale])
}

export function useEquips(): UseDataResult<Equip[]> {
  return useTableData('EquipTable', adaptEquip)
}

export function useSuits(): UseDataResult<Suit[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap] = await Promise.all([
      getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
      getTableI18nDict('EquipSuitTable', locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptSuit(v, i18nMap))
  }, [locale])
}

export function useGems(): UseDataResult<Gem[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap] = await Promise.all([
      getCachedData<Record<string, any>>('GemTable', () => fetchTableAll('GemTable')),
      getTableI18nDict('GemTable', locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptGem(v, i18nMap))
  }, [locale])
}

export function useDocuments(): UseDataResult<StoryDocument[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [rawData, i18nMap] = await Promise.all([
      getCachedData<Record<string, any>>('PrtsDocument', () => fetchTableAll('PrtsDocument')),
      getTableI18nDict('PrtsDocument', locale),
    ])
    return Object.entries(rawData).map(([, v]) => adaptDocument(v, i18nMap))
  }, [locale])
}

export function useAreas(): UseDataResult<Area[]> {
  return useTableData('SceneAreaTable', adaptArea)
}

export function useRaces(): UseDataResult<Race[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[tagRaw, tagI18n], [charTagRaw], [charRaw, charI18n]] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
        getTableI18nDict('TagDataTable', locale),
      ]),
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
      ]),
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
        getTableI18nDict('CharacterTable', locale),
      ]),
    ])

    const raceTags = Object.values(tagRaw).filter((t: any) => t.tagGroupId === 'tag_group_race')

    const charToRace: Record<string, string> = {}
    for (const [, entry] of Object.entries<any>(charTagRaw)) {
      if (entry.raceTagId) {
        charToRace[entry.charId] = entry.raceTagId
      }
    }

    const races: Record<string, Race> = {}
    for (const tag of raceTags) {
      const raceId = tag.tagId
      const raceName = resolveI18n(tag.tagName, tagI18n) || raceId
      races[raceId] = { id: raceId, name: raceName, members: [] }
    }

    for (const [charId, raceTagId] of Object.entries(charToRace)) {
      const race = races[raceTagId]
      if (!race) continue
      const charData = charRaw[charId]
      if (!charData) continue
      race.members.push({
        id: charId,
        name: resolveI18n(charData.name, charI18n) || charId,
        portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`,
        rarity: charData.rarity ?? 0,
      })
    }

    for (const race of Object.values(races)) {
      race.members.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
    }

    return Object.values(races).sort((a, b) => a.name.localeCompare(b.name))
  }, [locale])
}

export interface RaceEntry {
  id: string
  name: string
  members: RaceMember[]
  texts: { source: string; text: string }[]
}

export function useRaceDetail(raceId: string): UseDataResult<RaceEntry> {
  const { locale } = useLocale()
  return useData(async () => {
    const [races, results] = await Promise.all([
      getCachedData<Race[]>('__built_races', async () => {
        const [[tagRaw, tagI18n], [charTagRaw], [charRaw, charI18n]] = await Promise.all([
          Promise.all([
            getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
            getTableI18nDict('TagDataTable', locale),
          ]),
          Promise.all([
            getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
          ]),
          Promise.all([
            getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
            getTableI18nDict('CharacterTable', locale),
          ]),
        ])
        const raceTags = Object.values(tagRaw).filter((t: any) => t.tagGroupId === 'tag_group_race')
        const charToRace: Record<string, string> = {}
        for (const [, entry] of Object.entries<any>(charTagRaw)) {
          if (entry.raceTagId) charToRace[entry.charId] = entry.raceTagId
        }
        const races: Record<string, Race> = {}
        for (const tag of raceTags) {
          const raceId = tag.tagId
          const raceName = resolveI18n(tag.tagName, tagI18n) || raceId
          races[raceId] = { id: raceId, name: raceName, members: [] }
        }
        for (const [charId, raceTagId] of Object.entries(charToRace)) {
          const race = races[raceTagId]
          if (!race) continue
          const charData = charRaw[charId]
          if (!charData) continue
          race.members.push({
            id: charId,
            name: resolveI18n(charData.name, charI18n) || charId,
            portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`,
            rarity: charData.rarity ?? 0,
          })
        }
        for (const race of Object.values(races)) {
          race.members.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
        }
        return Object.values(races).sort((a, b) => a.name.localeCompare(b.name))
      }),
      getCachedData<{ Table: string; Path: string; Id: string }[]>(`__i18n_search_${raceId}`, async () => {
        const tags = await getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable'))
        const tagI18n = await getTableI18nDict('TagDataTable', locale)
        const tag = tags[raceId]
        if (!tag) return []
        const raceName = resolveI18n(tag.tagName, tagI18n) || raceId
        if (!raceName) return []
        const results = await fetchI18nSearch(raceName)
        return results.filter(r => r.Table !== 'TagDataTable')
      }),
    ])

    const race = races.find(r => r.id === raceId)
    if (!race) throw new Error(`Race ${raceId} not found`)

    const texts = await Promise.all(
      results.slice(0, 30).map(async (r) => {
        const text = await fetchI18nText(locale, String(r.Id))
        return { source: `${r.Table}`, text }
      }),
    )

  return { ...race, texts: texts.filter(t => t.text) }
}, [locale, raceId])
}

export function useFactions(): UseDataResult<Faction[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [[tagRaw, tagI18n], [blocRaw], [charTagRaw], [charRaw, charI18n]] = await Promise.all([
      Promise.all([
        getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
        getTableI18nDict('TagDataTable', locale),
      ]),
      Promise.all([
        getCachedData<Record<string, any>>('BlocDataTable', () => fetchTableAll('BlocDataTable')).catch(() => ({}) as Record<string, any>),
      ]),
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
      ]),
      Promise.all([
        getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
        getTableI18nDict('CharacterTable', locale),
      ]),
    ])

    const powerTags = Object.values(tagRaw).filter((t: any) => t.tagGroupId === 'tag_group_power')

    const charToBloc: Record<string, string> = {}
    for (const [, entry] of Object.entries<any>(charTagRaw)) {
      if (entry.blocTagId) {
        charToBloc[entry.charId] = entry.blocTagId
      }
    }

    const factions: Record<string, Faction> = {}
    for (const tag of powerTags) {
      const tagId = tag.tagId
      const blocId = tagId.replace('tag_', '')
      const blocEntry = blocRaw[blocId]
      factions[tagId] = {
        id: tagId,
        name: resolveI18n(tag.tagName, tagI18n) || tagId,
        engName: blocEntry?.engName ?? '',
        icon: blocEntry?.icon ?? '',
        members: [],
      }
    }

    for (const [charId, blocTagId] of Object.entries(charToBloc)) {
      const faction = factions[blocTagId]
      if (!faction) continue
      const charData = charRaw[charId]
      if (!charData) continue
      faction.members.push({
        id: charId,
        name: resolveI18n(charData.name, charI18n) || charId,
        portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`,
        rarity: charData.rarity ?? 0,
      })
    }

    for (const faction of Object.values(factions)) {
      faction.members.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
    }

    return Object.values(factions).sort((a, b) => a.name.localeCompare(b.name))
  }, [locale])
}

export interface FactionEntry {
  id: string
  name: string
  engName: string
  icon: string
  members: FactionMember[]
  texts: { source: string; text: string }[]
}

export function useFactionDetail(factionId: string): UseDataResult<FactionEntry> {
  const { locale } = useLocale()
  return useData(async () => {
    const [factions, results] = await Promise.all([
      getCachedData<Faction[]>('__built_factions', async () => {
        const [[tagRaw, tagI18n], [blocRaw], [charTagRaw], [charRaw, charI18n]] = await Promise.all([
          Promise.all([
            getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable')),
            getTableI18nDict('TagDataTable', locale),
          ]),
          Promise.all([
            getCachedData<Record<string, any>>('BlocDataTable', () => fetchTableAll('BlocDataTable')).catch(() => ({}) as Record<string, any>),
          ]),
          Promise.all([
            getCachedData<Record<string, any>>('CharacterTagTable', () => fetchTableAll('CharacterTagTable')),
          ]),
          Promise.all([
            getCachedData<Record<string, any>>('CharacterTable', () => fetchTableAll('CharacterTable')),
            getTableI18nDict('CharacterTable', locale),
          ]),
        ])
        const powerTags = Object.values(tagRaw).filter((t: any) => t.tagGroupId === 'tag_group_power')
        const charToBloc: Record<string, string> = {}
        for (const [, entry] of Object.entries<any>(charTagRaw)) {
          if (entry.blocTagId) charToBloc[entry.charId] = entry.blocTagId
        }
        const factions: Record<string, Faction> = {}
        for (const tag of powerTags) {
          const tagId = tag.tagId
          const blocId = tagId.replace('tag_', '')
          const blocEntry = blocRaw[blocId]
          factions[tagId] = {
            id: tagId,
            name: resolveI18n(tag.tagName, tagI18n) || tagId,
            engName: blocEntry?.engName ?? '',
            icon: blocEntry?.icon ?? '',
            members: [],
          }
        }
        for (const [charId, blocTagId] of Object.entries(charToBloc)) {
          const faction = factions[blocTagId]
          if (!faction) continue
          const charData = charRaw[charId]
          if (!charData) continue
          faction.members.push({
            id: charId,
            name: resolveI18n(charData.name, charI18n) || charId,
            portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`,
            rarity: charData.rarity ?? 0,
          })
        }
        for (const faction of Object.values(factions)) {
          faction.members.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
        }
        return Object.values(factions).sort((a, b) => a.name.localeCompare(b.name))
      }),
      getCachedData<{ Table: string; Path: string; Id: string }[]>(`__i18n_search_${factionId}`, async () => {
        const tags = await getCachedData<Record<string, any>>('TagDataTable', () => fetchTableAll('TagDataTable'))
        const tagI18n = await getTableI18nDict('TagDataTable', locale)
        const tag = tags[factionId]
        if (!tag) return []
        const factionName = resolveI18n(tag.tagName, tagI18n) || factionId
        if (!factionName) return []
        const results = await fetchI18nSearch(factionName)
        return results.filter(r => r.Table !== 'TagDataTable' && r.Table !== 'BlocDataTable' && r.Table !== 'CharacterTagTable')
      }),
    ])

    const faction = factions.find(f => f.id === factionId)
    if (!faction) throw new Error(`Faction ${factionId} not found`)

    const texts = await Promise.all(
      results.slice(0, 30).map(async (r) => {
        const text = await fetchI18nText(locale, String(r.Id))
        return { source: `${r.Table}`, text }
      }),
    )

    return { ...faction, texts: texts.filter(t => t.text) }
  }, [locale, factionId])
}
