import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchTableAll, fetchTableDictAll, fetchI18nLocales, fetchI18nSearch, fetchI18nText, fetchTableEntry, fetchTableDictEntry } from '../lib/api'
import { getCachedData, initCache } from '../lib/cache'
import { useLocale } from '../lib/locale'
import { useI18n } from '../i18n'
import { searchArchive, enrichResults } from '../lib/search'
import type { SearchArchiveOptions, LightweightResult } from '../lib/search'
import type { Operator, OperatorDetailData, CharacterAttributeSet, BreakCostNode, TalentNode, WeaponRecommendation, SkillGroup, SkillCondition, SkillPatchData, SkillLevelUpCost, FactorySkill, PotentialLevel, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area, Race, RaceMember, Faction, FactionMember, UseArchiveSearchResult, SearchResult, SearchEntity, EquipDetail, EnhanceMaterialGroup, EnhanceMaterialItem, Activity, StoryRecapScene, StoryRecapChapter, PrtsCategory, PrtsVolume, PrtsItem, PrtsItemDetail, BakerChat, BakerTopic } from '../lib/types'
import { adaptOperator, adaptWeapon, adaptEnemy, adaptItem, adaptEquip, adaptSuit, adaptEquipFormula, adaptGem, adaptDocument, adaptArea, adaptActivity, resolveI18n, ASSET_BASE, adaptRecapScene, adaptRecapFallbackScene, adaptRecapChapter, adaptPrtsCategory, adaptPrtsVolume, adaptPrtsItem, adaptBakerChat } from '../lib/adapter'
import { formatBlackboard } from '../lib/formatText'
import { WEAPON_TYPE_KEYS } from '../data/constants'
import { getAttributeShowMap, resolveAttrShow } from '../lib/attributeShow'
import type { FactoryRecipe, FactoryMachine, FactoryItemIndex, ChainGraph, ChainTarget } from '../lib/factory/types'
import { adaptFactoryRecipe, adaptFactoryMachine, adaptFactorySources } from '../lib/factory/recipes'
import { buildChainGraph } from '../lib/factory/chain'
import { getFactoryRegion } from '../lib/factory/regions'
import type { ResolveContext } from '../lib/baker'

// AttributeType enum name → blackboard key (from TianShiTools Attributes.cs)
const ATTRIBUTE_TYPE_MAP: Record<number, string> = {
  0: 'Level', 1: 'MaxHp', 2: 'Atk', 3: 'Def',
  4: 'PhysicalDamageTakenScalar', 5: 'FireDamageTakenScalar', 6: 'PulseDamageTakenScalar', 7: 'CrystDamageTakenScalar',
  8: 'Weight', 9: 'CriticalRate', 10: 'CriticalDamageIncrease',
  17: 'NormalAttackDamageIncrease',
  28: 'UltimateSkillDamageIncrease', 29: 'HealOutputIncrease', 30: 'HealTakenIncrease',
  32: 'NormalSkillDamageIncrease', 33: 'ComboSkillDamageIncrease',
  35: 'FireBurstDamageIncrease', 36: 'PulseBurstDamageIncrease', 37: 'CrystBurstDamageIncrease', 38: 'NaturalBurstDamageIncrease',
  39: 'Str', 40: 'Agi', 41: 'Wisd', 42: 'Will',
  47: 'ComboSkillCooldownScalar', 48: 'NaturalDamageTakenScalar',
  50: 'PhysicalDamageIncrease', 51: 'FireDamageIncrease', 52: 'PulseDamageIncrease', 53: 'CrystDamageIncrease', 54: 'NaturalDamageIncrease',
  87: 'PhysicalAndSpellInflictionEnhance',
}

