const API_BASE = 'https://endfield-assets.fffdan.com'

// i18n IDs in game data are 64-bit integers exceeding Number.MAX_SAFE_INTEGER.
// JSON.parse natively cannot preserve these, so we pre-process the raw text
// to quote any number >= 10^16 (17+ digits) before parsing.
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

export async function fetchTableKeys(table: string): Promise<string[]> {
  return fetchJson(`${API_BASE}/table/${table}`)
}

export async function fetchTableAll(table: string): Promise<Record<string, any>> {
  return fetchJson(`${API_BASE}/table/${table}/all`)
}

export async function fetchTableEntry(table: string, key: string): Promise<any> {
  return fetchJson(`${API_BASE}/table/${table}/${key}`)
}

export async function fetchVersion(): Promise<string> {
  const res = await fetch(`${API_BASE}/version`)
  if (!res.ok) throw new Error('Failed to fetch version')
  return res.text()
}

export async function fetchI18nLocales(): Promise<string[]> {
  return fetchJson(`${API_BASE}/i18n`)
}

export async function fetchTableDictAll(table: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/all`)
}

export async function fetchTableDictEntry(table: string, key: string, locale: string = 'CN'): Promise<Record<string, string>> {
  return fetchJson(`${API_BASE}/i18n/dict/${locale}/table/${table}/${key}`)
}

export async function fetchI18nSearch(regex: string): Promise<{ Table: string; Path: string; Id: string }[]> {
  return fetchJson(`${API_BASE}/i18n/search/all/${encodeURIComponent(regex)}`)
}

export async function fetchI18nText(locale: string, id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/i18n/${locale}/${id}`)
  if (!res.ok) return ''
  return res.text()
}
