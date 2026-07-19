// 本文件由 scripts/generate-i18n-dicts.ts 根据 API /i18n 自动生成
// 请勿手动修改 import 列表
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import CN from './dicts/CN.json'
import TC from './dicts/TC.json'
import EN from './dicts/EN.json'
import JP from './dicts/JP.json'
import KR from './dicts/KR.json'
import RU from './dicts/RU.json'
import MX from './dicts/MX.json'
import BR from './dicts/BR.json'
import DE from './dicts/DE.json'
import FR from './dicts/FR.json'
import VN from './dicts/VN.json'
import TH from './dicts/TH.json'
import ID from './dicts/ID.json'
import IT from './dicts/IT.json'

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      result[key] = v
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key))
    }
  }
  return result
}

const messages: Record<string, Record<string, string>> = {
  CN: flatten(CN),
  TC: flatten(TC),
  EN: flatten(EN),
  JP: flatten(JP),
  KR: flatten(KR),
  RU: flatten(RU),
  MX: flatten(MX),
  BR: flatten(BR),
  DE: flatten(DE),
  FR: flatten(FR),
  VN: flatten(VN),
  TH: flatten(TH),
  ID: flatten(ID),
  IT: flatten(IT),
}

export function translate(locale: string, key: string, vars?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages.EN
  let text = dict[key] ?? messages.EN[key] ?? messages.CN[key] ?? key
  if (vars) {
    text = text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''))
  }
  return text
}

interface I18nContextValue {
  locale: string
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'CN',
  t: (key) => key,
})

export function I18nProvider({ children, locale }: { children: ReactNode; locale: string }) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: (key, vars) => translate(locale, key, vars) }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
