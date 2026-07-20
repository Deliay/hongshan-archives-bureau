export interface LoadingItem {
  key: string
  description: string
  descriptionKey?: string
  descriptionVars?: Record<string, string | number>
  startedAt: number
}

export interface LoadingError {
  key: string
  description: string
  descriptionKey?: string
  descriptionVars?: Record<string, string | number>
  message: string
  timestamp: number
}

export interface LoadingContextValue {
  items: LoadingItem[]
  errors: LoadingError[]
  start: (key: string, description: string, descriptionKey?: string, descriptionVars?: Record<string, string | number>) => void
  complete: (key: string) => void
  fail: (key: string, message: string) => void
}
