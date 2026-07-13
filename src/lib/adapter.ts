import type { Operator, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area } from './types'
import { PROFESSION_MAP, ELEMENT_MAP, RARITY_STARS, inferWeaponType } from '../data/constants'

export function adaptOperator(raw: any): Operator {
  const profId: number = raw.profession ?? raw.professionId ?? 0
  const charType: string = raw.charType ?? raw.attributeType ?? ''
  const rarityId: number = raw.rarity ?? raw.rarityId ?? 0

  return {
    id: raw.characterId ?? raw.$key ?? raw.$id ?? '',
    name: raw.name?.text ?? raw.name ?? '',
    profession: PROFESSION_MAP[profId] ?? '未知',
    element: ELEMENT_MAP[charType]?.name ?? '物理',
    elementColor: ELEMENT_MAP[charType]?.color ?? '#888888',
    faction: extractTag(raw.factionTag ?? raw.faction, 'tag_power_'),
    race: extractTag(raw.raceTag ?? raw.race, 'tag_race_'),
    rarity: RARITY_STARS[rarityId] ?? 3,
    profileRecords: extractTextArray(raw.profileRecord, 'recordDesc'),
    voiceLines: (raw.profileVoice ?? []).map((v: any) => ({
      title: v.voiceTitle?.text ?? v.voiceTitle ?? '',
      text: v.voiceDesc?.text ?? v.voiceDesc ?? '',
    })),
    tags: extractTagTexts(raw.tagDesc),
  }
}

export function adaptWeapon(raw: any): Weapon {
  const id: string = raw.weaponId ?? raw.$key ?? ''
  return {
    id,
    name: raw.engName?.text ?? raw.name?.text ?? id,
    type: inferWeaponType(id),
    rarity: raw.rarity ?? 0,
    description: raw.weaponDesc?.text ?? '',
    lore: raw.decoDesc?.text ?? '',
    skills: raw.weaponSkillList ?? [],
    maxLevel: raw.maxLv ?? 90,
  }
}

export function adaptEnemy(raw: any): Enemy {
  return {
    id: raw.enemyId ?? raw.$key ?? '',
    name: raw.name?.text ?? raw.enemyName?.text ?? '',
    tags: (raw.tags ?? []).map((t: any) => t.tagId ?? t),
    description: raw.description?.text ?? '',
  }
}

export function adaptItem(raw: any): Item {
  return {
    id: raw.itemId ?? raw.$key ?? '',
    name: raw.name?.text ?? raw.itemName?.text ?? '',
    type: raw.itemType ?? '',
    rarity: raw.rarity ?? 0,
    description: raw.desc?.text ?? '',
    decoDesc: raw.decoDesc?.text ?? '',
  }
}

export function adaptEquip(raw: any): Equip {
  return {
    id: raw.equipId ?? raw.$key ?? '',
    name: raw.name?.text ?? raw.equipName?.text ?? '',
    slot: raw.slot ?? '',
    rarity: raw.rarity ?? '',
    suitId: raw.suitId ?? '',
    description: raw.desc?.text ?? '',
  }
}

export function adaptSuit(raw: any): Suit {
  return {
    id: raw.suitId ?? raw.$key ?? '',
    name: raw.suitName?.text ?? '',
    twoPieceEffect: raw.twoPieceEffect?.text ?? '',
    fourPieceEffect: raw.fourPieceEffect?.text ?? '',
  }
}

export function adaptGem(raw: any): Gem {
  return {
    id: raw.gemId ?? raw.$key ?? '',
    name: raw.name?.text ?? raw.gemName?.text ?? '',
    slot: raw.slot ?? '',
    tags: raw.subTags ?? raw.tags ?? [],
  }
}

export function adaptDocument(raw: any): StoryDocument {
  return {
    id: raw.$key ?? raw.documentId ?? '',
    title: raw.name?.text ?? '',
    category: raw.category ?? '',
  }
}

export function adaptArea(raw: any): Area {
  return {
    id: raw.areaId ?? raw.$key ?? '',
    name: raw.name?.text ?? raw.areaName?.text ?? raw.$key ?? '',
    description: '',
    faction: '',
  }
}

// ---------- helpers ----------

function extractTag(tag: any, prefix: string): string {
  if (!tag) return ''
  const id = typeof tag === 'string' ? tag : tag.tagId ?? ''
  return id.replace(prefix, '')
}

function extractTextArray(arr: any[] | undefined, field: string): string[] {
  if (!arr) return []
  return arr.map((item: any) => item[field]?.text ?? item[field] ?? '').filter(Boolean)
}

function extractTagTexts(tagDesc: any): string[] {
  if (!tagDesc) return []
  return Object.values(tagDesc).map((t: any) => t.desc?.text ?? '').filter(Boolean)
}
