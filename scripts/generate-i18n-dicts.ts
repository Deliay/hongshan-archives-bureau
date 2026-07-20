import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUT_DIR = path.resolve(__dirname, '../src/i18n/dicts')
const INDEX_FILE = path.resolve(__dirname, '../src/i18n/index.tsx')

const LOCALES = ['CN', 'TC', 'EN', 'JP', 'KR', 'RU', 'MX', 'BR', 'DE', 'FR', 'VN', 'TH', 'ID', 'IT']

function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current: Record<string, unknown> = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {}
      current = current[parts[i]] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
  }
  return root
}

async function main() {
  const CUSTOM: Record<string, Record<string, string>> = JSON.parse(
    await fs.readFile(path.resolve(__dirname, 'i18n-custom.json'), 'utf-8'),
  )

  console.log('Locales:', LOCALES)
  console.log(`Keys: ${Object.keys(CUSTOM).length}`)

  await fs.mkdir(OUT_DIR, { recursive: true })

  const dicts: Record<string, Record<string, string>> = {}
  for (const locale of LOCALES) {
    dicts[locale] = {}
  }

  for (const [key, translations] of Object.entries(CUSTOM) as [string, Record<string, string>][]) {
    for (const locale of LOCALES) {
      if (translations[locale]) {
        dicts[locale][key] = translations[locale]
      }
    }
  }

  for (const [locale, flatDict] of Object.entries(dicts)) {
    const nested = unflatten(flatDict)
    await fs.writeFile(
      path.join(OUT_DIR, `${locale}.json`),
      `${JSON.stringify(nested, null, 2)}\n`,
    )
  }

  const imports = LOCALES.map((l) => `import ${l} from './dicts/${l}.json'`).join('\n')
  const messages = LOCALES.map((l) => `  ${l}: flatten(${l}),`).join('\n')
  const indexContent = `// 本文件由 scripts/generate-i18n-dicts.ts 根据 i18n-custom.json 自动生成
// 请勿手动修改
import { createContext, useContext, useMemo, type ReactNode } from 'react'
${imports}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? \`\${prefix}.\${k}\` : k
    if (typeof v === 'string') {
      result[key] = v
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key))
    }
  }
  return result
}

const messages: Record<string, Record<string, string>> = {
${messages}
}

export function translate(locale: string, key: string, vars?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages.EN
  let text = dict[key] ?? messages.EN[key] ?? messages.CN[key] ?? key
  if (vars) {
    text = text.replace(/\\{\\{(\\w+)\\}\\}/g, (_, name) => String(vars[name] ?? ''))
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
`
  await fs.writeFile(INDEX_FILE, indexContent)

  console.log('Generated dictionaries for:', LOCALES.join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
