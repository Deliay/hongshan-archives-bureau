import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EnhanceMaterialSection } from './EquipmentDetail'

vi.mock('../../components/Items/ItemTile', () => ({
  default: ({ itemId, name, badge }: { itemId: string; name?: string; badge?: React.ReactNode }) => (
    <div data-testid="item-tile" data-item-id={itemId}>
      {name || itemId}
      {badge && <div data-testid="tile-badge">{badge}</div>}
    </div>
  ),
}))

vi.mock('../../lib/formatText', () => ({
  formatAttributeShow: (_config: any, value: number) => String(value),
}))

vi.mock('../../lib/attributeShow', () => ({
  getAttributeShowMap: vi.fn().mockResolvedValue({}),
  resolveAttrShow: vi.fn().mockReturnValue({ name: 'TestAttr', valueFormat: '{value}', showPercent: false }),
}))

vi.mock('../../lib/locale', () => ({
  useLocale: () => ({ locale: 'CN' }),
}))

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test' }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock('../../components/skills/SkillReferenceCard', () => ({
  default: () => <div>skill-ref</div>,
}))

vi.mock('../../components/Craft/RecipePanel', () => ({
  default: () => <div>recipe</div>,
}))

vi.mock('../../components/Equipment/EquipCard', () => ({
  default: ({ equip }: any) => <div data-testid="equip-card">{equip.name}</div>,
}))

vi.mock('../../components/Equipment/SuitLogo', () => ({
  default: () => <div>logo</div>,
}))

vi.mock('../../components/Equipment/PartBadge', () => ({
  EQUIPMENT_PART_KEYS: { 0: 'equipment.partBody', 1: 'equipment.partHand', 2: 'equipment.partEdc' },
  default: () => <div>part</div>,
}))

vi.mock('../../components/RarityStars', () => ({
  default: () => <div>stars</div>,
}))

vi.mock('../../components/Items/ItemTile', () => ({
  default: ({ itemId, name, badge }: { itemId: string; name?: string; badge?: React.ReactNode }) => (
    <div data-testid="item-tile" data-item-id={itemId}>
      {name || itemId}
      {badge && <div data-testid="tile-badge">{badge}</div>}
    </div>
  ),
}))

vi.mock('../../lib/icons', () => ({
  getItemIconUrl: (id: string) => `https://example.com/${id}.png`,
}))

vi.mock('../../data/constants', () => ({
  rarityColor: () => '#fff',
}))

vi.mock('../../lib/richText', () => ({
  RichText: ({ text }: { text: string }) => <span>{text}</span>,
}))

const mockT = (k: string) => k

beforeEach(() => {
  cleanup()
})

const makeEquip = (id: string, name: string) => ({
  id,
  name,
  description: '',
  decoDesc: '',
  iconId: `${id}_icon`,
  rarity: 5,
  partType: 0,
  suitId: '',
  minWearLv: 0,
  baseAttr: null,
  attrs: [],
  obtainWayIds: [],
})

describe('EnhanceMaterialSection', () => {
  it('renders no-material message when all groups empty', () => {
    const { container } = render(
      <EnhanceMaterialSection groups={[]} t={mockT} />
    )
    expect(container.textContent).toContain('equipment.noEnhanceMaterial')
  })

  it('renders ItemTile for each material (not EquipCard)', () => {
    const groups = [{
      attrKey: 'atk',
      modifierType: 0,
      attrName: 'Attack',
      valueFormat: '{value}',
      showPercent: false,
      materials: [
        { equip: makeEquip('eq1', 'Equip One'), attrValue: 43 },
        { equip: makeEquip('eq2', 'Equip Two'), attrValue: 28 },
      ],
    }]
    render(<EnhanceMaterialSection groups={groups} t={mockT} />)
    const tiles = screen.getAllByTestId('item-tile')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].getAttribute('data-item-id')).toBe('eq1')
    expect(tiles[1].getAttribute('data-item-id')).toBe('eq2')
  })

  it('does not render EquipCard', () => {
    const groups = [{
      attrKey: 'atk',
      modifierType: 0,
      attrName: 'Attack',
      valueFormat: '{value}',
      showPercent: false,
      materials: [
        { equip: makeEquip('eq1', 'Equip One'), attrValue: 43 },
      ],
    }]
    render(<EnhanceMaterialSection groups={groups} t={mockT} />)
    expect(screen.queryByTestId('equip-card')).toBeNull()
  })

  it('renders attribute badge with attrName+value format', () => {
    const groups = [{
      attrKey: 'int',
      modifierType: 0,
      attrName: '智识',
      valueFormat: '{value}',
      showPercent: false,
      materials: [
        { equip: makeEquip('eq1', 'Equip One'), attrValue: 43 },
      ],
    }]
    render(<EnhanceMaterialSection groups={groups} t={mockT} />)
    const badge = screen.getByTestId('tile-badge')
    expect(badge.textContent).toContain('智识+43')
  })

  it('renders attrName label above the grid', () => {
    const groups = [{
      attrKey: 'def',
      modifierType: 0,
      attrName: 'Defense',
      valueFormat: '{value}',
      showPercent: false,
      materials: [
        { equip: makeEquip('eq1', 'Equip One'), attrValue: 100 },
      ],
    }]
    render(<EnhanceMaterialSection groups={groups} t={mockT} />)
    expect(screen.getByText('Defense')).toBeTruthy()
  })
})
