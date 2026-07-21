import { describe, it, expect } from 'vitest'
import { adaptEquip, adaptSuit, adaptEquipFormula } from '../adapter'

describe('adaptEquip', () => {
  const mockItemRaw: Record<string, any> = {
    'item_equip_001': {
      name: { id: 100, text: 'Test Armor' },
      desc: { id: 101, text: 'A test armor' },
      decoDesc: { id: 102, text: 'Lore text' },
      iconId: 'icon_equip_001',
      rarity: 5,
      obtainWayIds: ['way1'],
    },
  }
  const mockI18n: Record<string, string> = {
    '100': '测试护甲',
    '101': '一件测试护甲',
    '102': '背景故事',
  }

  it('should use itemId as id', () => {
    const raw = { itemId: 'item_equip_001', partType: 0 }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.id).toBe('item_equip_001')
  })

  it('should fallback to $key when itemId is missing', () => {
    const raw = { $key: 'fallback_key', partType: 0 }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.id).toBe('fallback_key')
  })

  it('should handle undefined raw gracefully', () => {
    const result = adaptEquip(undefined, mockItemRaw, mockI18n)
    expect(result.id).toBe('')
    expect(result.name).toBe('')
    expect(result.attrs).toEqual([])
    expect(result.baseAttr).toBeNull()
  })

  it('should resolve i18n name from ItemTable', () => {
    const raw = { itemId: 'item_equip_001', partType: 1 }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.name).toBe('测试护甲')
  })

  it('should parse base attribute', () => {
    const raw = {
      itemId: 'item_equip_001',
      partType: 0,
      displayBaseAttrModifier: { attrType: 39, attrValue: 100, modifierType: 5 },
    }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.baseAttr).toEqual({ attrType: 39, value: 100, enhancedValues: [], modifierType: 5, compositeAttr: '' })
  })

  it('should parse display attributes with enhancedValues', () => {
    const raw = {
      itemId: 'item_equip_001',
      partType: 0,
      displayAttrModifiers: [
        { attrType: 10, attrValue: 32, enhancedAttrValues: [35, 38, 41], modifierType: 5 },
      ],
    }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.attrs).toHaveLength(1)
    expect(result.attrs[0]).toEqual({ attrType: 10, value: 32, enhancedValues: [35, 38, 41], modifierType: 5, compositeAttr: '' })
  })

  it('should handle suitID field', () => {
    const raw = { itemId: 'item_equip_001', suitID: 'suit_001', partType: 2 }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.suitId).toBe('suit_001')
  })

  it('should default suitId to empty string when missing', () => {
    const raw = { itemId: 'item_equip_001', partType: 0 }
    const result = adaptEquip(raw, mockItemRaw, mockI18n)
    expect(result.suitId).toBe('')
  })
})

describe('adaptSuit', () => {
  it('should read suitID from list[0]', () => {
    const raw = {
      equipList: ['eq1', 'eq2'],
      list: [{ suitID: 'suit_abc', suitName: { text: 'Test Suit' }, suitLogoName: 'logo_abc', equipCnt: 3, skillID: 'skill_1', skillLv: 1 }],
    }
    const result = adaptSuit(raw)
    expect(result.id).toBe('suit_abc')
  })

  it('should fallback to $key when list[0].suitID is missing', () => {
    const raw = {
      $key: 'suit_key',
      equipList: ['eq1'],
      list: [{ equipCnt: 2, skillID: 'skill_2', skillLv: 1 }],
    }
    const result = adaptSuit(raw)
    expect(result.id).toBe('suit_key')
  })

  it('should read logoName from list[0].suitLogoName', () => {
    const raw = {
      equipList: [],
      list: [{ suitLogoName: 'my_logo', suitID: 's1' }],
    }
    const result = adaptSuit(raw)
    expect(result.logoName).toBe('my_logo')
  })

  it('should default logoName to empty when missing', () => {
    const raw = { equipList: [], list: [{}] }
    const result = adaptSuit(raw)
    expect(result.logoName).toBe('')
  })

  it('should parse effects from list', () => {
    const raw = {
      equipList: ['eq1'],
      list: [
        { equipCnt: 2, skillID: 'sk1', skillLv: 1 },
        { equipCnt: 4, skillID: 'sk2', skillLv: 2 },
      ],
    }
    const result = adaptSuit(raw)
    expect(result.effects).toHaveLength(2)
    expect(result.effects[0]).toEqual({ equipCnt: 2, skillId: 'sk1', skillLv: 1 })
    expect(result.effects[1]).toEqual({ equipCnt: 4, skillId: 'sk2', skillLv: 2 })
  })

  it('should resolve suit name from i18n', () => {
    const raw = {
      equipList: [],
      list: [{ suitID: 's1', suitName: { id: 500 } }],
    }
    const i18n = { '500': '套组名称' }
    const result = adaptSuit(raw, i18n)
    expect(result.name).toBe('套组名称')
  })
})

