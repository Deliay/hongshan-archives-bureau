import { createContext, useContext, useState, type ReactNode } from 'react'

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'CN', setLocale: () => {} })

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('CN')
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
