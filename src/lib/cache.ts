import type { CacheEntry } from './types'

const DB_NAME = 'HongshanArchives'
const STORE_NAME = 'cache'
const DB_VERSION = 1
const MEMORY_MAX = 100
const DEFAULT_TTL = 30 * 60 * 1000

let currentVersion: string | null = null

export function getVersion(): string | null {
  return currentVersion
}

function cacheKey(table: string, key: string): string {
  return `${currentVersion}:${table}${key != null ? ':' + key : ''}`
}

// ---------- Memory Cache ----------

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    if (this.store.size >= MEMORY_MAX) {
      const first = this.store.keys().next().value
      if (first) this.store.delete(first)
    }
    this.store.set(key, { data, timestamp: Date.now(), ttl })
  }

  clear(): void {
    this.store.clear()
  }
}

const memoryCache = new MemoryCache()

// ---------- IndexedDB Cache ----------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ---------- IndexedDB Operations ----------

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => { resolve(req.result ?? null); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

async function idbClear(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

// ---------- Public API ----------

export async function initCache(): Promise<string> {
  const version = await (await fetch('https://endfield-assets.fffdan.com/version')).text()
  const old = await idbGet<string>('_version')
  if (old != null && old !== version) {
    await idbClear()
    memoryCache.clear()
  }
  await idbSet('_version', version)
  currentVersion = version
  return version
}

export async function getCachedData<T>(
  table: string,
  fetcher: () => Promise<T>,
  key?: string
): Promise<T> {
  const idbKey = cacheKey(table, key ?? 'all')

  const mem = memoryCache.get<T>(idbKey)
  if (mem) return mem

  const persisted = await idbGet<CacheEntry<T>>(idbKey)
  if (persisted && Date.now() - persisted.timestamp <= persisted.ttl) {
    memoryCache.set(idbKey, persisted.data, persisted.ttl)
    return persisted.data
  }

  const data = await fetcher()
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: DEFAULT_TTL }
  memoryCache.set(idbKey, data)
  await idbSet(idbKey, entry)
  return data
}
