export const MODULE_CODES: Record<string, string> = {
  operators: 'HSA-OPR',
  weapons: 'HSA-WPN',
  professions: 'HSA-PRF',
  races: 'HSA-RCE',
  factions: 'HSA-FCT',
  enemies: 'HSA-ENE',
  items: 'HSA-ITM',
  geography: 'HSA-GEO',
  equipment: 'HSA-EQP',
  factory: 'HSA-FAC',
  search: 'HSA-SRC',
  story: 'HSA-STY',
  updates: 'HSA-UPD',
}

export function formatArchiveCode(module: string, index?: number): string {
  const code = MODULE_CODES[module] ?? module.toUpperCase()
  return index !== undefined ? `${code}-${String(index).padStart(3, '0')}` : code
}

export type SecurityLevel = 'public' | 'internal' | 'core'

export const SECURITY_LABELS: Record<SecurityLevel, string> = {
  public: '公开',
  internal: '内部',
  core: '核心',
}
