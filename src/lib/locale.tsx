import { createContext, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'hs_locale'

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'CN', setLocale: () => {} })

function getInitialLocale(): string {
  if (typeof window === 'undefined') return 'CN'
  return localStorage.getItem(STORAGE_KEY) || 'CN'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(getInitialLocale)

  const setLocale = (next: string) => {
    setLocaleState(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
