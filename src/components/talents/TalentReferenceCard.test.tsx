import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TalentReferenceCard from './TalentReferenceCard'

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../lib/locale', () => ({
  useLocale: () => ({ locale: 'CN', setLocale: vi.fn() }),
}))

const mockNodeIndex: Record<string, any> = {
  talent_eff_001: {
    charId: 'chr_0001',
    nodeId: 'talent_node_1',
    nameRef: { id: 101 },
    iconId: 'icon_talent_01',
    level: 3,
    breakStage: 2,
  },
}

vi.mock('../../lib/search', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/search')>()
  return {
    ...original,
    buildTalentNodeIndex: vi.fn(() => Promise.resolve(mockNodeIndex)),
  }
})

const mockPotentialTalentEffectTable: Record<string, any> = {
  talent_eff_001: {
    desc: { id: 201 },
    dataList: [
      {
        attachSkill: { blackboard: [{ key: 'atk_up', value: 0.12 }] },
        attachBuff: { blackboard: [] },
      },
    ],
  },
}

vi.mock('../../lib/cache', () => ({
  getCachedData: vi.fn((key: string) => {
    if (key.startsWith('I18nDict_')) {
      return Promise.resolve({ '101': 'Test Talent', '201': '+{atk_up:0%} 攻击力' })
    }
    if (key === 'PotentialTalentEffectTable') {
      return Promise.resolve(mockPotentialTalentEffectTable)
    }
    return Promise.resolve({})
  }),
}))

vi.mock('../../lib/api', () => ({
  fetchTableAll: vi.fn(() => Promise.resolve({})),
  fetchTableDictAll: vi.fn(() => Promise.resolve({})),
  fetchI18nText: vi.fn(() => Promise.resolve('')),
}))

afterEach(cleanup)

describe('TalentReferenceCard', () => {
  it('renders talent name, level and icon', async () => {
    render(<MemoryRouter><TalentReferenceCard talentEffectId="talent_eff_001" /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Test Talent')).toBeTruthy()
      expect(screen.getByText('Lv.3')).toBeTruthy()
    })
  })

  it('renders formatted description', async () => {
    render(<MemoryRouter><TalentReferenceCard talentEffectId="talent_eff_001" /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/攻击力/)).toBeTruthy()
    })
  })

  it('returns null for unknown talentEffectId', async () => {
    const { container } = render(<MemoryRouter><TalentReferenceCard talentEffectId="unknown_id" /></MemoryRouter>)
    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
  })
})
