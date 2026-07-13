const API_BASE = 'https://endfield-assets.fffdan.com'

export async function fetchTableKeys(table: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/table/${table}`)
  if (!res.ok) throw new Error(`Failed to fetch keys for ${table}`)
  return res.json()
}

export async function fetchTableAll(table: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/table/${table}/all`)
  if (!res.ok) throw new Error(`Failed to fetch ${table}`)
  return res.json()
}

export async function fetchTableEntry(table: string, key: string): Promise<any> {
  const res = await fetch(`${API_BASE}/table/${table}/${key}`)
  if (!res.ok) throw new Error(`Failed to fetch ${table}/${key}`)
  return res.json()
}

export async function fetchVersion(): Promise<string> {
  const res = await fetch(`${API_BASE}/version`)
  if (!res.ok) throw new Error('Failed to fetch version')
  return res.text()
}
