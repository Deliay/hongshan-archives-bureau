import type { Operator, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area, EquipAttr, RecipeEntry, Activity, ActivityGroup, ActivityStatus, ActivityTimeRange, StoryRecapScene, StoryRecapChapter, StoryRecapMission, PrtsCategory, PrtsVolume, PrtsItem, BakerChat, BakerMessage, MissionRuntime, MissionQuest, MissionQuestObjective, MissionQuestTreeNode } from './types'
import { renderMissionCondition } from './missionCondition'
import { ACTIVITY_TYPE_GROUPS } from '../data/constants'

export const ASSET_BASE = 'https://endfield-assets.fffdan.com/vfs/Bundle/file'

export function getSpriteUrl(path: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/${path}.png`
}

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
      voiceIndex: v.voiceIndex ?? 0,
      unlockType: v.unlockType ?? 0,
      unlockValue: v.unlockValue ?? 0,
      voId: v.voId ?? '',
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
    compositeAttr: baseRaw.compositeAttr ?? '',
  } : null

  const attrs: EquipAttr[] = (raw?.displayAttrModifiers ?? []).map((a: any) => ({
    attrType: a.attrType ?? 0,
    value: a.attrValue ?? 0,
    enhancedValues: a.enhancedAttrValues ?? [],
    modifierType: a.modifierType ?? 0,
    compositeAttr: a.compositeAttr ?? '',
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

export function parseActivityTime(raw: string): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 8, Number(mi), Number(s))
}

export function getActivityGroup(type: number): ActivityGroup {
  for (const [group, types] of Object.entries(ACTIVITY_TYPE_GROUPS)) {
    if (types.includes(type)) return group as ActivityGroup
  }
  return 'other'
}

export function getActivityStatus(ranges: ActivityTimeRange[], now: number): ActivityStatus | 'unknown' {
  if (ranges.length === 0) return 'unknown'
  if (ranges.some((r) => r.closeTime === null)) return 'permanent'
  if (ranges.some((r) => r.openTime <= now && r.closeTime !== null && now < r.closeTime)) return 'ongoing'
  if (ranges.some((r) => r.openTime > now)) return 'upcoming'
  return 'expired'
}

export function adaptActivity(
  raw: any,
  timeRaw: any,
  i18nMap?: Record<string, string>,
  tagNameMap?: Record<string, string>,
): Activity {
  const id: string = raw?.id ?? raw?.$key ?? ''
  const type: number = raw?.type ?? 0
  const seen = new Set<string>()
  const timeRanges: ActivityTimeRange[] = []
  for (const entry of timeRaw?.timeRangeList ?? []) {
    const openTime = parseActivityTime(entry?.openTime ?? '')
    if (openTime === null) continue
    const closeRaw = entry?.closeTime ?? ''
    const closeTime = closeRaw ? parseActivityTime(closeRaw) : null
    const key = `${openTime}:${closeTime}`
    if (seen.has(key)) continue
    seen.add(key)
    timeRanges.push({ openTime, closeTime })
  }
  timeRanges.sort((a, b) => a.openTime - b.openTime)

  const tabImg: string = raw?.tabImg ?? ''
  return {
    id,
    name: resolveI18n(raw?.name, i18nMap) || id,
    desc: resolveI18n(raw?.desc, i18nMap),
    type,
    group: getActivityGroup(type),
    status: getActivityStatus(timeRanges, Date.now()),
    timeRanges,
    tags: (raw?.tagIds ?? []).map((tagId: string) => tagNameMap?.[tagId] ?? tagId),
    tabImg: tabImg ? `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/activity/${tabImg}.png` : '',
    tabImgColor: raw?.tabImgColor ?? '',
    rewardId: raw?.rewardId ?? '',
    sortId: raw?.sortId ?? 0,
  }
}

// ---------- helpers ----------

// ===== Story Chronicle =====

const DLG_KEY_RE = /^dlg_([a-z]+)(\d+)(?:l(\d+))?m(\d+)(?:d(\d+))?_(\d+)(?:d(\d+))?$/

export function adaptRecapScene(
  dlgKey: string,
  summaryId: string,
  summaryText: { id?: number | string; text?: string },
  i18nMap: Record<string, string> | undefined,
  sceneLabel: string,
): StoryRecapScene | null {
  const m = DLG_KEY_RE.exec(dlgKey)
  if (!m) return null
  const [, chapterType, chapterNum, lvNum, missionNum, missionSub, sceneNo, sceneSub] = m
  const chapterId = `${chapterType}${chapterNum}`
  const missionId = `${chapterId}${lvNum ? `l${lvNum}` : ''}m${missionNum}${missionSub ? `d${missionSub}` : ''}`
  const code = `${chapterId.toUpperCase()}·M${missionNum}·${sceneLabel}${String(sceneNo).padStart(2, '0')}${sceneSub ? `d${sceneSub}` : ''}`
  return {
    id: summaryId,
    dlgId: dlgKey,
    chapterId,
    missionId,
    sceneNo: Number(sceneNo),
    sceneSub: sceneSub ? Number(sceneSub) : 0,
    chapterType,
    code,
    text: resolveI18n(summaryText, i18nMap),
  }
}

export function adaptRecapFallbackScene(
  dlgKey: string,
  summaryId: string,
  summaryText: { id?: number | string; text?: string },
  i18nMap: Record<string, string> | undefined,
  sceneLabel: string,
): StoryRecapScene {
  return {
    id: summaryId,
    dlgId: dlgKey,
    chapterId: 'other',
    missionId: dlgKey,
    sceneNo: 0,
    sceneSub: 0,
    chapterType: 'other',
    code: `${dlgKey}·${sceneLabel}--`,
    text: resolveI18n(summaryText, i18nMap),
  }
}

type SortTuple = [string, number, number, number, number, number, number]

function dlgSortKey(s: StoryRecapScene): SortTuple {
  const m = DLG_KEY_RE.exec(s.dlgId)
  if (!m) return [s.chapterType, 999, 0, 999, 0, 999, 0]
  const [, ct, cn, lv, mn, md, sn, sd] = m
  return [ct, Number(cn), Number(lv ?? 0), Number(mn), Number(md ?? 0), Number(sn), Number(sd ?? 0)]
}

function compareTuple(a: SortTuple, b: SortTuple): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue
    return typeof a[i] === 'string'
      ? (a[i] as string).localeCompare(b[i] as string)
      : (a[i] as number) - (b[i] as number)
  }
  return 0
}

export function adaptRecapChapter(scenes: StoryRecapScene[], missionNameMap?: Record<string, string>): StoryRecapChapter[] {
  const sorted = [...scenes].sort((a, b) => compareTuple(dlgSortKey(a), dlgSortKey(b)))
  const chapters: StoryRecapChapter[] = []
  let chapter: StoryRecapChapter | null = null
  let mission: StoryRecapMission | null = null
  for (const s of sorted) {
    if (!chapter || chapter.chapterId !== s.chapterId) {
      chapter = { chapterId: s.chapterId, chapterType: s.chapterType, missions: [] }
      chapters.push(chapter)
      mission = null
    }
    if (!mission || mission.missionId !== s.missionId) {
      mission = { missionId: s.missionId, name: missionNameMap?.[s.missionId] || s.missionId, scenes: [] }
      chapter.missions.push(mission)
    }
    mission.scenes.push(s)
  }
  return chapters
}

const MISSION_GROUP_RE = /^([a-z]+)\d/

function missionSortKey(id: string): SortTuple {
  const m = DLG_KEY_RE.exec(`dlg_${id}_1`)
  if (m) {
    const [, ct, cn, lv, mn, md, sn, sd] = m
    return [ct, Number(cn), Number(lv ?? 0), Number(mn), Number(md ?? 0), Number(sn), Number(sd ?? 0)]
  }
  return [id, 0, 0, 0, 0, 0, 0]
}

export function buildRecapChaptersFromMissions(
  missionIds: string[],
  scenes: StoryRecapScene[],
  missionNameMap?: Record<string, string>,
): StoryRecapChapter[] {
  const sceneByMission = new Map<string, StoryRecapScene[]>()
  for (const s of scenes) {
    const arr = sceneByMission.get(s.missionId)
    if (arr) arr.push(s)
    else sceneByMission.set(s.missionId, [s])
  }
  const chapters = new Map<string, StoryRecapChapter>()
  for (const id of missionIds) {
    const group = MISSION_GROUP_RE.exec(id)?.[1] ?? 'other'
    if (!chapters.has(group)) {
      chapters.set(group, { chapterId: group, chapterType: group, missions: [] })
    }
    const chapter = chapters.get(group)!
    const missionScenes = (sceneByMission.get(id) ?? []).sort((a, b) => compareTuple(dlgSortKey(a), dlgSortKey(b)))
    chapter.missions.push({
      missionId: id,
      name: missionNameMap?.[id] || id,
      scenes: missionScenes,
    })
  }
  const result = [...chapters.values()].sort((a, b) => a.chapterType.localeCompare(b.chapterType))
  for (const ch of result) {
    ch.missions.sort((a, b) => compareTuple(missionSortKey(a.missionId), missionSortKey(b.missionId)))
  }
  return result
}

// ===== Mission Runtime (MissionRuntimeAsset) =====

export type RuntimeTextField = { key?: string } | string | null | undefined

export function resolveRuntimeText(field: RuntimeTextField, resolveKey?: (key: string) => string): string {
  if (typeof field === 'string') return field
  if (field && typeof field.key === 'string' && field.key) {
    return resolveKey?.(field.key) || field.key
  }
  return ''
}

export function extractMissionIds(paths: string[]): string[] {
  const ids: string[] = []
  for (const p of paths) {
    const m = /^Data\/Json\/MissionRuntimeAsset\/(.+)\.json$/.exec(p)
    if (!m || m[1].endsWith('_meta')) continue
    ids.push(m[1])
  }
  return ids
}

export function adaptMissionQuest(
  questId: string,
  quest: any,
  mainPathSet: Set<string>,
  resolveKey?: (key: string) => string,
): MissionQuest {
  const objectives: MissionQuestObjective[] = (quest?.objectiveList ?? []).map((o: any) => {
    const objective: MissionQuestObjective = {
      description: resolveRuntimeText(o?.description, resolveKey),
    }
    const condition = renderMissionCondition(o?.condition, { resolveText: resolveKey })
    if (condition) objective.condition = condition
    return objective
  })
  const description = quest?.overrideMissionDesc
    ? resolveRuntimeText(quest?.descriptionOverride, resolveKey)
    : ''
  return {
    questId,
    questType: quest?.questType ?? 0,
    inMainPath: mainPathSet.has(questId),
    flowIndex: quest?.flowIndex ?? 0,
    prevQuestIds: quest?.prevQuestIdList ?? [],
    description,
    objectives,
  }
}

export function adaptMissionRuntime(
  raw: any,
  resolveKey?: (key: string) => string,
): MissionRuntime {
  const mainPathQuests: string[] = raw?.mainPathQuests ?? []
  const mainPathSet = new Set(mainPathQuests)
  const quests: MissionQuest[] = Object.entries(raw?.questDic ?? {})
    .map(([questId, quest]) => adaptMissionQuest(questId, quest, mainPathSet, resolveKey))
    .sort((a, b) => {
      if (a.inMainPath !== b.inMainPath) return a.inMainPath ? -1 : 1
      const ia = mainPathQuests.indexOf(a.questId)
      const ib = mainPathQuests.indexOf(b.questId)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.questId.localeCompare(b.questId)
    })
  return {
    missionId: raw?.missionId ?? '',
    name: resolveRuntimeText(raw?.missionName, resolveKey),
    description: resolveRuntimeText(raw?.missionDescription, resolveKey),
    missionType: raw?.missionType ?? 0,
    charId: raw?.charId ?? '',
    levelId: raw?.levelId ?? '',
    chapterBitmask: raw?.missionChapterBitmask ?? 0,
    isWrapperMission: !!raw?.isWrapperMission,
    mainPathQuests,
    quests,
  }
}

export function buildMissionQuestTree(
  mainPathQuests: string[],
  quests: MissionQuest[],
): MissionQuestTreeNode[] {
  const questMap = new Map<string, MissionQuest>()
  for (const q of quests) questMap.set(q.questId, q)

  const mainIndex = new Map<string, number>()
  mainPathQuests.forEach((id, i) => { mainIndex.set(id, i) })
  const isSpine = (id: string) => mainIndex.has(id)

  const parentOf = new Map<string, string | null>()
  const childrenMap = new Map<string, string[]>()

  for (const q of quests) {
    if (isSpine(q.questId)) {
      parentOf.set(q.questId, null)
      continue
    }
    const validPrevs = q.prevQuestIds.filter(p => questMap.has(p) && p !== q.questId)
    let parent: string | null = null
    if (validPrevs.length > 0) {
      const sorted = [...validPrevs].sort((a, b) => {
        const ia = mainIndex.get(a) ?? Number.MAX_SAFE_INTEGER
        const ib = mainIndex.get(b) ?? Number.MAX_SAFE_INTEGER
        if (ia !== ib) return ia - ib
        return a.localeCompare(b)
      })
      parent = sorted[0]
    }
    parentOf.set(q.questId, parent)
    if (parent) {
      if (!childrenMap.has(parent)) childrenMap.set(parent, [])
      childrenMap.get(parent)!.push(q.questId)
    }
  }

  const sortIds = (a: string, b: string) => {
    const ia = mainIndex.get(a) ?? Number.MAX_SAFE_INTEGER
    const ib = mainIndex.get(b) ?? Number.MAX_SAFE_INTEGER
    if (ia !== ib) return ia - ib
    return a.localeCompare(b)
  }

  const resolving = new Set<string>()
  const build = (id: string): MissionQuestTreeNode | null => {
    if (resolving.has(id)) return null
    const q = questMap.get(id)
    if (!q) return null
    resolving.add(id)
    const children = (childrenMap.get(id) ?? [])
      .slice()
      .sort(sortIds)
      .map(build)
      .filter((n): n is MissionQuestTreeNode => n !== null)
    resolving.delete(id)
    return { ...q, children }
  }

  const spineRoots = mainPathQuests.filter(id => questMap.has(id))
  const orphanRoots = [...parentOf.entries()]
    .filter(([id, parent]) => !parent && !isSpine(id))
    .map(([id]) => id)
    .sort(sortIds)
  const roots = [...spineRoots, ...orphanRoots]
  if (roots.length === 0 && quests.length > 0) roots.push(quests[0].questId)
  return roots.map(build).filter((n): n is MissionQuestTreeNode => n !== null)
}

export function adaptPrtsCategory(raw: any, i18nMap?: Record<string, string>): PrtsCategory {
  return {
    id: raw.$key ?? '',
    name: resolveI18n(raw.name, i18nMap),
    order: raw.order ?? 0,
    itemCount: 0,
  }
}

export function adaptPrtsVolume(raw: any, i18nMap?: Record<string, string>): PrtsVolume {
  return {
    id: raw.$key ?? '',
    categoryId: raw.categoryId ?? '',
    name: resolveI18n(raw.name, i18nMap),
    subName: resolveI18n(raw.subName, i18nMap),
    iconUrl: raw.icon ? getSpriteUrl(`prts/icon/${raw.icon}`) : '',
    order: raw.order ?? 0,
    itemIds: raw.itemIds ?? [],
  }
}

export function adaptPrtsItem(raw: any, i18nMap?: Record<string, string>): PrtsItem {
  return {
    id: raw.$key ?? '',
    volumeId: raw.firstLvId ?? '',
    type: raw.type ?? 'text',
    name: resolveI18n(raw.name, i18nMap),
    desc: resolveI18n(raw.desc, i18nMap),
    order: raw.order ?? 0,
    contentId: raw.contentId ?? '',
  }
}

const CHAT_TYPE_MAP: Record<number, BakerChat['kind']> = {
  1: 'contact',
  2: 'group',
  3: 'operator',
}

export function adaptBakerChat(raw: any, i18nMap?: Record<string, string>): BakerChat {
  return {
    id: raw.$key ?? '',
    kind: CHAT_TYPE_MAP[raw.chatType] ?? 'contact',
    name: resolveI18n(raw.name, i18nMap),
    iconUrl: raw.icon ? getSpriteUrl(`charroundicon/${raw.icon}`) : '',
    isSettlementChannel: raw.isSettlementChannel ?? false,
  }
}

export interface BakerSpeakerContext {
  chatMap: Record<string, BakerChat>
  selfName: string
  selfIconUrl: string
}

export function resolveContentType(type: number): BakerMessage['kind'] | null {
  const map: Record<number, BakerMessage['kind']> = {
    1: 'text',
    2: 'image',
    7: 'system',
    10: 'share',
    12: 'mission',
  }
  return map[type] ?? null
}

export function adaptBakerMessage(
  dialogId: string,
  contentId: string,
  raw: any,
  ctx: BakerSpeakerContext,
  i18nMap?: Record<string, string>,
): BakerMessage | null {
  const kind = resolveContentType(raw.contentType)
  if (!kind) return null
  const isSelf = raw.speaker === 'endmin'
  const speakerChat = isSelf ? undefined : ctx.chatMap[raw.speaker]
  return {
    id: `${dialogId}:${contentId}`,
    speakerId: raw.speaker ?? '',
    isSelf,
    speakerName: isSelf ? ctx.selfName : speakerChat?.name ?? '',
    speakerIconUrl: isSelf ? ctx.selfIconUrl : speakerChat?.iconUrl ?? '',
    kind,
    text: resolveI18n(raw.content, i18nMap),
    imageUrl: kind === 'image' && raw.contentParam?.[0]
      ? getSpriteUrl(`sns/picture/${raw.contentParam[0]}`)
      : undefined,
    reactions: undefined,
  }
}

