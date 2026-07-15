import type { Operator, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area } from './types'

export const ASSET_BASE = 'https://endfield-assets.fffdan.com/vfs/Bundle/file'

export function resolveI18n(field: { id?: number | string; text?: string } | null | undefined, i18nMap?: Record<string, string>): string {
  if (!field) return ''
  const id = String(field.id ?? '')
  return i18nMap?.[id] || field.text || ''
}

export function adaptOperator(
  raw: any,
  i18nMap?: Record<string, string>,
  professionMap?: Record<number, { name: string; icon: string }>,
  elementMap?: Record<string, { name: string; color: string; icon: string }>,
  battleTagMap?: Record<string, string>,
  attrMap?: Record<number, { id: number; name: string; icon: string }>,
): Operator {
  const profId: number = raw.profession ?? raw.professionId ?? 0
  const charType: string = raw.charTypeId ?? raw.charType ?? raw.attributeType ?? ''
  const rawRarity: number = raw.rarity ?? raw.rarityId ?? 0
  const prof = professionMap?.[profId]
  const elem = elementMap?.[charType]

  const mainAttrId: number = raw.mainAttrType ?? 0
  const subAttrId: number = raw.subAttrType ?? 0
  const mainAttrDef = attrMap?.[mainAttrId]
  const subAttrDef = attrMap?.[subAttrId]
  const charId = raw.charId ?? raw.characterId ?? raw.$key ?? raw.$id ?? ''
  return {
    id: charId,
    name: resolveI18n(raw.name, i18nMap),
    portrait: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/charicon/icon_${charId}.png`,
    profession: prof?.name ?? '未知',
    professionIcon: prof?.icon ?? '',
    element: elem?.name ?? '未知',
    elementColor: elem?.color ?? '#888888',
    elementIcon: elem?.icon ?? '',
    rarity: rawRarity,
    mainAttr: mainAttrDef ?? { id: mainAttrId, name: '未知', icon: '' },
    subAttr: subAttrDef ?? { id: subAttrId, name: '未知', icon: '' },
    profileRecords: (raw.profileRecord ?? []).map((r: any) => resolveI18n(r.recordDesc, i18nMap)),
    voiceLines: (raw.profileVoice ?? []).map((v: any) => ({
      title: resolveI18n(v.voiceTitle, i18nMap),
      text: resolveI18n(v.voiceDesc, i18nMap),
    })),
    tags: (raw.charBattleTagIds ?? []).map((id: string) => battleTagMap?.[id] ?? id),
  }
}

export function adaptWeapon(raw: any, itemRaw: any, i18nMap?: Record<string, string>, itemI18nMap?: Record<string, string>, weaponTypeNameMap?: Record<number, string>): Weapon {
  const id: string = raw.weaponId ?? raw.$key ?? ''
  const item = itemRaw?.[id]
  const itemName = item ? resolveI18n(item.name, itemI18nMap) : ''
  return {
    id,
    name: itemName || resolveI18n(raw.engName ?? raw.name, i18nMap) || id,
    type: weaponTypeNameMap?.[raw.weaponType] ?? '未知',
    weaponType: raw.weaponType ?? 0,
    rarity: raw.rarity ?? 0,
    description: resolveI18n(raw.weaponDesc, i18nMap),
    lore: item ? resolveI18n(item.decoDesc, itemI18nMap) : '',
    itemDesc: item ? resolveI18n(item.desc, itemI18nMap) : '',
    skills: raw.weaponSkillList ?? [],
    maxLevel: raw.maxLv ?? 90,
    iconId: item?.iconId ?? id,
    breakthroughTemplateId: raw.breakthroughTemplateId ?? '',
    levelTemplateId: raw.levelTemplateId ?? '',
    talentTemplateId: raw.talentTemplateId ?? '',
    weaponPotentialSkill: raw.weaponPotentialSkill ?? '',
  }
}

export function adaptEnemy(raw: any, i18nMap?: Record<string, string>): Enemy {
  return {
    id: raw.enemyId ?? raw.$key ?? '',
    name: resolveI18n(raw.name ?? raw.enemyName, i18nMap) || raw.enemyId || '',
    tags: (raw.tags ?? []).map((t: any) => t.tagId ?? t),
    description: resolveI18n(raw.description, i18nMap),
  }
}

export function adaptItem(raw: any, i18nMap?: Record<string, string>): Item {
  return {
    id: raw.itemId ?? raw.$key ?? raw.id ?? '',
    name: resolveI18n(raw.name, i18nMap) || raw.id || '',
    type: raw.type ?? raw.itemType ?? '',
    rarity: raw.rarity ?? 0,
    description: resolveI18n(raw.desc, i18nMap),
    decoDesc: resolveI18n(raw.decoDesc, i18nMap),
    iconId: raw.iconId ?? undefined,
    iconCompositeId: raw.iconCompositeId ?? undefined,
    obtainWayIds: raw.obtainWayIds ?? [],
    noObtainWayHint: raw.noObtainWayHint ?? undefined,
    showingType: raw.showingType ?? 0,
    valuableTabType: raw.valuableTabType ?? 0,
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

export function adaptSuit(raw: any, i18nMap?: Record<string, string>): Suit {
  const first = raw.list?.[0]
  return {
    id: raw.suitId ?? raw.$key ?? '',
    name: resolveI18n(first?.suitName, i18nMap) || raw.suitId || '',
    twoPieceEffect: resolveI18n(raw.twoPieceEffect, i18nMap),
    fourPieceEffect: resolveI18n(raw.fourPieceEffect, i18nMap),
  }
}

export function adaptGem(raw: any, i18nMap?: Record<string, string>): Gem {
  return {
    id: raw.gemTermId ?? raw.$key ?? '',
    name: resolveI18n(raw.tagName, i18nMap) || raw.tagId || '',
    slot: raw.slot ?? '',
    tags: raw.subTags ?? raw.tags ?? [],
  }
}

export function adaptDocument(raw: any, i18nMap?: Record<string, string>): StoryDocument {
  return {
    id: raw.$key ?? raw.documentId ?? '',
    title: resolveI18n(raw.name, i18nMap) || raw.id || '',
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


