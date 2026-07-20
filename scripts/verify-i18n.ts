import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CUSTOM_JSON = path.resolve(__dirname, 'i18n-custom.json')
const SRC_DIR = path.resolve(__dirname, '../src')
const LOCALES = ['CN', 'TC', 'EN', 'JP', 'KR', 'RU', 'MX', 'BR', 'DE', 'FR', 'VN', 'TH', 'ID', 'IT']
const PLACEHOLDER_CHECK_LOCALES = ['MX', 'BR', 'DE', 'FR', 'VN', 'TH', 'ID', 'IT']

function extractKeysFromCode(): Set<string> {
  const keys = new Set<string>()
  function walk(currentDir: string) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.')) continue
        walk(fullPath)
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx')) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        const directCalls = content.matchAll(/t\(['"`]([a-zA-Z]\w*\.[\w.]+)['"`]/g)
        for (const m of directCalls) {
          keys.add(m[1])
        }
        const descKeys = content.matchAll(/descriptionKey:\s*['"`]([a-zA-Z]\w*\.[\w.]+)['"`]/g)
        for (const m of descKeys) {
          keys.add(m[1])
        }
        const apiKeys = content.matchAll(/['"`](api\.\w+)['"`]/g)
        for (const m of apiKeys) {
          keys.add(m[1])
        }
      }
    }
  }
  walk(SRC_DIR)
  return keys
}

function extractDefinedKeys(): Set<string> {
  const custom = JSON.parse(fs.readFileSync(CUSTOM_JSON, 'utf-8'))
  return new Set(Object.keys(custom))
}

function extractVars(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort()
}

function validateCustomTranslations(custom: Set<string>): boolean {
  const customData: Record<string, Record<string, string>> = JSON.parse(fs.readFileSync(CUSTOM_JSON, 'utf-8'))
  let allValid = true

  for (const key of custom) {
    const entry = customData[key]
    if (!entry) {
      console.error(`ERROR: Could not find CUSTOM entry for key '${key}'`)
      allValid = false
      continue
    }

    const missing: string[] = []
    for (const locale of LOCALES) {
      if (!entry[locale] || !entry[locale].trim()) {
        missing.push(locale)
      }
    }
    if (missing.length > 0) {
      console.error(`ERROR: CUSTOM key '${key}' is missing value for locale(s): ${missing.join(', ')}`)
      allValid = false
    }
  }

  for (const key of custom) {
    const entry = customData[key]
    if (!entry) continue
    const enVal = entry.EN?.trim()
    const cnVal = entry.CN?.trim()

    const allSame = LOCALES.every(l => {
      const v = entry[l]?.trim()
      return v && v === enVal
    })
    if (allSame) continue

    for (const locale of PLACEHOLDER_CHECK_LOCALES) {
      const val = entry[locale]?.trim()
      if (!val) continue
      const matchesPlaceholder = (enVal && val === enVal) || (cnVal && val === cnVal)
      if (matchesPlaceholder) {
        console.error(`ERROR: CUSTOM key '${key}' has placeholder (same as ${val === enVal ? 'EN' : 'CN'}) for locale '${locale}': "${val}"`)
        allValid = false
      }
    }
  }

  for (const key of custom) {
    const entry = customData[key]
    if (!entry) continue
    const cnVars = extractVars(entry.CN || '')
    const enVars = extractVars(entry.EN || '')
    const refVars = [...new Set([...cnVars, ...enVars])].sort()
    if (refVars.length === 0) continue

    for (const locale of LOCALES) {
      const locVars = extractVars(entry[locale] || '')
      for (const v of refVars) {
        if (!locVars.includes(v)) {
          console.error(`ERROR: CUSTOM key '${key}' locale '${locale}' is missing variable '{{${v}}}' (found: {${locVars.join(', ')}})`)
          allValid = false
        }
      }
      for (const v of locVars) {
        if (!refVars.includes(v)) {
          console.error(`ERROR: CUSTOM key '${key}' locale '${locale}' has unexpected variable '{{${v}}}' (expected: {${refVars.join(', ')}})`)
          allValid = false
        }
      }
    }
  }

  return allValid
}

function main() {
  let hasError = false

  const codeKeys = extractKeysFromCode()
  console.log(`Found ${codeKeys.size} t('...') keys in source code`)

  const custom = extractDefinedKeys()
  console.log(`Found ${custom.size} defined custom keys`)

  const usedButNotDefined = new Set([...codeKeys].filter(k => !custom.has(k)))
  if (usedButNotDefined.size > 0) {
    console.error(`ERROR: Keys used in code but not defined in i18n-custom.json:`)
    for (const k of [...usedButNotDefined].sort()) {
      console.error(`  ${k}`)
    }
    hasError = true
  }

  const definedButNotUsed = new Set([...custom].filter(k => !codeKeys.has(k)))
  if (definedButNotUsed.size > 0) {
    console.warn(`WARNING: Keys defined in i18n-custom.json but not used in code:`)
    for (const k of [...definedButNotUsed].sort()) {
      console.warn(`  ${k}`)
    }
  }

  if (!validateCustomTranslations(custom)) {
    hasError = true
  }

  if (hasError) {
    console.error('\ni18n verification FAILED')
    process.exit(1)
  } else {
    console.log('\ni18n verification PASSED')
  }
}

main()
