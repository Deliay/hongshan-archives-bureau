export interface BreakCostItem {
  id: string
  count: number
}

export interface BreakCostNode {
  breakStage: number
  nodeId: string
  nodeType: number
  name: string
  description: string
  equipTierLimit: number
  requiredItem: BreakCostItem[]
}

export interface TalentNode {
  nodeId: string
  nodeType: number
  name: string
  description: string
  iconId: string
  level: number
  breakStage: number
  requiredItem: BreakCostItem[]
  attrType?: number
}

export interface CharacterAttributeSet {
  breakStage: number
  attrs: { attrType: number; attrValue: number }[]
}

export interface WeaponRecommendation {
  weaponIds1: string[]
  weaponIds2: string[]
  weaponIds3: string[]
}

export interface SkillGroupCondition {
  conditionId: string
  name: string
  icon: string
  desc: string
  postDesc: string
  descInactive: string
  skillId?: string
}

export interface SkillGroup {
  skillGroupId: string
  skillGroupType: number
  name: { id?: number; text?: string }
  icon: string
  skillIdList: string[]
  desc: { id?: number; text?: string }
  condition1?: SkillGroupCondition
  condition2?: SkillGroupCondition
}

export interface SkillCondition {
  condId: string
  condType: number
  leftAttrType: number
  rightAttrType: number
  compareOp: number
  toastText: string
}

export interface SubDescEntry {
  conditionId: string
  desc: string
  name: { id?: number; text?: string }
}

export interface SkillPatchData {
  blackboard: { key: string; value: number; valueStr: string }[]
  coolDown: number
  costType: number
  costValue: number
  description: { id?: number; text?: string }
  iconId: string
  level: number
  skillId: string
  skillName: { id?: number; text?: string }
  subDescDataList: SubDescEntry[]
}

export interface SkillLevelUpCost {
  skillGroupId: string
  level: number
  goldCost: number
  itemBundle: { id: string; count: number }[]
}

export interface FactorySkill {
  nodeId: string
  skillId: string
  name: string
  desc: string
  icon: string
  roomType: number
  effectType: number
  level: number
  parameters: { key: string; value: number }[]
}

export interface PotentialLevel {
  level: number
  name: string
  description: string
  requiredItem: { id: string; count: number }[]
  portraitUrl: string
}

export interface OperatorDetailData {
  op: Operator
  attributes: CharacterAttributeSet[]
  breakCostMap: Record<string, BreakCostNode>
  talentNodeMap: Record<string, TalentNode>
  wpnRecommend: WeaponRecommendation | null
  skillGroups: SkillGroup[]
  skillLevelUp: SkillLevelUpCost[]
  skillPatchMap: Record<string, SkillPatchData[]>
  factorySkills: FactorySkill[]
  skillConditions: Record<string, SkillCondition>
  potentialLevels: PotentialLevel[]
}

export interface Operator {
  id: string
  name: string
  portrait: string
  profession: string
  professionIcon: string
  element: string
  elementColor: string
  elementIcon: string
  rarity: number
  mainAttr: { id: number; name: string; icon: string }
  subAttr: { id: number; name: string; icon: string }
  profileRecords: string[]
  voiceLines: VoiceLine[]
  tags: string[]
  race: string
  faction: string
}

export interface VoiceLine {
  title: string
  text: string
  voiceIndex: number
  unlockType: number
  unlockValue: number
  voId: string
}

export interface Weapon {
  id: string
  name: string
  type: string
  weaponType: number
  rarity: number
  description: string
  lore: string
  itemDesc: string
  skills: string[]
  maxLevel: number
  iconId: string
  breakthroughTemplateId: string
  levelTemplateId: string
  talentTemplateId: string
  weaponPotentialSkill: string
}

export interface Enemy {
  id: string
  name: string
  tags: string[]
  description: string
  displayType: number
  nickname: string
  wikiGroup: string
  templateId: string
  enemyId: string
  distributionIds: string[]
  abilityDescIds: string[]
  attrTemplateId: string
  sourceTable: 'TemplateDisplayInfo' | 'DisplayInfo'
}

export interface Item {
  id: string
  name: string
  type: number
  rarity: number
  description: string
  decoDesc: string
  iconId?: string
  iconCompositeId?: string
  obtainWayIds?: string[]
  noObtainWayHint?: { id?: number; text?: string }
  showingType: number
  valuableTabType: number
}

export interface RaceMember {
  id: string
  name: string
  portrait: string
  rarity: number
}

export interface Race {
  id: string
  name: string
  members: RaceMember[]
}

export interface FactionMember {
  id: string
  name: string
  portrait: string
  rarity: number
}

export interface Faction {
  id: string
  name: string
  engName: string
  icon: string
  members: FactionMember[]
}

export interface Area {
  id: string
  name: string
  description: string
  faction: string
}

export interface EquipAttr {
  attrType: number
  value: number
  enhancedValues: number[]
  modifierType: number
  compositeAttr: string
}

export interface EnhanceMaterialItem {
  equip: Equip
  attrValue: number
}

export interface EnhanceMaterialGroup {
  attrKey: string
  modifierType: number
  attrName: string
  valueFormat: string
  showPercent: boolean
  materials: EnhanceMaterialItem[]
}

export interface Equip {
  id: string
  name: string
  description: string
  decoDesc: string
  iconId: string
  rarity: number
  partType: number
  suitId: string
  minWearLv: number
  baseAttr: EquipAttr | null
  attrs: EquipAttr[]
  obtainWayIds: string[]
}

