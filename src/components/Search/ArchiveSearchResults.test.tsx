import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ArchiveSearchResults from './ArchiveSearchResults'

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'search.noResults': '未找到相关记载',
        'search.resultCount': `找到 ${vars?.count ?? 0} 条相关记载`,
        'search.prev': '上一页',
        'search.next': '下一页',
      }
      return map[key] ?? key
    },
  }),
}))

afterEach(cleanup)

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function makeResult(overrides: Partial<{
  table: string
  path: string
  id: string
  text: string
  entityKey: string | null
}> = {}) {
  return {
    table: 'CharacterTable',
    path: '$.chr_0001.name',
    id: '1001',
    text: 'a test text with keyword',
    entityKey: null,
    ...overrides,
  }
}

describe('ArchiveSearchResults', () => {
  const defaultProps = {
    query: 'test',
    results: [] as ReturnType<typeof makeResult>[],
    entities: {} as Record<string, Record<string, any>>,
    total: 0,
    page: 0,
    pageSize: 30,
    loading: false,
    error: null as string | null,
    onPageChange: vi.fn(),
  }

  it('shows loading skeleton', () => {
    renderWithRouter(<ArchiveSearchResults {...defaultProps} loading />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message', () => {
    renderWithRouter(<ArchiveSearchResults {...defaultProps} error="Network error" />)
    expect(screen.getByText('Network error')).toBeTruthy()
  })

  it('shows empty message when no results', () => {
    renderWithRouter(<ArchiveSearchResults {...defaultProps} emptyMessage="No data found" />)
    expect(screen.getByText('No data found')).toBeTruthy()
  })

  it('shows default empty message', () => {
    renderWithRouter(<ArchiveSearchResults {...defaultProps} />)
    expect(screen.getByText('未找到相关记载')).toBeTruthy()
  })

  it('renders results with source table and text', () => {
    const results = [
      makeResult({ table: 'CharacterTable', text: 'keyword in text' }),
      makeResult({ table: 'WeaponBasicTable', text: 'another keyword' }),
    ]
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={2}
      />,
    )
    expect(screen.getByText('CharacterTable')).toBeTruthy()
    expect(screen.getByText('WeaponBasicTable')).toBeTruthy()
  })

  it('shows result count', () => {
    const results = [makeResult()]
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={5}
      />,
    )
    expect(screen.getByText('找到 5 条相关记载')).toBeTruthy()
  })

  it('renders pagination when multiple pages', () => {
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={60}
        pageSize={30}
      />,
    )
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('calls onPageChange when clicking next', async () => {
    const onPageChange = vi.fn()
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    const user = userEvent.setup()
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={60}
        pageSize={30}
        onPageChange={onPageChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange when clicking previous', async () => {
    const onPageChange = vi.fn()
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    const user = userEvent.setup()
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={60}
        pageSize={30}
        page={1}
        onPageChange={onPageChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: '上一页' }))
    expect(onPageChange).toHaveBeenCalledWith(0)
  })

  it('disables prev on first page', () => {
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={60}
        pageSize={30}
        page={0}
      />,
    )
    const prevBtn = screen.getByRole('button', { name: '上一页' })
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables next on last page', () => {
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={31}
        pageSize={30}
        page={1}
      />,
    )
    const nextBtn = screen.getByRole('button', { name: '下一页' })
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls window.scrollTo when page changes', () => {
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy
    const results = Array.from({ length: 30 }).map((_, i) =>
      makeResult({ id: `${i}`, text: `text ${i}` }),
    )
    const { rerender } = renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={60}
        pageSize={30}
        page={0}
      />,
    )
    expect(scrollToSpy).not.toHaveBeenCalled()

    rerender(
      <MemoryRouter>
        <ArchiveSearchResults
          {...defaultProps}
          results={results}
          total={60}
          pageSize={30}
          page={1}
        />
      </MemoryRouter>,
    )
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('renders SkillReferenceCard for SkillPatchTable results', () => {
    const results = [
      makeResult({ table: 'SkillPatchTable', entityKey: 'skill_001' }),
    ]
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        total={1}
      />,
    )
    expect(screen.getByText('SkillPatchTable')).toBeTruthy()
  })

  it('renders entity card when entity exists', () => {
    const results = [
      makeResult({ entityKey: 'chr_0001' }),
    ]
    const entities = {
      CharacterTable: {
        chr_0001: {
          type: 'operator' as const,
          id: 'chr_0001',
          name: 'TestChar',
          route: '/archive/operators/chr_0001',
          rarity: 5,
        },
      },
    }
    renderWithRouter(
      <ArchiveSearchResults
        {...defaultProps}
        results={results}
        entities={entities}
        total={1}
      />,
    )
    expect(screen.getByText('TestChar')).toBeTruthy()
  })
})
