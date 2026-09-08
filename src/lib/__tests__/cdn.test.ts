import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveCdnBase, invalidateCdn, getCdnBase, onCdnChange, CDN_LIST, resetCdnForTest } from '../cdn'

describe('cdn', () => {
  const fetchMock = vi.fn()
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { store = {} }),
      get length() { return Object.keys(store).length },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    }
  })()

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('performance', { now: vi.fn(() => Date.now()) })
    fetchMock.mockReset()
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    resetCdnForTest()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolveCdnBase', () => {
    it('should select fastest node when no memory', async () => {
      const delays = [100, 50, 200]
      fetchMock.mockImplementation(async (url: string) => {
        const nodeIndex = CDN_LIST.findIndex((n) => url.startsWith(n))
        const delay = delays[nodeIndex] ?? 100
        await new Promise((r) => setTimeout(r, delay))
        return { ok: true, text: async () => '1.0.0' }
      })

      const base = await resolveCdnBase()
      expect(base).toBe(CDN_LIST[1])
      expect(getCdnBase()).toBe(CDN_LIST[1])
    })

    it('should use remembered node if valid', async () => {
      const remembered = CDN_LIST[2]
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        base: remembered,
        expiresAt: Date.now() + 3600000,
      }))

      const base = await resolveCdnBase()
      expect(base).toBe(remembered)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should re-probe if memory expired', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        base: CDN_LIST[2],
        expiresAt: Date.now() - 1000,
      }))

      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      await resolveCdnBase()
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should re-probe if memory has invalid base', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        base: 'https://invalid.example.com',
        expiresAt: Date.now() + 3600000,
      }))

      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      await resolveCdnBase()
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should fallback to default if all nodes fail', async () => {
      fetchMock.mockRejectedValue(new Error('network error'))

      const base = await resolveCdnBase()
      expect(base).toBe(CDN_LIST[0])
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('quota exceeded')
      })

      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      const base = await resolveCdnBase()
      expect(base).toBe(CDN_LIST[0])
    })

    it('should only probe once for concurrent calls', async () => {
      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      const [, , p3] = await Promise.all([
        resolveCdnBase(),
        resolveCdnBase(),
        resolveCdnBase(),
      ])

      expect(p3).toBe(CDN_LIST[0])
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('invalidateCdn', () => {
    it('should clear memory and re-probe', async () => {
      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      await resolveCdnBase()
      fetchMock.mockClear()

      invalidateCdn(CDN_LIST[0])
      expect(localStorageMock.removeItem).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should exclude specified node', async () => {
      const delays = [100, 50, 200]
      fetchMock.mockImplementation(async (url: string) => {
        const nodeIndex = CDN_LIST.findIndex((n) => url.startsWith(n))
        const delay = delays[nodeIndex] ?? 100
        await new Promise((r) => setTimeout(r, delay))
        return { ok: true, text: async () => '1.0.0' }
      })

      invalidateCdn(CDN_LIST[1])
      const base = await resolveCdnBase()
      expect(base).not.toBe(CDN_LIST[1])
    })
  })

  describe('onCdnChange', () => {
    it('should notify listeners on change', async () => {
      const listener = vi.fn()
      onCdnChange(listener)

      fetchMock.mockImplementation(async () => ({
        ok: true,
        text: async () => '1.0.0',
      }))

      await resolveCdnBase()
      expect(listener).toHaveBeenCalledWith(CDN_LIST[0])
    })
  })
})