function extractPotentialBlackboard(entry: any): Record<string, number> {
  const bb: Record<string, number> = {}
  for (const dl of entry.dataList ?? []) {
    for (const b of dl.attachSkill?.blackboard ?? []) {
      if (!(b.key in bb)) bb[b.key] = b.value
    }
    for (const b of dl.attachBuff?.blackboard ?? []) {
      if (!(b.key in bb)) bb[b.key] = b.value
    }
    if (dl.skillBbModifier?.bbKey && dl.skillBbModifier.floatValue !== undefined) {
      if (!(dl.skillBbModifier.bbKey in bb)) bb[dl.skillBbModifier.bbKey] = dl.skillBbModifier.floatValue
    }
    if (dl.attrModifier?.attrType !== undefined && dl.attrModifier?.attrValue !== undefined) {
      const key = ATTRIBUTE_TYPE_MAP[dl.attrModifier.attrType]
      if (key && !(key in bb)) bb[key] = dl.attrModifier.attrValue
    }
  }
  return bb
}

const ADMIN_OPERATOR_MAP: Record<string, string> = {
  chr_0002_endminm: 'chr_9000_endmin',
  chr_0003_endminf: 'chr_9000_endmin',
}

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
    setData(null)
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

const ADMIN_DATA_SOURCE_ID = 'chr_9000_endmin'

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
    return Object.entries(rawData)
      .filter(([key]) => key !== ADMIN_DATA_SOURCE_ID)
      .map(([, v]) => adaptOperator(v, i18nMap, profMap, elemMap, tagMap, attrMap, raceMap, blocMap))
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
    const dataId = ADMIN_OPERATOR_MAP[id] ?? id

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
    const raw = rawData[dataId] ?? rawData[id]
    if (!raw) throw new Error(`Operator ${id} not found`)

    const [growthRaw, growthI18n, wpnRaw, skillPatchRaw, skillPatchI18n, spaceshipCharRaw, spaceshipSkillRaw, spaceshipI18n, skillConditionRaw, skillConditionI18n, potentialTalentEffectRaw, potentialTalentEffectI18n, potentialRaw, potentialI18n] = await Promise.all([
      getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable')).then(r => r[dataId]),
      getTableI18nDict('CharGrowthTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('CharWpnRecommendTable', () => fetchTableAll('CharWpnRecommendTable')).then(r => r[dataId]).catch(() => null),
      getCachedData<Record<string, any>>('SkillPatchTable', () => fetchTableAll('SkillPatchTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SkillPatchTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('SpaceshipCharSkillTable', () => fetchTableAll('SpaceshipCharSkillTable')).catch(() => ({}) as Record<string, any>),
      getCachedData<Record<string, any>>('SpaceshipSkillTable', () => fetchTableAll('SpaceshipSkillTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SpaceshipSkillTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('SkillConditionTable', () => fetchTableAll('SkillConditionTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('SkillConditionTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('PotentialTalentEffectTable', () => fetchTableAll('PotentialTalentEffectTable')).catch(() => ({}) as Record<string, any>),
      getTableI18nDict('PotentialTalentEffectTable', locale).catch(() => ({}) as Record<string, string>),
      getCachedData<Record<string, any>>('CharacterPotentialTable', () => fetchTableAll('CharacterPotentialTable')).then(r => r[id]).catch(() => null),
      getTableI18nDict('CharacterPotentialTable', locale).catch(() => ({}) as Record<string, string>),
    ])

    const op = adaptOperator(raw, i18nMap, profMap, elemMap, tagMap, attrMap, raceMap, blocMap)

    if (ADMIN_OPERATOR_MAP[id]) {
      op.id = id
      op.portrait = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${id}.png`
      const voiceSource = rawData[id]
      if (voiceSource?.profileVoice) {
        op.voiceLines = (voiceSource.profileVoice as any[]).map((v: any) => ({
          title: resolveI18n(v.voiceTitle, i18nMap),
          text: resolveI18n(v.voiceDesc, i18nMap),
          voiceIndex: v.voiceIndex ?? 0,
          unlockType: v.unlockType ?? 0,
          unlockValue: v.unlockValue ?? 0,
          voId: v.voId ?? '',
        }))
      }
    }

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
              return formatBlackboard(raw, extractPotentialBlackboard(entry))
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

    const charSpaceshipSkills = spaceshipCharRaw[dataId] as { maxSkillCount?: number; skillList?: { charId: string; skillId: string; skillIndex: number; unlockHint: any }[] } | undefined
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

    const potentialLevels: PotentialLevel[] = []
    if (potentialRaw?.potentialUnlockBundle) {
      for (const bundle of potentialRaw.potentialUnlockBundle) {
        const name = resolveI18n(bundle.name, potentialI18n) || ''
        let description = ''
        if (bundle.potentialEffectId && potentialTalentEffectRaw[bundle.potentialEffectId]) {
          const entry = potentialTalentEffectRaw[bundle.potentialEffectId]
          const raw = resolveI18n(entry.desc, potentialTalentEffectI18n)
          if (raw) {
            description = formatBlackboard(raw, extractPotentialBlackboard(entry))
          }
        }
        const requiredItem = (bundle.itemIds ?? []).map((itemId: string, i: number) => ({
          id: itemId,
          count: bundle.itemCnts?.[i] ?? 1,
        }))
        const pics = bundle.unlockCharPictureItemList ?? []
        const portraitUrl = pics.length > 0
          ? `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/spaceship/imageposter/largesize/pic_${bundle.level}_${id}.png`
          : ''
        potentialLevels.push({ level: bundle.level, name, description, requiredItem, portraitUrl })
      }
    }

    return { op, attributes, breakCostMap, talentNodeMap, wpnRecommend, skillGroups, skillLevelUp, skillPatchMap, factorySkills, skillConditions, potentialLevels }
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
    const seen = new Set<string>()
    const items: Item[] = []
    for (const [, v] of Object.entries(rawData)) {
      const item = adaptItem(v, i18nMap)
      if (!seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    }
    return items
  }, [locale])
}

export function useEquips(): UseDataResult<{ equips: Equip[]; suits: Suit[] }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [equipRaw, suitRaw, suitI18n, itemRaw, itemI18n] = await Promise.all([
      getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
      getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
      getTableI18nDict('EquipSuitTable', locale),
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
    ])
    const equips = Object.values(equipRaw).map((v: any) => adaptEquip(v, itemRaw, itemI18n))
    const suits = Object.entries(suitRaw).map(([key, v]) => adaptSuit({ ...v, $key: key }, suitI18n))
    return { equips, suits }
  }, [locale])
}

export function useEquipDetail(id: string): UseDataResult<EquipDetail> {
  const { locale } = useLocale()
  return useData(async () => {
    const [equipRaw, itemRaw, itemI18n, suitRaw, suitI18n, constRaw, enhanceCostRaw, reverseRaw, formulaRaw, chainRaw, attrShowMap] = await Promise.all([
      getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
      getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
      getTableI18nDict('EquipSuitTable', locale),
      getCachedData<Record<string, any>>('EquipConst', () => fetchTableAll('EquipConst').catch(() => ({}))),
      getCachedData<Record<string, any>>('EquipEnhanceCostTable', () => fetchTableAll('EquipEnhanceCostTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('EquipFormulaReverseTable', () => fetchTableAll('EquipFormulaReverseTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('EquipFormulaTable', () => fetchTableAll('EquipFormulaTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('EquipFormulaChainTable', () => fetchTableAll('EquipFormulaChainTable').catch(() => ({}))),
      getAttributeShowMap(locale),
    ])
    if (!equipRaw[id]) {
      const equip = adaptEquip(undefined, itemRaw, itemI18n)
      return { equip, suit: null, suitEquips: [], enhanceMaterialGroups: [], enhanceCost: null, recipes: [] }
    }
    const equip = adaptEquip(equipRaw[id], itemRaw, itemI18n)
    const allEquips = Object.values(equipRaw).map((v: any) => adaptEquip(v, itemRaw, itemI18n))

    const suitEntry = equip.suitId ? suitRaw[equip.suitId] : null
    const suit = suitEntry ? adaptSuit({ ...suitEntry, $key: equip.suitId }, suitI18n) : null
    const equipById = new Map(allEquips.map((e) => [e.id, e]))
    const suitEquips = (suit?.equipIds ?? []).map((eid) => equipById.get(eid)).filter((e): e is Equip => Boolean(e))

    const enhanceRarity = constRaw.enhanceEquipRarity ?? 5
    const enhanceCandidates = allEquips
      .filter((e) => e.id !== id && e.partType === equip.partType && e.rarity >= enhanceRarity)

    const enhanceableAttrs = equip.attrs.filter(a => a.enhancedValues.length > 0)
    const enhanceMaterialGroups: EnhanceMaterialGroup[] = enhanceableAttrs.map(attr => {
      const aKey = attr.compositeAttr || String(attr.attrType)
      const attrInfo = resolveAttrShow(attrShowMap, attr)
      const materials: EnhanceMaterialItem[] = []
      for (const candidate of enhanceCandidates) {
        for (const ca of candidate.attrs) {
          const caKey = ca.compositeAttr || String(ca.attrType)
          if (caKey === aKey && ca.modifierType === attr.modifierType && ca.value >= attr.value) {
            materials.push({ equip: candidate, attrValue: ca.value })
            break
          }
        }
      }
      materials.sort((a, b) => b.attrValue - a.attrValue || b.equip.rarity - a.equip.rarity || b.equip.minWearLv - a.equip.minWearLv)
      return {
        attrKey: aKey,
        modifierType: attr.modifierType,
        attrName: attrInfo.name,
        valueFormat: attrInfo.valueFormat,
        showPercent: attrInfo.showPercent,
        materials,
      }
    })

    const costEntry = enhanceCostRaw[equipRaw[id]?.domainId]
    const enhanceCost = costEntry?.consumeItemId
      ? { itemId: costEntry.consumeItemId, count: costEntry.consumeItemCnt ?? 0 }
      : null

    const formulaId = reverseRaw[id]
    const formula = formulaId ? formulaRaw[formulaId] : null
    const chains = formula ? (chainRaw[formula.level]?.chainList ?? []) : []
    const recipes = formula ? adaptEquipFormula(formula, chains) : []

    recipes.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))

    return { equip, suit, suitEquips, enhanceMaterialGroups, enhanceCost, recipes }
  }, [id, locale])
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

export function useActivities(): UseDataResult<Activity[]> {
  const { locale } = useLocale()
  return useData(async () => {
    const [activitiesRaw, timeRangesRaw, tagsRaw, activityI18n, tagI18n] = await Promise.all([
      getCachedData<Record<string, any>>('ActivityTable', () => fetchTableAll('ActivityTable')),
      getCachedData<Record<string, any>>('TimeRangeTable', () => fetchTableAll('TimeRangeTable')).catch((): Record<string, any> => ({})),
      getCachedData<Record<string, any>>('ActivityTagTable', () => fetchTableAll('ActivityTagTable')).catch((): Record<string, any> => ({})),
      getTableI18nDict('ActivityTable', locale),
      getTableI18nDict('ActivityTagTable', locale).catch(() => ({})),
    ])
    const tagNameMap: Record<string, string> = {}
    for (const [, tag] of Object.entries<any>(tagsRaw)) {
      const tagId: string = tag.tagId ?? ''
      if (tagId) tagNameMap[tagId] = resolveI18n(tag.name, tagI18n) || tagId
    }
    return Object.entries(activitiesRaw).map(([, v]) =>
      adaptActivity(v, timeRangesRaw[v?.timeId ?? ''], activityI18n, tagNameMap),
    )
  }, [locale])
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
      getCachedData<Race[]>(`__built_races_${locale}`, async () => {
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
      getCachedData<{ Table: string; Path: string; Id: string }[]>(`__i18n_search_${locale}_${raceId}`, async () => {
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
      getCachedData<Faction[]>(`__built_factions_${locale}`, async () => {
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
      getCachedData<{ Table: string; Path: string; Id: string }[]>(`__i18n_search_${locale}_${factionId}`, async () => {
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

export function useArchiveSearch(
  query: string,
  options: SearchArchiveOptions = {},
): UseArchiveSearchResult {
  const { locale } = useLocale()
  const pageSize = options.pageSize ?? 30
  const [page, setPage] = useState(0)
  const [allResults, setAllResults] = useState<LightweightResult[]>([])
  const [pageResults, setPageResults] = useState<SearchResult[]>([])
  const [entities, setEntities] = useState<Record<string, Record<string, SearchEntity>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const optionsKey = useMemo(() => JSON.stringify(options), [options])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPage(0)
    try {
      const optionsVal = JSON.parse(optionsKey) as SearchArchiveOptions
      const lightweight = await searchArchive(query, locale, optionsVal)
      setAllResults(lightweight)
      setEntities({})
    } catch (e) {
      setError((e as Error).message)
      setAllResults([])
      setPageResults([])
    } finally {
      setLoading(false)
    }
  }, [query, locale, optionsKey])

  // Enrich current page results whenever page or allResults changes
  useEffect(() => {
    if (allResults.length === 0) {
      setPageResults([])
      return
    }
    let cancelled = false
    const start = page * pageSize
    const slice = allResults.slice(start, start + pageSize)

    enrichResults(slice, locale).then(({ enriched, entities: newEntities }) => {
      if (cancelled) return
      setPageResults(enriched)
      setEntities(prev => {
        const merged = { ...prev }
        for (const [table, map] of Object.entries(newEntities)) {
          merged[table] = { ...merged[table], ...map }
        }
        return merged
      })
    })

    return () => { cancelled = true }
  }, [allResults, page, pageSize, locale])

  useEffect(() => { if (query.trim()) load() }, [load, query])

  return {
    results: pageResults,
    entities,
    total: allResults.length,
    page,
    pageSize,
    loading,
    error,
    setPage,
    refetch: load,
  }
}

// ---------- Factory hooks ----------

export function useFactoryData(): UseDataResult<{ recipes: FactoryRecipe[]; machines: Record<string, FactoryMachine>; itemIds: string[]; index: FactoryItemIndex }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [craftRaw, buildingRaw, buildingI18n] = await Promise.all([
      getCachedData<Record<string, any>>('FactoryMachineCraftTable', () => fetchTableAll('FactoryMachineCraftTable')),
      getCachedData<Record<string, any>>('FactoryBuildingTable', () => fetchTableAll('FactoryBuildingTable')),
      getTableI18nDict('FactoryBuildingTable', locale).catch(() => ({}) as Record<string, string>),
    ])
    const recipes = Object.values(craftRaw).map(v => adaptFactoryRecipe(v))
    const machines: Record<string, FactoryMachine> = {}
    for (const [k, v] of Object.entries(buildingRaw)) {
      machines[k] = adaptFactoryMachine(v, buildingI18n)
    }

    const itemIdSet = new Set<string>()
    const asIngredient: Record<string, FactoryRecipe[]> = {}
    const asOutcome: Record<string, FactoryRecipe[]> = {}
    for (const recipe of recipes) {
      for (const ing of recipe.ingredients) {
        itemIdSet.add(ing.itemId)
        if (!asIngredient[ing.itemId]) asIngredient[ing.itemId] = []
        asIngredient[ing.itemId].push(recipe)
      }
      for (const out of recipe.outcomes) {
        itemIdSet.add(out.itemId)
        if (!asOutcome[out.itemId]) asOutcome[out.itemId] = []
        asOutcome[out.itemId].push(recipe)
      }
    }
    const itemIds = Array.from(itemIdSet).sort()
    const index: FactoryItemIndex = { asIngredient, asOutcome }

    return { recipes, machines, itemIds, index }
  }, [locale])
}

export function useFactoryItemMeta(itemIds: string[]): Record<string, { name: string; rarity: number }> {
  const { locale } = useLocale()
  const [itemMeta, setItemMeta] = useState<Record<string, { name: string; rarity: number }>>({})
  // 仅以 id 集合内容作为依赖，避免数组引用变化导致重复拉取
  const idsKey = useMemo(() => itemIds.slice().sort().join(','), [itemIds])

  useEffect(() => {
    if (!idsKey) return
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getTableI18nDict('ItemTable', locale),
    ]).then(([raw, i18nMap]) => {
      if (cancelled) return
      const meta: Record<string, { name: string; rarity: number }> = {}
      for (const id of idsKey.split(',')) {
        const item = raw[id]
        const name = item?.name ? (i18nMap[String(item.name.id)] || item.name.text || id) : id
        meta[id] = { name, rarity: item?.rarity ?? 0 }
      }
      setItemMeta(meta)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [idsKey, locale])

  return itemMeta
}

export function useFactoryItemIds(): UseDataResult<string[]> {
  const { data, loading, error, refetch } = useFactoryData()
  return { data: data?.itemIds ?? [], loading, error, refetch }
}

export function useItemRecipes(itemId: string | null): { asProduct: FactoryRecipe[]; asMaterial: FactoryRecipe[] } {
  const { data } = useFactoryData()
  return useMemo(() => {
    if (!data || !itemId) return { asProduct: [], asMaterial: [] }
    return {
      asProduct: data.index.asOutcome[itemId] ?? [],
      asMaterial: data.index.asIngredient[itemId] ?? [],
    }
  }, [data, itemId])
}

export function useCraftingChain(targets: ChainTarget[], regionId?: string): UseDataResult<ChainGraph> {
  const { data: factoryData, loading, error, refetch } = useFactoryData()
  const [chainData, setChainData] = useState<{ defaultCrafts: Record<string, string>; sources: import('../lib/factory/types').FactorySource[] }>({ defaultCrafts: {}, sources: [] })
  const [beltTable, setBeltTable] = useState<Record<string, any> | null>(null)
  const [pipeTable, setPipeTable] = useState<Record<string, any> | null>(null)
  const [liquids, setLiquids] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (targets.length === 0 || !factoryData) return
    let cancelled = false
    Promise.all([
      getCachedData<Record<string, any>>('WikiDefaultCraftTable', () => fetchTableAll('WikiDefaultCraftTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('FactoryMinerTable', () => fetchTableAll('FactoryMinerTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('FactoryGasMinerTable', () => fetchTableAll('FactoryGasMinerTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('FactoryFluidPumpInTable', () => fetchTableAll('FactoryFluidPumpInTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('FactoryGridBeltTable', () => fetchTableAll('FactoryGridBeltTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('FactoryLiquidPipeTable', () => fetchTableAll('FactoryLiquidPipeTable').catch(() => ({}))),
      getCachedData<Record<string, any>>('LiquidTable', () => fetchTableAll('LiquidTable').catch(() => ({}))),
    ]).then(([defaultCraftRaw, minerRaw, gasMinerRaw, pumpRaw, beltRaw, pipeRaw, liquidRaw]) => {
      if (cancelled) return
      const defaultCrafts: Record<string, string> = {}
      for (const [itemId, entry] of Object.entries<any>(defaultCraftRaw)) {
        // WikiDefaultCraftTable 值为 craftId 纯字符串（兼容对象格式）
        const craftId = typeof entry === 'string' ? entry : entry?.craftId
        if (craftId) defaultCrafts[itemId] = craftId
      }
      const sources = adaptFactorySources(minerRaw, gasMinerRaw, pumpRaw)
      setChainData({ defaultCrafts, sources })
      setBeltTable(beltRaw)
      setPipeTable(pipeRaw)
      setLiquids(new Set(Object.keys(liquidRaw)))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [factoryData, targets.length])

  const graph = useMemo<ChainGraph>(() => {
    if (!factoryData || targets.length === 0) return { nodes: [], edges: [] }
    const regionCaps = regionId ? getFactoryRegion(regionId)?.caps : undefined
    return buildChainGraph(targets, factoryData.recipes, factoryData.index, chainData.sources, chainData.defaultCrafts, undefined, factoryData.machines, liquids, beltTable ?? undefined, pipeTable ?? undefined, regionCaps)
  }, [factoryData, targets, chainData, liquids, beltTable, pipeTable, regionId])

  return { data: graph, loading, error, refetch }
}

// ===== Story Chronicle hooks =====

export function useStoryRecap(): UseDataResult<{
  scenes: StoryRecapScene[]
  chapters: StoryRecapChapter[]
  stats: { total: number; byType: Record<string, number> }
}> {
  const { locale } = useLocale()
  const { t } = useI18n()
  return useData(async () => {
    const [mapRaw, summaryRaw, summaryI18n] = await Promise.all([
      getCachedData<Record<string, string>>('DialogSummaryMapTable', () => fetchTableAll('DialogSummaryMapTable')),
      getCachedData<Record<string, any>>('DialogSummaryTable', () => fetchTableAll('DialogSummaryTable')),
      getTableI18nDict('DialogSummaryTable', locale),
    ])
    const scenes = Object.entries(mapRaw)
      .map(([dlgKey, summaryId]) => {
        const summary = summaryRaw[summaryId]
        if (!summary) return null
        const scene = adaptRecapScene(dlgKey, summaryId, summary, summaryI18n, t('story.scene'))
        if (!scene) console.warn(`[story-recap] unrecognized dlg key: ${dlgKey}`)
        return scene ?? adaptRecapFallbackScene(dlgKey, summaryId, summary, summaryI18n, t('story.scene'))
      })
      .filter((s): s is StoryRecapScene => s !== null)
    const chapters = adaptRecapChapter(scenes)
    const byType: Record<string, number> = {}
    for (const s of scenes) byType[s.chapterType] = (byType[s.chapterType] ?? 0) + 1
    return { scenes, chapters, stats: { total: scenes.length, byType } }
  }, [locale])
}

export function usePrtsLibrary(): UseDataResult<{
  categories: PrtsCategory[]
  volumes: PrtsVolume[]
  items: PrtsItem[]
}> {
  const { locale } = useLocale()
  return useData(async () => {
    const [catRaw, volRaw, itemRaw, catI18n, volI18n, itemI18n] = await Promise.all([
      getCachedData<Record<string, any>>('PrtsCategory', () => fetchTableAll('PrtsCategory')),
      getCachedData<Record<string, any>>('PrtsFirstLv', () => fetchTableAll('PrtsFirstLv')),
      getCachedData<Record<string, any>>('PrtsAllItem', () => fetchTableAll('PrtsAllItem')),
      getTableI18nDict('PrtsCategory', locale),
      getTableI18nDict('PrtsFirstLv', locale),
      getTableI18nDict('PrtsAllItem', locale),
    ])
    const categories = Object.entries(catRaw).map(([k, v]) => adaptPrtsCategory({ ...(v as any), $key: k }, catI18n))
    const volumes = Object.entries(volRaw).map(([k, v]) => adaptPrtsVolume({ ...(v as any), $key: k }, volI18n))
    const items = Object.entries(itemRaw).map(([k, v]) => adaptPrtsItem({ ...(v as any), $key: k }, itemI18n))
    for (const cat of categories) {
      cat.itemCount = items.filter((i) => volumes.find((v) => v.id === i.volumeId && v.categoryId === cat.id)).length
    }
    return { categories, volumes, items }
  }, [locale])
}

export function usePrtsItemDetail(itemId: string): UseDataResult<PrtsItemDetail | null> {
  const { locale } = useLocale()
  return useData(async () => {
    const [itemRaw, volRaw, itemI18n, volI18n] = await Promise.all([
      getCachedData<Record<string, any>>('PrtsAllItem', () => fetchTableAll('PrtsAllItem')),
      getCachedData<Record<string, any>>('PrtsFirstLv', () => fetchTableAll('PrtsFirstLv')),
      getTableI18nDict('PrtsAllItem', locale),
      getTableI18nDict('PrtsFirstLv', locale),
    ])
    const item = itemRaw[itemId]
    if (!item) return null
    const base = adaptPrtsItem({ ...item, $key: itemId }, itemI18n)
    const volume = volRaw[base.volumeId]
    const detail: PrtsItemDetail = {
      ...base,
      volumeName: resolveI18n(volume?.name, volI18n),
      categoryId: volume?.categoryId ?? '',
      contents: [],
    }
    if (base.type === 'multi_media') {
      const [radio, radioI18n] = await Promise.all([
        getCachedData<any>('RadioTable', () => fetchTableEntry('RadioTable', base.contentId), base.contentId),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_RadioTable`,
          () => fetchTableDictEntry('RadioTable', base.contentId, locale), base.contentId),
      ])
      detail.script = (radio?.radioSingleDataList ?? []).map((r: any) => ({
        speaker: resolveI18n(r.actorName, radioI18n),
        line: resolveI18n(r.radioText, radioI18n),
      }))
    } else {
      const [richRaw, richI18n] = await Promise.all([
        getCachedData<Record<string, any>>('RichContentTable', () => fetchTableAll('RichContentTable')),
        getTableI18nDict('RichContentTable', locale),
      ])
      const rich = richRaw[base.contentId]
      if (rich) {
        detail.contents = [{
          title: resolveI18n(rich.title, richI18n),
          segments: (rich.contentList ?? []).map((c: any) => resolveI18n(c.content, richI18n)),
        }]
      }
    }
    return detail
  }, [locale, itemId])
}

