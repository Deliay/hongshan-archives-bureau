import { startLoading, completeLoading, failLoading } from '../components/Loading/tracker'

const API_BASE = 'https://endfield-assets.fffdan.com'

function safeParse(json: string): any {
  const prepared = json.replace(/(?<=: ?)(-?\d{17,})(?=[,\s\]\}])/g, '"$1"')
  return JSON.parse(prepared)
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  const text = await res.text()
  return safeParse(text)
}

const retryHandlers = new Map<string, () => void>()

function generateLoadingKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function retryLoading(key: string) {
  retryHandlers.get(key)?.()
}

async function trackFetch<T>(description: string, fn: () => Promise<T>): Promise<T> {
  const key = generateLoadingKey()

  const execute = async () => {
    startLoading(key, description)
    try {
      const result = await fn()
      completeLoading(key)
      retryHandlers.delete(key)
      return result
    } catch (error) {
      failLoading(key, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  retryHandlers.set(key, () => { execute().catch(() => {}) })
  return execute()
}

export async function fetchTableKeys(table: string): Promise<string[]> {
  return trackFetch(`正在调阅 ${table} 索引`, () => fetchJson(`${API_BASE}/table/${table}`))
}

export async function fetchTableAll(table: string): Promise<Record<string, any>> {
  return trackFetch(`正在调阅 ${table}`, () => fetchJson(`${API_BASE}/table/${table}/all`))
}

export async function fetchTableEntry(table: string, key: string): Promise<any> {
  return trackFetch(`正在调阅 ${table}/${key}`, () => fetchJson(`${API_BASE}/table/${table}/${key}`))
}

export async function fetchVersion(): Promise<string> {
  return trackFetch('正在检查版本', async () => {
    const res = await fetch(`${API_BASE}/version`)
    if (!res.ok) throw new Error('Failed to fetch version')
    return res.text()
  })
}

export async function fetchI18nLocales(): Promise<string[]> {
  return trackFetch('正在加载语言列表', () => fetchJson(`${API_BASE}/i18n`))
}

export async function fetchTableDictAll(table: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return trackFetch(`正在加载 ${table} 多语言 (${locale})`, () =>
    fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/all`)
  )
}

export async function fetchTableDictEntry(table: string, key: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return trackFetch(`正在加载 ${table}/${key} 多语言 (${locale})`, () =>
    fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/${key}`)
  )
}

export async function fetchI18nSearch(regex: string): Promise<{ Table: string; Path: string; Id: string }[]> {
  return trackFetch('正在搜索档案', () => fetchJson(`${API_BASE}/i18n/search/all/${encodeURIComponent(regex)}`))
}

export async function fetchI18nText(locale: string, id: string): Promise<string> {
  return trackFetch(`正在解析文本 (${locale})`, async () => {
    const res = await fetch(`${API_BASE}/i18n/${locale}/${id}`)
    if (!res.ok) return ''
    return res.text()
  })
}
