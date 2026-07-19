import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders default variant', () => {
    render(<Badge data-testid="badge-default">默认</Badge>)
    const el = screen.getByTestId('badge-default')
    expect(el.className).toContain('bg-archive-border')
    expect(el.className).toContain('text-archive-dust')
  })

  it('renders gold variant', () => {
    render(<Badge variant="gold" data-testid="badge-gold">沉金</Badge>)
    expect(screen.getByTestId('badge-gold').className).toContain('text-archive-gold')
  })

  it('renders seal variant', () => {
    render(<Badge variant="seal" data-testid="badge-seal">印章</Badge>)
    expect(screen.getByTestId('badge-seal').className).toContain('text-archive-seal')
  })

  it('renders bronze variant', () => {
    render(<Badge variant="bronze" data-testid="badge-bronze">青铜</Badge>)
    expect(screen.getByTestId('badge-bronze').className).toContain('text-archive-bronze')
  })

  it('merges custom className', () => {
    render(<Badge className="custom-badge" data-testid="badge-custom">自定义</Badge>)
    expect(screen.getByTestId('badge-custom').className).toContain('custom-badge')
  })
})
