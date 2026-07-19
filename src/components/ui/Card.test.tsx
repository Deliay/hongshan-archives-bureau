import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card data-testid="card-render">档案内容</Card>)
    expect(screen.getByTestId('card-render').textContent).toBe('档案内容')
  })

  it('applies hover class by default', () => {
    render(<Card data-testid="card-hover">内容</Card>)
    const el = screen.getByTestId('card-hover')
    expect(el.className).toContain('hover:border-archive-gold/40')
  })

  it('can disable hover', () => {
    render(<Card hover={false} data-testid="card-no-hover">内容</Card>)
    const el = screen.getByTestId('card-no-hover')
    expect(el.className).not.toContain('hover:border-archive-gold/40')
  })

  it('merges custom className', () => {
    render(<Card className="custom-class" data-testid="card-class">内容</Card>)
    expect(screen.getByTestId('card-class').className).toContain('custom-class')
  })
})
