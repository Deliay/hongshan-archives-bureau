import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ItemTile from './ItemTile'

vi.mock('../../lib/cache', () => ({
  getCachedData: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../lib/api', () => ({
  fetchTableAll: vi.fn().mockResolvedValue({}),
  fetchTableDictAll: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../lib/locale', () => ({
  useLocale: () => ({ locale: 'CN' }),
}))

vi.mock('./ItemIcon', () => ({
  default: ({ itemId, className }: { itemId: string; className?: string }) => (
    <div data-testid="item-icon" data-item-id={itemId} className={className}>icon</div>
  ),
}))

vi.mock('./ItemTooltip', () => ({
  default: () => <div>tooltip</div>,
}))

vi.mock('./AmountBadge', () => ({
  default: ({ amount }: { amount: number }) => <div data-testid="amount-badge">{amount}</div>,
}))

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
    <a data-testid="tile-link" href={to} className={className}>{children}</a>
  ),
}))

beforeEach(() => {
  cleanup()
})

describe('ItemTile', () => {
  it('renders button with aspect-square and size class', () => {
    render(<ItemTile itemId="test" showTips={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('aspect-square')
    expect(btn.className).toContain('w-16')
  })

  it('renders with sm size class w-12', () => {
    render(<ItemTile itemId="test" size="sm" showTips={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('w-12')
    expect(btn.className).toContain('aspect-square')
  })

  it('renders with lg size class w-20', () => {
    render(<ItemTile itemId="test" size="lg" showTips={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('w-20')
  })

  it('renders link variant with size class when href provided', () => {
    render(<ItemTile itemId="test" href="/test" />)
    const link = screen.getByTestId('tile-link')
    expect(link.className).toContain('aspect-square')
    expect(link.className).toContain('w-16')
  })

  it('renders plain variant without border/bg classes', () => {
    render(<ItemTile itemId="test" plain />)
    const div = screen.getByTestId('rarity-frame').parentElement!
    expect(div.className).toContain('aspect-square')
    expect(div.className).not.toContain('border-archive-border')
    expect(div.className).not.toContain('bg-archive-file')
  })

  it('renders non-plain variant with border/bg classes', () => {
    render(<ItemTile itemId="test" showTips={false} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-archive-border')
    expect(btn.className).toContain('bg-archive-file')
  })

  it('passes className to wrapper, not to RarityFrame', () => {
    render(<ItemTile itemId="test" plain className="shrink-0 custom-class" />)
    const wrapper = screen.getByTestId('rarity-frame').parentElement!
    expect(wrapper.className).toContain('shrink-0')
    expect(wrapper.className).toContain('custom-class')
    const frame = screen.getByTestId('rarity-frame')
    expect(frame.className).not.toContain('shrink-0')
  })

  it('passes size to RarityFrame for text scaling', () => {
    render(<ItemTile itemId="test" size="lg" showTips={false} />)
    const frame = screen.getByTestId('rarity-frame')
    expect(frame.getAttribute('data-size')).toBe('lg')
  })

  it('renders amount badge when amount provided', () => {
    render(<ItemTile itemId="test" amount={42} showTips={false} />)
    expect(screen.getByTestId('amount-badge').textContent).toBe('42')
  })

  it('renders badge when badge prop provided', () => {
    render(<ItemTile itemId="test" badge={<span>my-badge</span>} showTips={false} />)
    expect(screen.getByText('my-badge')).toBeTruthy()
  })

  it('does not render badge when badge is undefined', () => {
    const { container } = render(<ItemTile itemId="test" showTips={false} />)
    const absDivs = container.querySelectorAll('.absolute.top-0')
    expect(absDivs.length).toBe(0)
  })

  it('renders name via RarityFrame when showName is true', () => {
    render(<ItemTile itemId="test" name="TestItem" showTips={false} />)
    expect(screen.getByTestId('rarity-name').textContent).toBe('TestItem')
  })

  it('does not render name when showName is false', () => {
    render(<ItemTile itemId="test" name="TestItem" showName={false} showTips={false} />)
    expect(screen.queryByTestId('rarity-name')).toBeNull()
  })
})
