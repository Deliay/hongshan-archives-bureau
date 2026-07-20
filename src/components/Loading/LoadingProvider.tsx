import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { registerLoadingContext } from './tracker'
import type { LoadingContextValue, LoadingError, LoadingItem } from './types'

interface State {
  items: LoadingItem[]
  errors: LoadingError[]
  retryHandlers: Map<string, () => void>
}

type Action =
  | { type: 'start'; key: string; description: string }
  | { type: 'complete'; key: string }
  | { type: 'fail'; key: string; message: string }
  | { type: 'registerRetry'; key: string; handler: () => void }
  | { type: 'retry'; key: string }

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
            retry: state.retryHandlers.get(action.key),
          },
        ],
      }
    case 'registerRetry':
      state.retryHandlers.set(action.key, action.handler)
      return state
    case 'retry': {
      const handler = state.retryHandlers.get(action.key)
      handler?.()
      return { ...state, errors: state.errors.filter(e => e.key !== action.key) }
    }
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    errors: [],
    retryHandlers: new Map(),
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

  const registerRetry = useCallback((key: string, handler: () => void) => {
    dispatch({ type: 'registerRetry', key, handler })
  }, [])

  const retry = useCallback((key: string) => {
    dispatch({ type: 'retry', key })
  }, [])

  const value = useMemo<LoadingContextValue>(
    () => ({ items: state.items, errors: state.errors, start, complete, fail, retry }),
    [state.items, state.errors, start, complete, fail, retry],
  )

  useMemo(() => {
    registerLoadingContext({ ...value, registerRetry } as unknown as LoadingContextValue)
  }, [value, registerRetry])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}
