import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import OperatorPortraitCard from './OperatorPortraitCard'

vi.mock('../RarityFrame', () => ({
  default: ({ rarity, name, children, size, className }: any) => (
    <div data-testid="rarity-frame" data-rarity={rarity} data-size={size} className={className}>
      {children}
      {name && <span data-testid="rarity-name">{name}</span>}
    </div>
  ),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, className, to }: any) => (
    <a data-testid="card-link" href={to} className={className}>{children}</a>
  ),
}))

beforeEach(() => {
  cleanup()
})

describe('OperatorPortraitCard', () => {
  const defaultProps = {
    id: 'char_0027_tangtang',
    name: '棠棠',
    portrait: 'https://example.com/portrait.png',
    rarity: 5,
  }

  it('renders link to operator detail page', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const link = screen.getByTestId('card-link')
    expect(link.getAttribute('href')).toBe('/archive/operators/char_0027_tangtang')
  })

  it('renders with md size by default', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const link = screen.getByTestId('card-link')
    expect(link.className).toContain('w-[114px]')
    expect(link.className).toContain('h-[159px]')
  })

  it('renders with sm size', () => {
    render(<OperatorPortraitCard {...defaultProps} size="sm" />)
    const link = screen.getByTestId('card-link')
    expect(link.className).toContain('w-[76px]')
    expect(link.className).toContain('h-[106px]')
  })

  it('renders with lg size', () => {
    render(<OperatorPortraitCard {...defaultProps} size="lg" />)
    const link = screen.getByTestId('card-link')
    expect(link.className).toContain('w-[152px]')
    expect(link.className).toContain('h-[212px]')
  })

  it('renders portrait image', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const img = screen.getByAltText('棠棠')
    expect(img.getAttribute('src')).toBe('https://example.com/portrait.png')
    expect(img.className).toContain('object-cover')
  })

  it('renders fallback when portrait is empty', () => {
    render(<OperatorPortraitCard {...defaultProps} portrait="" />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('passes rarity and name to RarityFrame', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const frame = screen.getByTestId('rarity-frame')
    expect(frame.getAttribute('data-rarity')).toBe('5')
    expect(screen.getByTestId('rarity-name').textContent).toBe('棠棠')
  })

  it('passes correct size to RarityFrame', () => {
    render(<OperatorPortraitCard {...defaultProps} size="lg" />)
    const frame = screen.getByTestId('rarity-frame')
    expect(frame.getAttribute('data-size')).toBe('lg')
  })

  it('renders profession icon when provided', () => {
    render(<OperatorPortraitCard {...defaultProps} professionIcon="https://example.com/prof.png" />)
    const imgs = screen.getAllByAltText('')
    const profIcon = imgs.find(img => img.getAttribute('src') === 'https://example.com/prof.png')
    expect(profIcon).toBeTruthy()
    expect(profIcon!.className).toContain('absolute')
    expect(profIcon!.className).toContain('top-1')
    expect(profIcon!.className).toContain('left-1')
  })

  it('renders element icon when provided', () => {
    render(<OperatorPortraitCard {...defaultProps} elementIcon="https://example.com/elem.png" />)
    const imgs = screen.getAllByAltText('')
    const elemIcon = imgs.find(img => img.getAttribute('src') === 'https://example.com/elem.png')
    expect(elemIcon).toBeTruthy()
    expect(elemIcon!.className).toContain('absolute')
    expect(elemIcon!.className).toContain('top-1')
    expect(elemIcon!.className).toContain('right-1')
  })

  it('applies element color as drop-shadow filter', () => {
    render(<OperatorPortraitCard {...defaultProps} elementIcon="https://example.com/elem.png" elementColor="#ff0000" />)
    const imgs = screen.getAllByAltText('')
    const elemIcon = imgs.find(img => img.getAttribute('src') === 'https://example.com/elem.png')
    expect(elemIcon!.style.filter).toContain('drop-shadow')
  })

  it('does not render profession icon when not provided', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const imgs = screen.queryAllByAltText('')
    const profIcons = imgs.filter(img => img.className.includes('left-1'))
    expect(profIcons.length).toBe(0)
  })

  it('applies custom className', () => {
    render(<OperatorPortraitCard {...defaultProps} className="custom-class" />)
    const link = screen.getByTestId('card-link')
    expect(link.className).toContain('custom-class')
  })

  it('has hover border styling', () => {
    render(<OperatorPortraitCard {...defaultProps} />)
    const link = screen.getByTestId('card-link')
    expect(link.className).toContain('hover:border-archive-gold/40')
  })
})
