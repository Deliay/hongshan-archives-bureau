import type { Operator, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area, EquipAttr, RecipeEntry } from './types'

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
  raceMap?: Record<string, string>,
  blocMap?: Record<string, string>,
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
    race: raceMap?.[charId] ?? '',
    faction: blocMap?.[charId] ?? '',
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

export function adaptEnemy(raw: any, i18nMap?: Record<string, string>, wikiGroupMap?: Record<string, string>): Enemy {
  const id = raw.enemyId ?? raw.templateId ?? raw.$key ?? ''
  const templateId = raw.templateId ?? id
  return {
    id,
    name: resolveI18n(raw.name ?? raw.enemyName, i18nMap) || id,
    tags: (raw.tags ?? []).map((t: any) => t.tagId ?? t),
    description: resolveI18n(raw.description, i18nMap),
    displayType: raw.displayType ?? 0,
    nickname: resolveI18n(raw.nickname, i18nMap) || '',
    wikiGroup: wikiGroupMap?.[templateId] ?? wikiGroupMap?.[raw.enemyId ?? ''] ?? '',
    templateId,
    enemyId: raw.enemyId ?? '',
    distributionIds: raw.distributionIds ?? [],
    abilityDescIds: raw.abilityDescIds ?? [],
    attrTemplateId: raw.attrTemplateId ?? '',
    sourceTable: raw.enemyId !== undefined ? 'DisplayInfo' : 'TemplateDisplayInfo',
  }
}

export function adaptItem(raw: any, i18nMap?: Record<string, string>): Item {
  return {
    id: raw.itemId ?? raw.$key ?? raw.id ?? '',
    name: resolveI18n(raw.name, i18nMap) || raw.id || '',
    type: Number(raw.type) ?? 0,
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

export function adaptEquip(raw: any, itemRaw: any, i18nMap?: Record<string, string>): Equip {
  const id = raw?.itemId ?? raw?.$key ?? ''
  const item = itemRaw?.[id]
  const name = item ? resolveI18n(item.name, i18nMap) : ''

  const baseRaw = raw?.displayBaseAttrModifier
  const baseAttr: EquipAttr | null = baseRaw ? {
    attrType: baseRaw.attrType ?? 0,
    value: baseRaw.attrValue ?? 0,
    enhancedValues: [],
    modifierType: baseRaw.modifierType ?? 0,
  } : null

  const attrs: EquipAttr[] = (raw?.displayAttrModifiers ?? []).map((a: any) => ({
    attrType: a.attrType ?? 0,
    value: a.attrValue ?? 0,
    enhancedValues: a.enhancedAttrValues ?? [],
    modifierType: a.modifierType ?? 0,
  }))

  return {
    id,
    name: name || id,
    description: item ? resolveI18n(item.desc, i18nMap) : '',
    decoDesc: item ? resolveI18n(item.decoDesc, i18nMap) : '',
    iconId: item?.iconId ?? id,
    rarity: item?.rarity ?? 0,
    partType: raw?.partType ?? 0,
    suitId: raw?.suitID ?? '',
    minWearLv: raw?.minWearLv ?? 0,
    baseAttr,
    attrs,
    obtainWayIds: item?.obtainWayIds ?? [],
  }
}

export function adaptSuit(raw: any, i18nMap?: Record<string, string>): Suit {
  const list = raw.list ?? []
  const equipIds: string[] = raw.equipList ?? []
  const effects: { equipCnt: number; skillId: string; skillLv: number }[] = list.map((e: any) => ({
    equipCnt: e.equipCnt ?? 0,
    skillId: e.skillID ?? '',
    skillLv: e.skillLv ?? 0,
  }))

  return {
    id: list[0]?.suitID ?? raw.$key ?? '',
    name: resolveI18n(list[0]?.suitName, i18nMap) || list[0]?.suitID || raw.$key || '',
    logoName: list[0]?.suitLogoName ?? '',
    equipIds,
    effects,
  }
}

export function adaptEquipFormula(formula: any, chains: any[]): RecipeEntry[] {
  return chains.map((chain: any) => ({
    formulaId: formula.formulaId ?? '',
    chainId: chain.chainId ?? '',
    level: formula.level ?? '',
    isDefault: Boolean(chain.isDefault),
    materials: (chain.costItemId ?? []).map((itemId: string, i: number) => ({
      itemId,
      count: chain.costItemNum?.[i] ?? 0,
    })),
    goldId: chain.costGoldId ?? '',
    goldCount: chain.costGoldNum ?? 0,
    unlockType: formula.unlockType ?? 0,
    unlockKey: formula.unlockKey ?? '',
  }))
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