export function useBakerChats(): UseDataResult<{ chats: BakerChat[]; topics: BakerTopic[] }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [chatRaw, topicRaw, dialogRaw, chatI18n, topicI18n, dialogI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SNSChatTable', () => fetchTableAll('SNSChatTable')),
      getCachedData<Record<string, any>>('SNSDialogTopicTable', () => fetchTableAll('SNSDialogTopicTable')),
      getCachedData<Record<string, any>>('SNSDialogTable', () => fetchTableAll('SNSDialogTable')),
      getTableI18nDict('SNSChatTable', locale),
      getTableI18nDict('SNSDialogTopicTable', locale),
      getTableI18nDict('SNSDialogTable', locale),
    ])
    const chats = Object.entries(chatRaw).map(([k, v]) => adaptBakerChat({ ...(v as any), $key: k }, chatI18n))
    const lastMessagePreview = (dialog: any): string => {
      const nodes = dialog?.dialogContentData ?? {}
      let id = '1', last = ''
      const visited = new Set<string>()
      while (id && id !== '-1' && id !== '0' && !visited.has(id)) {
        visited.add(id)
        const node = nodes[id]
        if (!node) break
        if (node.contentType === 1 && node.content?.id) last = resolveI18n(node.content, dialogI18n)
        id = String(node.nextContentId)
      }
      return last
    }
    const topics = Object.entries(topicRaw).map(([k, v]: [string, any]) => ({
      topicId: k,
      topicName: resolveI18n(v.topicName, topicI18n),
      sortId: v.sortId ?? 0,
      dialogs: (v.includeDialogIds ?? []).map((did: string) => ({
        dialogId: did,
        preview: lastMessagePreview(dialogRaw[did]),
      })),
    }))
    return { chats, topics: topics.sort((a, b) => a.sortId - b.sortId) }
  }, [locale])
}

