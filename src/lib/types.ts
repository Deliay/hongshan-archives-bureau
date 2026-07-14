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

export interface OperatorDetailData {
  op: Operator
  attributes: CharacterAttributeSet[]
  breakCostMap: Record<string, BreakCostNode>
  talentNodeMap: Record<string, TalentNode>
  wpnRecommend: WeaponRecommendation | null
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
}

export interface VoiceLine {
  title: string
  text: string
}

export interface Weapon {
  id: string
  name: string
  type: string
  rarity: number
  description: string
  lore: string
  skills: string[]
  maxLevel: number
}

export interface Enemy {
  id: string
  name: string
  tags: string[]
  description: string
}

export interface Item {
  id: string
  name: string
  type: string
  rarity: number
  description: string
  decoDesc: string
}

export interface Race {
  id: string
  name: string
  memberIds: string[]
}

export interface Faction {
  id: string
  name: string
  memberIds: string[]
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

export interface Recipe {
  id: string
  inputs: { itemId: string; amount: number }[]
  outputs: { itemId: string; amount: number }[]
  time: number
  power: number
}
