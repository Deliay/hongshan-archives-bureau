import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('indexedDB', {
    open: () => {
      const req: any = {
        result: {
          transaction: () => ({
            objectStore: () => ({
              get: () => { const r: any = { result: null }; queueMicrotask(() => r.onsuccess?.()); return r },
              put: () => { const r: any = {}; queueMicrotask(() => r.onsuccess?.()); return r },
            }),
          }),
          close: () => {},
        },
      }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
  } as unknown as IDBFactory)
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('v1.0') } as Response)))
})

describe('cache module', () => {
  it('initCache is a function that returns a promise', async () => {
    const mod = await import('../cache')
    expect(typeof mod.initCache).toBe('function')
    const p = mod.initCache()
    expect(p).toBeInstanceOf(Promise)
  })
})