export function useBakerDialog(chatId: string | null): UseDataResult<{
  dialogs: { dialogId: string; topicId: string; nodes: Record<string, any> }[]
  options: Record<string, any>
  ctx: Omit<ResolveContext, 'speaker'>
} | null> {
  const { locale } = useLocale()
  return useData(async () => {
    if (!chatId) return null
    const [dialogRaw, optionRaw, topicRaw, constRaw, dialogI18n, optionI18n] = await Promise.all([
      getCachedData<Record<string, any>>('SNSDialogTable', () => fetchTableAll('SNSDialogTable')),
      getCachedData<Record<string, any>>('SNSDialogOptionTable', () => fetchTableAll('SNSDialogOptionTable')),
      getCachedData<Record<string, any>>('SNSDialogTopicTable', () => fetchTableAll('SNSDialogTopicTable')),
      getCachedData<Record<string, any>>('SNSConst', () => fetchTableAll('SNSConst')),
      getTableI18nDict('SNSDialogTable', locale),
      getTableI18nDict('SNSDialogOptionTable', locale),
    ])
    const topicSort = new Map(Object.entries(topicRaw).map(([k, v]: [string, any]) => [k, v.sortId ?? 0]))
    const dialogs = Object.entries(dialogRaw)
      .filter(([, d]: [string, any]) => d.chatId === chatId)
      .map(([k, d]: [string, any]) => ({ dialogId: k, topicId: d.topicId ?? '', nodes: d.dialogContentData ?? {} }))
      .sort((a, b) =>
        (topicSort.get(a.topicId) ?? 0) - (topicSort.get(b.topicId) ?? 0) ||
        a.dialogId.localeCompare(b.dialogId))
    return {
      dialogs,
      options: optionRaw,
      ctx: { dialogI18n, optionI18n, startId: String(constRaw?.snsDialogStartId ?? '1') },
    }
  }, [locale, chatId])
}
