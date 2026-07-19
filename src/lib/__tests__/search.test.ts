import { describe, it, expect } from 'vitest'
import { escapeRegex, extractEntityKey } from '../search'

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

  it('returns null for empty path', () => {
    expect(extractEntityKey('TestTable', '')).toBeNull()
  })
})
