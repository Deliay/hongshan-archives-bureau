import { useState, useEffect, useRef } from 'react'
import { fetchTableAll, fetchTableEntry } from '../lib/api'
import { getCachedData, initCache } from '../lib/cache'
import type { Operator, Weapon, Enemy, Item, Equip, Suit, Gem, StoryDocument, Area } from '../lib/types'
import { adaptOperator, adaptWeapon, adaptEnemy, adaptItem, adaptEquip, adaptSuit, adaptGem, adaptDocument, adaptArea } from '../lib/adapter'

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ---------- Generic hooks ----------

function useData<T>(fetcher: () => Promise<T>): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = () => {
    setLoading(true)
    setError(null)
    fetcherRef.current()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return { data, loading, error, refetch: load }
}

// ---------- Version ----------

let versionPromise: Promise<string> | null = null

export function useVersion(): UseDataResult<string> {
  return useData(async () => {
    if (!versionPromise) {
      versionPromise = initCache()
    }
    return versionPromise
  })
}

// ---------- Table hooks ----------

function useTableData<T>(table: string, adapt: (raw: any) => T): UseDataResult<T[]> {
  return useData(async () => {
    const raw = await getCachedData<Record<string, any>>(table, () => fetchTableAll(table))
    return Object.entries(raw).map(([, v]) => adapt(v))
  })
}

function useTableEntry<T>(table: string, key: string, adapt: (raw: any) => T): UseDataResult<T> {
  return useData(async () => {
    const raw = await getCachedData<any>(table, () => fetchTableEntry(table, key), key)
    return adapt(raw)
  })
}

// ---------- Domain hooks ----------

export function useOperators(): UseDataResult<Operator[]> {
  return useTableData('CharacterTable', adaptOperator)
}

export function useOperator(id: string): UseDataResult<Operator> {
  return useTableEntry('CharacterTable', id, adaptOperator)
}

export function useWeapons(): UseDataResult<Weapon[]> {
  return useTableData('WeaponBasicTable', adaptWeapon)
}

export function useEnemies(): UseDataResult<Enemy[]> {
  return useTableData('EnemyTable', adaptEnemy)
}

export function useItems(): UseDataResult<Item[]> {
  return useTableData('ItemTable', adaptItem)
}

export function useEquips(): UseDataResult<Equip[]> {
  return useTableData('EquipTable', adaptEquip)
}

export function useSuits(): UseDataResult<Suit[]> {
  return useTableData('EquipSuitTable', adaptSuit)
}

export function useGems(): UseDataResult<Gem[]> {
  return useTableData('GemTable', adaptGem)
}

export function useDocuments(): UseDataResult<StoryDocument[]> {
  return useTableData('PrtsDocument', adaptDocument)
}

export function useAreas(): UseDataResult<Area[]> {
  return useTableData('SceneAreaTable', adaptArea)
}