describe('adaptEquipFormula', () => {
  it('should map chains to RecipeEntry with chainId', () => {
    const formula = { formulaId: 'f1', level: 'T4', unlockType: 0, unlockKey: '' }
    const chains = [
      { chainId: 'c1', isDefault: true, costItemId: ['m1', 'm2'], costItemNum: [10, 5], costGoldId: 'gold', costGoldNum: 100 },
      { chainId: 'c2', isDefault: false, costItemId: ['m3'], costItemNum: [20], costGoldId: 'gold', costGoldNum: 200 },
    ]
    const result = adaptEquipFormula(formula, chains)
    expect(result).toHaveLength(2)
    expect(result[0].chainId).toBe('c1')
    expect(result[0].isDefault).toBe(true)
    expect(result[0].materials).toEqual([{ itemId: 'm1', count: 10 }, { itemId: 'm2', count: 5 }])
    expect(result[0].goldId).toBe('gold')
    expect(result[0].goldCount).toBe(100)
    expect(result[1].chainId).toBe('c2')
    expect(result[1].isDefault).toBe(false)
  })

  it('should handle boolean isDefault correctly', () => {
    const formula = { formulaId: 'f2', level: 'T3' }
    const chains = [
      { chainId: 'c3', isDefault: false },
      { chainId: 'c4', isDefault: true },
    ]
    const result = adaptEquipFormula(formula, chains)
    expect(result[0].isDefault).toBe(false)
    expect(result[1].isDefault).toBe(true)
  })

  it('should handle numeric isDefault (truthy/falsy)', () => {
    const formula = { formulaId: 'f3', level: 'T2' }
    const chains = [
      { chainId: 'c5', isDefault: 0 },
      { chainId: 'c6', isDefault: 1 },
    ]
    const result = adaptEquipFormula(formula, chains)
    expect(result[0].isDefault).toBe(false)
    expect(result[1].isDefault).toBe(true)
  })

  it('should handle empty materials and gold', () => {
    const formula = { formulaId: 'f4', level: 'T1' }
    const chains = [{ chainId: 'c7', isDefault: true }]
    const result = adaptEquipFormula(formula, chains)
    expect(result[0].materials).toEqual([])
    expect(result[0].goldId).toBe('')
    expect(result[0].goldCount).toBe(0)
  })

  it('should handle numeric chainId', () => {
    const formula = { formulaId: 'f6', level: 'T4' }
    const chains = [
      { chainId: 4000, isDefault: true, costItemId: ['m1'], costItemNum: [10] },
      { chainId: 4001, isDefault: false, costItemId: ['m2'], costItemNum: [5] },
    ]
    const result = adaptEquipFormula(formula, chains)
    expect(result[0].chainId).toBe(4000)
    expect(result[1].chainId).toBe(4001)
  })

  it('should pass through unlockType and unlockKey', () => {
    const formula = { formulaId: 'f5', level: 'T0', unlockType: 2, unlockKey: 'mission_123' }
    const chains = [{ chainId: 'c8' }]
    const result = adaptEquipFormula(formula, chains)
    expect(result[0].unlockType).toBe(2)
    expect(result[0].unlockKey).toBe('mission_123')
  })
})
