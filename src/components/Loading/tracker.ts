import type { LoadingContextValue } from './types'

let dispatch: LoadingContextValue | null = null

export function registerLoadingContext(ctx: LoadingContextValue) {
  dispatch = ctx
}

export function startLoading(key: string, description: string, descriptionKey?: string, descriptionVars?: Record<string, string | number>) {
  dispatch?.start(key, description, descriptionKey, descriptionVars)
}

export function completeLoading(key: string) {
  dispatch?.complete(key)
}

export function failLoading(key: string, message: string) {
  dispatch?.fail(key, message)
}
