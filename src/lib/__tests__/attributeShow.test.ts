import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EquipAttr } from '../types'

vi.mock('../cache', () => ({
  getCachedData: vi.fn(async (_key: string, fetcher: () => Promise<any>) => fetcher()),
}))

vi.mock('../api', () => ({
  fetchTableAll: vi.fn(async (table: string) => {
    if (table === 'AttributeShowConfigTable') return MOCK_NORMAL_SHOW
    if (table === 'CompositeAttributeShowConfigTable') return MOCK_COMPOSITE_SHOW
    return {}
  }),
  fetchTableDictAll: vi.fn(async (_table: string, locale: string) => {
    if (locale === 'CN') return MOCK_DICT_CN
    return {}
  }),
  fetchI18nText: vi.fn(async (_locale: string, id: string) => MOCK_GLOBAL[id] ?? ''),
}))

const MOCK_NORMAL_SHOW: Record<string, any> = {
  '39': {
    list: [
      { name: { id: 1001, text: '力量' }, valueFormat: '{value}', showPercent: false, attributeModifier: 9 },
      { name: { id: 1002, text: 'STR' }, valueFormat: '{value}', showPercent: false, attributeModifier: 5 },
    ],
  },
  '41': {
    list: [
      { name: { id: 2001, text: '智识_raw' }, valueFormat: '{value}', showPercent: false, attributeModifier: 9 },
      { name: { id: 2002, text: '智识' }, valueFormat: '{value}', showPercent: false, attributeModifier: 5 },
    ],
  },
}

const MOCK_COMPOSITE_SHOW: Record<string, any> = {
  'AllSkillDamageIncrease': {
    list: [
      { name: { id: 3001, text: '' }, valueFormat: '', showPercent: false, attributeModifier: 9 },
      { name: { id: 3002, text: '' }, valueFormat: '{value:0}', showPercent: false, attributeModifier: 6 },
      { name: { id: 3003, text: '' }, valueFormat: '{value:0.0%}', showPercent: true, attributeModifier: 5 },
    ],
  },
}

const MOCK_DICT_CN: Record<string, string> = {
  '1001': '力量_a',
  '1002': '力量_b',
  '2001': '智识_a',
  '2002': '智识_b',
}

const MOCK_GLOBAL: Record<string, string> = {
  '3001': '所有技能伤害加成_9',
  '3002': '所有技能伤害加成_6',
  '3003': '所有技能伤害加成_5',
}

function makeAttr(overrides: Partial<EquipAttr> = {}): EquipAttr {
  return {
    attrType: 0,
    value: 0,
    enhancedValues: [],
    modifierType: 5,
    compositeAttr: '',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('pickListItem via resolveAttrShow', () => {
  it('should pick list item matching modifierType', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ attrType: 39, modifierType: 5 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('力量_b')
  })

  it('should fallback to list[0] when modifierType has no match', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ attrType: 39, modifierType: 999 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('力量_a')
  })

  it('should resolve composite attribute with correct valueFormat', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ compositeAttr: 'AllSkillDamageIncrease', modifierType: 5 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('所有技能伤害加成_5')
    expect(info.valueFormat).toBe('{value:0.0%}')
    expect(info.showPercent).toBe(true)
  })

  it('should pick different format for modifierType=6 on composite attr', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ compositeAttr: 'AllSkillDamageIncrease', modifierType: 6 })
    const info = resolveAttrShow(map, attr)
    expect(info.valueFormat).toBe('{value:0}')
    expect(info.showPercent).toBe(false)
  })
})

describe('resolveAttrShow fallback', () => {
  it('should return unknownFallback when attr key not in map', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ attrType: 99999 })
    const info = resolveAttrShow(map, attr, '未知属性')
    expect(info.name).toBe('未知属性')
  })

  it('should return empty name when no fallback provided', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ attrType: 99999 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('')
  })
})

describe('i18n resolution', () => {
  it('should resolve names from table dict', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ attrType: 41, modifierType: 5 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('智识_b')
  })

  it('should fallback to global i18n when table dict missing', async () => {
    const { getAttributeShowMap, resolveAttrShow } = await import('../attributeShow')
    const map = await getAttributeShowMap('CN')
    const attr = makeAttr({ compositeAttr: 'AllSkillDamageIncrease', modifierType: 5 })
    const info = resolveAttrShow(map, attr)
    expect(info.name).toBe('所有技能伤害加成_5')
  })
})
