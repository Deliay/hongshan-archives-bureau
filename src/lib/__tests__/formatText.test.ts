import { describe, it, expect } from 'vitest'
import { formatBlackboard } from '../formatText'

describe('formatBlackboard', () => {
  it('replaces simple variable', () => {
    expect(formatBlackboard('{x}', { x: 42 })).toBe('42')
  })

  it('handles unary minus expression', () => {
    expect(formatBlackboard('{-x}', { x: -10 })).toBe('10')
  })

  it('handles unary minus with format specifier', () => {
    expect(formatBlackboard('{-x:0}点灼热抗性', { x: -10 })).toBe('10点灼热抗性')
  })

  it('handles unary minus with zero value', () => {
    expect(formatBlackboard('{-x}', { x: 0 })).toBe('0')
  })

  it('handles unary minus with missing variable', () => {
    expect(formatBlackboard('{-x}', {})).toBe('0')
  })
})
