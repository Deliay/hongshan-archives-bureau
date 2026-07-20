export interface LoadingItem {
  key: string
  description: string
  startedAt: number
}

export interface LoadingError {
  key: string
  description: string
  message: string
  timestamp: number
}

export interface LoadingContextValue {
  items: LoadingItem[]
  errors: LoadingError[]
  start: (key: string, description: string) => void
  complete: (key: string) => void
  fail: (key: string, message: string) => void
}
