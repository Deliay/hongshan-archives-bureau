export const CDN_LIST: readonly string[] = [
  'https://endfield-assets.fffdan.com',
  'https://cn.endfield.fffdan.com',
  'https://cn2.endfield.fffdan.com',
]

const DEFAULT_BASE = CDN_LIST[0]
const SELECTION_KEY = 'cdn:selected'
const SELECTION_TTL = 24 * 60 * 60 * 1000
const PROBE_TIMEOUT = 3000

interface CdnSelection {
  base: string
  expiresAt: number
}

let currentBase = DEFAULT_BASE
let resolvePromise: Promise<string> | null = null
const listeners = new Set<(base: string) => void>()

export function getCdnBase(): string {
  return currentBase
}

export function onCdnChange(listener: (base: string) => void): void {
  listeners.add(listener)
}

function applyCdnBase(base: string): void {
  currentBase = base
  for (const l of listeners) l(base)
}

function readSelection(): string | null {
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    if (!raw) return null
    const sel = JSON.parse(raw) as CdnSelection
    if (!CDN_LIST.includes(sel.base)) return null
    if (Date.now() >= sel.expiresAt) return null
    return sel.base
  } catch {
    return null
  }
}

function writeSelection(base: string): void {
  try {
    const sel: CdnSelection = { base, expiresAt: Date.now() + SELECTION_TTL }
    localStorage.setItem(SELECTION_KEY, JSON.stringify(sel))
  } catch {
  }
}

function clearSelection(): void {
  try {
    localStorage.removeItem(SELECTION_KEY)
  } catch {
  }
}

async function probe(base: string): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT)
  const start = performance.now()
  try {
    const res = await fetch(`${base}/version?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('probe failed')
    await res.text()
    return performance.now() - start
  } finally {
    clearTimeout(timer)
  }
}

interface ProbeResult {
  base: string
  hasAvailableNode: boolean
}

async function probeFastest(excludeBase?: string): Promise<ProbeResult> {
  const results = await Promise.allSettled(CDN_LIST.map(async (base) => ({ base, ms: await probe(base) })))
  const ok = results
    .filter((r): r is PromiseFulfilledResult<{ base: string; ms: number }> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => a.ms - b.ms)
  const preferred = ok.find((r) => r.base !== excludeBase)
  const base = (preferred ?? ok[0])?.base ?? DEFAULT_BASE
  return { base, hasAvailableNode: ok.length > 0 }
}

export function resolveCdnBase(): Promise<string> {
  if (!resolvePromise) {
    resolvePromise = (async () => {
      const remembered = readSelection()
      if (remembered) {
        applyCdnBase(remembered)
        return remembered
      }
      const { base, hasAvailableNode } = await probeFastest()
      applyCdnBase(base)
      if (hasAvailableNode) writeSelection(base)
      return base
    })()
  }
  return resolvePromise
}

export function invalidateCdn(excludeBase: string): void {
  clearSelection()
  resolvePromise = (async () => {
    const { base, hasAvailableNode } = await probeFastest(excludeBase)
    applyCdnBase(base)
    if (hasAvailableNode) writeSelection(base)
    return base
  })()
}

export function resetCdnForTest(): void {
  currentBase = DEFAULT_BASE
  resolvePromise = null
  listeners.clear()
}
