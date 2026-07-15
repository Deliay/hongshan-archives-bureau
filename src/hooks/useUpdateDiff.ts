import { useState, useEffect, useCallback } from 'react'
import { fetchTableDictAll } from '../lib/api'
import { getCachedData } from '../lib/cache'
import { useLocale } from '../lib/locale'
import type { Manifest, TableDiff, ManifestFolder } from '../lib/types-diff'

const DIFF_BASE = '/endfield-update-diff'

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useFetch<T>(url: string): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d) => { if (!cancelled) setData(d as T) })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])

  return { data, loading, error }
}

export function useManifest(): UseDataResult<Manifest> {
  return useFetch<Manifest>(`${DIFF_BASE}/manifest.json`)
}

function stripI18n(folder: ManifestFolder): ManifestFolder {
  const filtered = folder.files.filter((f) => !f.startsWith('I18nTextTable_'))
  const tableStats = folder.tableStats
    ? Object.fromEntries(
        Object.entries(folder.tableStats).filter(([k]) => !k.startsWith('I18nTextTable_')),
      )
    : undefined
  return { ...folder, files: filtered, fileCount: filtered.length, tableStats }
}

export function useFolderManifest(name: string): ManifestFolder | null {
  const { data: manifest } = useManifest()
  if (!manifest) return null
  const folder = manifest.folders.find((f) => f.name === name)
  if (!folder) return null
  return stripI18n(folder)
}

export function useTableDiff(folderName: string, tableFile: string): UseDataResult<TableDiff> {
  return useFetch<TableDiff>(`${DIFF_BASE}/${folderName}/${tableFile}`)
}

const i18nTextDictCaches = new Map<string, Promise<Record<string, string>>>()

export function useI18nTextDict(): UseDataResult<Record<string, string>> {
  const { locale } = useLocale()
  const [data, setData] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const key = `I18nTextTable_${locale}`
    if (!i18nTextDictCaches.has(key)) {
      i18nTextDictCaches.set(key, getCachedData<Record<string, string>>(
        key,
        () => fetchTableDictAll('I18nTextTable', locale),
      ))
    }
    i18nTextDictCaches.get(key)!
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [locale])

  useEffect(() => { load() }, [load])

  return { data, loading, error }
}

export function resolveDiffText(
  field: { id?: number | string; text?: string } | null | undefined,
  i18nDict?: Record<string, string>,
): string {
  if (!field) return ''
  const id = String(field.id ?? '')
  return i18nDict?.[id] || field.text || ''
}
