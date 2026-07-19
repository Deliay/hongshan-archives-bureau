import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders with archive border background', () => {
    render(<Skeleton data-testid="skeleton-render" />)
    const el = screen.getByTestId('skeleton-render')
    expect(el.className).toContain('bg-archive-border')
    expect(el.className).toContain('animate-pulse')
  })

  it('merges custom className', () => {
    render(<Skeleton className="h-8 w-32" data-testid="skeleton-class" />)
    const el = screen.getByTestId('skeleton-class')
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('w-32')
  })
})
