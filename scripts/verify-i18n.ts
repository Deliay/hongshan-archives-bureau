import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CUSTOM_JSON = path.resolve(__dirname, 'i18n-custom.json')
const SRC_DIR = path.resolve(__dirname, '../src')
const LOCALES = ['CN', 'TC', 'EN', 'JP', 'KR', 'RU', 'MX', 'BR', 'DE', 'FR', 'VN', 'TH', 'ID', 'IT']

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
