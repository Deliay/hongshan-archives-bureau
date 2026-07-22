import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import RecipePanel from './RecipePanel'
import type { RecipeEntry } from '../../lib/types'

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../Items/ItemTile', () => ({
  default: ({ itemId, amount, showName }: any) => (
    <div data-testid="item-panel">
      <span data-testid="item-id">{itemId}</span>
      {amount !== undefined && <span data-testid="item-amount">{amount}</span>}
      {showName && <span data-testid="item-show-name">showName</span>}
    </div>
  ),
}))

afterEach(cleanup)

const makeRecipe = (overrides: Partial<RecipeEntry> = {}): RecipeEntry => ({
  formulaId: 'f1',
  chainId: 'c1',
  level: 'T4',
  isDefault: false,
  materials: [],
  goldId: '',
  goldCount: 0,
  unlockType: 0,
  unlockKey: '',
  ...overrides,
})

describe('RecipePanel', () => {
  it('returns null when recipes is empty', () => {
    const { container } = render(<RecipePanel recipes={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders recipe level', () => {
    const recipes = [makeRecipe({ level: 'T4' })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.getByText('T4')).toBeTruthy()
  })

  it('shows default badge when isDefault is true', () => {
    const recipes = [makeRecipe({ isDefault: true })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.getByText('equipment.recipeDefault')).toBeTruthy()
  })

  it('hides default badge when isDefault is false', () => {
    const recipes = [makeRecipe({ isDefault: false })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.queryByText('equipment.recipeDefault')).toBeNull()
  })

  it('renders material ItemPanels', () => {
    const recipes = [makeRecipe({
      materials: [
        { itemId: 'mat_001', count: 10 },
        { itemId: 'mat_002', count: 5 },
      ],
    })]
    render(<RecipePanel recipes={recipes} />)
    const panels = screen.getAllByTestId('item-panel')
    expect(panels).toHaveLength(2)
    expect(screen.getAllByTestId('item-id')[0].textContent).toBe('mat_001')
    expect(screen.getAllByTestId('item-amount')[0].textContent).toBe('10')
  })

  it('renders gold cost when present', () => {
    const recipes = [makeRecipe({ goldId: 'gold_01', goldCount: 100 })]
    render(<RecipePanel recipes={recipes} />)
    const panels = screen.getAllByTestId('item-panel')
    expect(panels).toHaveLength(1)
    expect(screen.getByTestId('item-id').textContent).toBe('gold_01')
    expect(screen.getByTestId('item-amount').textContent).toBe('100')
  })

  it('hides gold cost when goldId is empty', () => {
    const recipes = [makeRecipe({ goldId: '', goldCount: 0 })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.queryByTestId('item-panel')).toBeNull()
  })

  it('shows unlock message when unlockType is non-zero', () => {
    const recipes = [makeRecipe({ unlockType: 2 })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.getByText('equipment.recipeUnlock')).toBeTruthy()
  })

  it('hides unlock message when unlockType is 0', () => {
    const recipes = [makeRecipe({ unlockType: 0 })]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.queryByText('equipment.recipeUnlock')).toBeNull()
  })

  it('renders multiple recipes with unique keys', () => {
    const recipes = [
      makeRecipe({ chainId: 'c1', level: 'T4' }),
      makeRecipe({ chainId: 'c2', level: 'T3' }),
      makeRecipe({ chainId: 4000, level: 'T2' }),
    ]
    render(<RecipePanel recipes={recipes} />)
    expect(screen.getByText('T4')).toBeTruthy()
    expect(screen.getByText('T3')).toBeTruthy()
    expect(screen.getByText('T2')).toBeTruthy()
  })

  it('applies custom className', () => {
    const recipes = [makeRecipe()]
    const { container } = render(<RecipePanel recipes={recipes} className="custom-class" />)
    expect(container.firstChild).toBeTruthy()
    expect((container.firstChild as HTMLElement).className).toContain('custom-class')
  })

  it('uses chainId as React key', () => {
    const recipes = [
      makeRecipe({ chainId: 'c1' }),
      makeRecipe({ chainId: 4000 }),
    ]
    render(<RecipePanel recipes={recipes} />)
    const sections = screen.getAllByText(/T\d/)
    expect(sections).toHaveLength(2)
  })
})
