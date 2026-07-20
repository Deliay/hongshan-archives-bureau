import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { registerLoadingContext } from './tracker'
import type { LoadingContextValue, LoadingError, LoadingItem } from './types'

interface State {
  items: LoadingItem[]
  errors: LoadingError[]
}

type Action =
  | { type: 'start'; key: string; description: string }
  | { type: 'complete'; key: string }
  | { type: 'fail'; key: string; message: string }

const LoadingContext = createContext<LoadingContextValue | null>(null)

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        items: [...state.items, { key: action.key, description: action.description, startedAt: Date.now() }],
        errors: state.errors.filter(e => e.key !== action.key),
      }
    case 'complete':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }
    case 'fail':
      return {
        ...state,
        items: state.items.filter(i => i.key !== action.key),
        errors: [
          ...state.errors.filter(e => e.key !== action.key),
          {
            key: action.key,
            description: state.items.find(i => i.key === action.key)?.description ?? action.key,
            message: action.message,
            timestamp: Date.now(),
          },
        ],
      }
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    errors: [],
  })

  const start = useCallback((key: string, description: string) => {
    dispatch({ type: 'start', key, description })
  }, [])

  const complete = useCallback((key: string) => {
    dispatch({ type: 'complete', key })
  }, [])

  const fail = useCallback((key: string, message: string) => {
    dispatch({ type: 'fail', key, message })
  }, [])

  const value = useMemo<LoadingContextValue>(
    () => ({ items: state.items, errors: state.errors, start, complete, fail }),
    [state.items, state.errors, start, complete, fail],
  )

  useEffect(() => {
    registerLoadingContext(value)
  }, [value])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}
