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

export interface Equip {
  id: string
  name: string
  slot: string
  rarity: string
  suitId: string
  description: string
}

export interface Suit {
  id: string
  name: string
  twoPieceEffect: string
  fourPieceEffect: string
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

export interface SearchResult {
  table: string
  path: string
  id: string
  text: string
  entityKey: string | null
}

export interface SearchEntity {
  type: 'weapon' | 'operator' | 'item' | 'enemy'
  id: string
  name: string
  route: string
  icon?: string
  portrait?: string
  rarity?: number
  subInfo?: string
  tags?: string[]
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

export interface Recipe {
  id: string
  inputs: { itemId: string; amount: number }[]
  outputs: { itemId: string; amount: number }[]
  time: number
  power: number
}
