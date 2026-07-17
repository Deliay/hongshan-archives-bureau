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

  it('handles compound expression with leading unary minus', () => {
    expect(formatBlackboard('{-x + 5}', { x: 10 })).toBe('-5')
  })

  it('handles unary minus after binary operator', () => {
    expect(formatBlackboard('{x + -y}', { x: 10, y: 5 })).toBe('5')
  })

  it('handles unary minus before parenthesized expr', () => {
    expect(formatBlackboard('{-(x + 5)}', { x: 10 })).toBe('-15')
  })

  it('handles constant negative number', () => {
    expect(formatBlackboard('{-5}', {})).toBe('-5')
  })
})