export interface SuitEffect {
  equipCnt: number
  skillId: string
  skillLv: number
}

export interface Suit {
  id: string
  name: string
  logoName: string
  equipIds: string[]
  effects: SuitEffect[]
}

export interface RecipeMaterial {
  itemId: string
  count: number
}

export interface RecipeEntry {
  formulaId: string
  chainId: string | number
  level: string
  isDefault: boolean
  materials: RecipeMaterial[]
  goldId: string
  goldCount: number
  unlockType: number
  unlockKey: string
}

export interface EnhanceCost {
  itemId: string
  count: number
}

export interface EquipDetail {
  equip: Equip
  suit: Suit | null
  suitEquips: Equip[]
  enhanceMaterialGroups: EnhanceMaterialGroup[]
  enhanceCost: EnhanceCost | null
  recipes: RecipeEntry[]
}

export interface Gem {
  id: string
  name: string
  slot: string
  tags: string[]
}

export interface StoryDocument {
  id: string
  title: string
  category: string
}

export interface Profession {
  id: number
  name: string
  description: string
}

export interface ElementEntry {
  id: string
  name: string
  color: string
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface Building {
  id: string
  name: string
  type: string
  power: number
  description: string
}

export interface TalentNodeRef {
  charId: string
  nodeId: string
  nameRef: { id?: number | string; text?: string }
  iconId: string
  level: number
  breakStage: number
}

export interface SearchResult {
  table: string
  path: string
  id: string
  text: string
  entityKey: string | null
  ownerEntity?: SearchEntity
  skillGroupName?: string
}

export interface SearchEntity {
  type: 'weapon' | 'operator' | 'item' | 'enemy'
  id: string
  name: string
  route: string
  icon?: string
  portrait?: string
  rarity?: number
  displayType?: number
  subInfo?: string
  tags?: string[]
}

export type ActivityGroup = 'checkin' | 'challenge' | 'trial' | 'welfare' | 'reflow' | 'guide' | 'other'

export type ActivityStatus = 'ongoing' | 'permanent' | 'upcoming' | 'expired'

export interface ActivityTimeRange {
  openTime: number
  closeTime: number | null
}

export interface Activity {
  id: string
  name: string
  desc: string
  type: number
  group: ActivityGroup
  status: ActivityStatus | 'unknown'
  timeRanges: ActivityTimeRange[]
  tags: string[]
  tabImg: string
  tabImgColor: string
  rewardId: string
  sortId: number
}

export interface UseArchiveSearchResult {
  results: SearchResult[]
  entities: Record<string, Record<string, SearchEntity>>
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  refetch: () => void
}

// ===== Story Chronicle =====

export interface StoryRecapScene {
  id: string
  dlgId: string
  chapterId: string
  missionId: string
  sceneNo: number
  sceneSub: number
  chapterType: string
  code: string
  text: string
}

export interface StoryRecapMission {
  missionId: string
  name: string
  scenes: StoryRecapScene[]
}

export interface StoryRecapChapter {
  chapterId: string
  chapterType: string
  missions: StoryRecapMission[]
}

// ===== Mission Runtime (MissionRuntimeAsset) =====

export interface MissionQuestObjective {
  description: string
  condition?: import('./missionCondition').MissionConditionRender
}

export interface MissionQuest {
  questId: string
  questType: number
  inMainPath: boolean
  flowIndex: number
  prevQuestIds: string[]
  description: string
  objectives: MissionQuestObjective[]
}

export interface MissionQuestTreeNode extends MissionQuest {
  children: MissionQuestTreeNode[]
}

export interface MissionRuntime {
  missionId: string
  name: string
  description: string
  missionType: number
  charId: string
  levelId: string
  chapterBitmask: number
  isWrapperMission: boolean
  mainPathQuests: string[]
  quests: MissionQuest[]
}

export interface PrtsCategory {
  id: string
  name: string
  order: number
  itemCount: number
}

export interface PrtsVolume {
  id: string
  categoryId: string
  name: string
  subName: string
  iconUrl: string
  order: number
  itemIds: string[]
}

export interface PrtsItem {
  id: string
  volumeId: string
  type: 'text' | 'document' | 'multi_media'
  name: string
  desc: string
  order: number
  contentId: string
}

export interface PrtsItemDetail extends PrtsItem {
  volumeName: string
  categoryId: string
  contents: { title: string; segments: string[] }[]
  script?: { speaker: string; line: string }[]
}

export interface BakerChat {
  id: string
  kind: 'operator' | 'contact' | 'group'
  name: string
  iconUrl: string
  isSettlementChannel: boolean
}

export interface BakerMessage {
  id: string
  speakerId: string
  isSelf: boolean
  speakerName: string
  speakerIconUrl: string
  kind: 'text' | 'image' | 'sticker' | 'system' | 'share' | 'mission'
  text: string
  imageUrl?: string
  reactions?: { emojiUrl: string; fromNames: string[]; count: number }[]
}

export interface BakerOption {
  id: string
  text: string
  emojiUrl?: string
}

export interface BakerBeat {
  messages: BakerMessage[]
  options?: BakerOption[]
  selectedOptionId?: string
  branchId?: number
}

export interface BakerTopic {
  topicId: string
  topicName: string
  sortId: number
  dialogs: { dialogId: string; preview: string }[]
}

