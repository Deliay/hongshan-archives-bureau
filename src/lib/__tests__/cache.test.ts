import { describe, it, expect, vi, beforeEach } from 'vitest'

let store = new Map<string, unknown>()

function mockIndexedDB() {
  const openReq: any = {}
  const tx: any = {}
  let txOnComplete: (() => void) | null = null

  Object.defineProperty(tx, 'oncomplete', {
    get: () => txOnComplete,
    set: (fn: any) => { txOnComplete = fn; queueMicrotask(() => fn?.()) },
    configurable: true,
  })

  tx.objectStore = () => ({
    get: (k: string) => {
      const r: any = { result: store.get(k) ?? null }
      queueMicrotask(() => r.onsuccess?.())
      return r
    },
    put: (val: unknown, k: string) => {
      store.set(k, val)
      const r: any = {}
      queueMicrotask(() => r.onsuccess?.())
      return r
    },
    clear: () => {
      store.clear()
      const r: any = {}
      queueMicrotask(() => r.onsuccess?.())
      return r
    },
  })

  openReq.result = {
    transaction: () => tx,
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    close: () => {},
  }
  openReq.onsuccess = null

  vi.stubGlobal('indexedDB', {
    open: () => {
      queueMicrotask(() => openReq.onsuccess?.())
      return openReq
    },
  } as unknown as IDBFactory)
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  store = new Map()
})

describe('cache module', () => {
  it('initCache returns a promise', async () => {
    mockIndexedDB()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('v1.0') } as Response)))
    const mod = await import('../cache')
    expect(typeof mod.initCache).toBe('function')
    const p = mod.initCache()
    expect(p).toBeInstanceOf(Promise)
    await p
  })

  it('initCache is singleton - only calls fetch once from the same import', async () => {
    vi.resetModules()
    mockIndexedDB()
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('v2.0') } as Response))
    vi.stubGlobal('fetch', fetchMock)
    const mod = await import('../cache')
    const p1 = mod.initCache()
    const p2 = mod.initCache()
    const v1 = await p1
    const v2 = await p2
    expect(v1).toBe('v2.0')
    expect(v2).toBe('v2.0')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('getCachedData fetches data after initCache', async () => {
    mockIndexedDB()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('v3.0') } as Response)))
    const mod = await import('../cache')
    await mod.initCache()
    const fetcher = vi.fn(() => Promise.resolve('test-data'))
    const data = await mod.getCachedData('TestTable', fetcher, 'k1')
    expect(data).toBe('test-data')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('getCachedData returns cached data on second call', async () => {
    mockIndexedDB()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('v3.5') } as Response)))
    const mod = await import('../cache')
    await mod.initCache()
    const fetcher = vi.fn(() => Promise.resolve('cached'))
    await mod.getCachedData('TestTable', fetcher, 'k2')
    const data = await mod.getCachedData('TestTable', fetcher, 'k2')
    expect(data).toBe('cached')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
