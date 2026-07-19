import { describe, it, expect, vi } from 'vitest'

const mockCharGrowthTable: Record<string, any> = {
  chr_0001: {
    charId: 'chr_0001',
    skillGroupMap: {
      group_1: { skillIdList: ['skill_op_001', 'skill_op_002'] },
    },
    talentNodeMap: {
      talent_1: {
        nodeType: 4,
        passiveSkillNodeInfo: { talentEffectId: 'talent_eff_001' },
      },
      talent_2: {
        nodeType: 3,
        passiveSkillNodeInfo: { talentEffectId: 'talent_eff_002' },
      },
    },
  },
  chr_0002: {
    charId: 'chr_0002',
    skillGroupMap: {
      group_1: { skillIdList: ['skill_op_003'] },
    },
    talentNodeMap: {},
  },
}

const mockWeaponBasicTable: Record<string, any> = {
  wpn_sword_001: {
    weaponId: 'wpn_sword_001',
    weaponSkillList: ['skill_wpn_001', 'skill_wpn_002'],
  },
}

vi.mock('../cache', () => ({
  getCachedData: vi.fn((key: string) => {
    if (key === 'CharGrowthTable') {
      return Promise.resolve(mockCharGrowthTable)
    }
    if (key === 'WeaponBasicTable') {
      return Promise.resolve(mockWeaponBasicTable)
    }
    return Promise.resolve({})
  }),
}))

import { escapeRegex, extractEntityKey, SEARCH_ENTITY_ALIAS_TABLES, buildSkillOwnerIndex, buildTalentEffectOwnerIndex } from '../search'

describe('SEARCH_ENTITY_ALIAS_TABLES', () => {
  it('maps CharGrowthTable to CharacterTable', () => {
    expect(SEARCH_ENTITY_ALIAS_TABLES.CharGrowthTable).toBe('CharacterTable')
  })

  it('maps CharacterTagDesTable to CharacterTable', () => {
    expect(SEARCH_ENTITY_ALIAS_TABLES.CharacterTagDesTable).toBe('CharacterTable')
  })
})

describe('buildSkillOwnerIndex', () => {
  it('maps skillId to operator owner from CharGrowthTable', async () => {
    const index = await buildSkillOwnerIndex('CN')
    expect(index['skill_op_001']).toEqual({ type: 'operator', id: 'chr_0001' })
    expect(index['skill_op_002']).toEqual({ type: 'operator', id: 'chr_0001' })
    expect(index['skill_op_003']).toEqual({ type: 'operator', id: 'chr_0002' })
  })

  it('maps skillId to weapon owner from WeaponBasicTable', async () => {
    const index = await buildSkillOwnerIndex('CN')
    expect(index['skill_wpn_001']).toEqual({ type: 'weapon', id: 'wpn_sword_001' })
    expect(index['skill_wpn_002']).toEqual({ type: 'weapon', id: 'wpn_sword_001' })
  })

})

describe('buildTalentEffectOwnerIndex', () => {
  it('maps talentEffectId to charId when nodeType is 4', async () => {
    const index = await buildTalentEffectOwnerIndex('CN')
    expect(index['talent_eff_001']).toBe('chr_0001')
  })

  it('ignores talent nodes with nodeType !== 4', async () => {
    const index = await buildTalentEffectOwnerIndex('CN')
    expect(index['talent_eff_002']).toBeUndefined()
  })

  it('returns empty for operator with no talent nodes', async () => {
    const index = await buildTalentEffectOwnerIndex('CN')
    expect(index['talent_eff_003']).toBeUndefined()
  })
})

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
  })

  it('returns unchanged plain text', () => {
    expect(escapeRegex('hello world')).toBe('hello world')
  })

  it('handles mixed text with special chars', () => {
    expect(escapeRegex('test(1)')).toBe('test\\(1\\)')
  })

  it('handles empty string', () => {
    expect(escapeRegex('')).toBe('')
  })

  it('handles numbers and spaces', () => {
    expect(escapeRegex('abc 123')).toBe('abc 123')
  })
})

describe('extractEntityKey', () => {
  it('extracts key from WeaponBasicTable path', () => {
    expect(extractEntityKey('WeaponBasicTable', '$.wpn_sword_0003.weaponDesc')).toBe('wpn_sword_0003')
  })

  it('extracts key from CharacterTable path', () => {
    expect(extractEntityKey('CharacterTable', '$.chr_0005_chen.name')).toBe('chr_0005_chen')
  })

  it('extracts key from ItemTable path', () => {
    expect(extractEntityKey('ItemTable', '$.item_wood_001.desc')).toBe('item_wood_001')
  })

  it('extracts key from EnemyTemplateDisplayInfoTable path', () => {
    expect(extractEntityKey('EnemyTemplateDisplayInfoTable', '$.ene_titan_001.name')).toBe('ene_titan_001')
  })

  it('returns second segment for two-segment path', () => {
    expect(extractEntityKey('TestTable', '$.name')).toBe('name')
  })

  it('extracts charId from CharGrowthTable path', () => {
    expect(extractEntityKey('CharGrowthTable', '$.chr_0005_chen.skillGroupMap')).toBe('chr_0005_chen')
  })

  it('extracts charId from CharacterTagDesTable path', () => {
    expect(extractEntityKey('CharacterTagDesTable', '$.chr_0005_chen.tagDesc')).toBe('chr_0005_chen')
  })

  it('returns null for empty path', () => {
    expect(extractEntityKey('TestTable', '')).toBeNull()
  })
})
