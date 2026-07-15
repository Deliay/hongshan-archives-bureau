import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'endfield-data')

const I18N_TABLE_PREFIX = 'I18nTextTable_'

const program = new Command()
program
  .name('diff-tables')
  .description('Compute structured diff between two versions of game tables')
  .version('1.0.0')
  .argument('<version-old>', 'Older version directory name in endfield-data/')
  .argument('<version-new>', 'Newer version directory name in endfield-data/')
  .option('-o, --out-dir <path>', 'Output directory (default: endfield-data/__diffs__/{v1}__{v2})')
  .addHelpText('after', `
FLOW
   1. Load I18nTextTable dicts for both versions
   2. For each common table, diff entry by entry, detecting i18n fields
   3. Output structured diff (only files with changes)

OUTPUT
  {outDir}/
    {TableName}.json           — structured diff per table
    I18nTextTable_{Locale}.json — i18n dict diff per locale
  `)

// ── helpers ──

function safeParse(text: string): any {
  const prepared = text.replace(/(?<=: ?)(-?\d{17,})(?=[,\s\]\}])/g, '"$1"')
  return JSON.parse(prepared)
}

function isI18nField(value: unknown): value is { id?: number | string; text?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length === 0 || keys.length > 2) return false
  if (!keys.every((k) => k === 'id' || k === 'text')) return false
  if ('id' in value && !(typeof (value as any).id === 'number' || typeof (value as any).id === 'string')) return false
  if ('text' in value && typeof (value as any).text !== 'string') return false
  return true
}

interface ResolveResult {
  value: unknown
  i18nIds: Record<string, string>  // JSON path → i18n id
}

function resolveEntry(
  value: unknown,
  i18nMap: Record<string, string>,
  path = '',
  i18nIds: Record<string, string> = {},
): unknown {
  if (isI18nField(value)) {
    const id = String(value.id ?? '')
    if (id && i18nMap[id] !== undefined) {
      i18nIds[path] = id
      return i18nMap[id]
    }
    if (id) i18nIds[path] = id
    return value.text || ''
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => resolveEntry(v, i18nMap, `${path}[${i}]`, i18nIds))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveEntry(v, i18nMap, path ? `${path}.${k}` : k, i18nIds)
    }
    return result
  }
  return value
}

// ── diff logic ──

type FieldChange =
  | { type: 'value'; oldValue: any; newValue: any }
  | { type: 'i18n'; changedLocales: Record<string, { oldText: string; newText: string }> }

interface ChangedEntry {
  oldValue: Record<string, any>
  newValue: Record<string, any>
  changed: Record<string, FieldChange>
}

interface TableDiff {
  tableName: string
  versionOld: string
  versionNew: string
  locale: string
  stats: { added: number; removed: number; changed: number }
  entries: {
    added: Record<string, any>
    removed: Record<string, any>
    changed: Record<string, ChangedEntry>
  }
}

function computeChangedLocales(
  idOld: string,
  idNew: string,
  allI18nOld: Record<string, Record<string, string>>,
  allI18nNew: Record<string, Record<string, string>>,
): Record<string, { oldText: string; newText: string }> {
  const result: Record<string, { oldText: string; newText: string }> = {}
  const locales = new Set([...Object.keys(allI18nOld), ...Object.keys(allI18nNew)])
  for (const locale of locales) {
    const oldText = allI18nOld[locale]?.[idOld]
    const newText = allI18nNew[locale]?.[idNew]
    if (oldText !== newText) {
      result[locale] = { oldText: oldText ?? '', newText: newText ?? '' }
    }
  }
  return result
}

function deepDiff(
  oldVal: unknown,
  newVal: unknown,
  allI18nOld: Record<string, Record<string, string>>,
  allI18nNew: Record<string, Record<string, string>>,
  path = '',
): Record<string, FieldChange> | null {
  if (oldVal === newVal) return null

  if (isI18nField(oldVal) && isI18nField(newVal)) {
    const oId = String((oldVal as any).id ?? '')
    const nId = String((newVal as any).id ?? '')
    if (oId === nId) return null
    const changedLocales = computeChangedLocales(oId, nId, allI18nOld, allI18nNew)
    if (Object.keys(changedLocales).length === 0) return null
    return { [path]: { type: 'i18n', changedLocales } }
  }

  if (isI18nField(oldVal) || isI18nField(newVal)) {
    return { [path]: { type: 'value', oldValue: oldVal, newValue: newVal } }
  }

  if (typeof oldVal !== 'object' || typeof newVal !== 'object' || oldVal === null || newVal === null) {
    return { [path]: { type: 'value', oldValue: oldVal, newValue: newVal } }
  }

  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const changes: Record<string, FieldChange> = {}
    const maxLen = Math.max(oldVal.length, newVal.length)
    let hasChange = false
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= oldVal.length) {
        changes[itemPath] = { type: 'value', oldValue: undefined, newValue: newVal[i] }
        hasChange = true
      } else if (i >= newVal.length) {
        changes[itemPath] = { type: 'value', oldValue: oldVal[i], newValue: undefined }
        hasChange = true
      } else {
        const itemDiff = deepDiff(oldVal[i], newVal[i], allI18nOld, allI18nNew, itemPath)
        if (itemDiff) {
          Object.assign(changes, itemDiff)
          hasChange = true
        }
      }
    }
    return hasChange ? changes : null
  }

  if (typeof oldVal === 'object' && typeof newVal === 'object') {
    const oldObj = oldVal as Record<string, unknown>
    const newObj = newVal as Record<string, unknown>
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    const changes: Record<string, FieldChange> = {}
    let hasChange = false

    for (const k of allKeys) {
      const fieldPath = path ? `${path}.${k}` : k
      if (!(k in oldObj)) {
        changes[fieldPath] = { type: 'value', oldValue: undefined, newValue: newObj[k] }
        hasChange = true
      } else if (!(k in newObj)) {
        changes[fieldPath] = { type: 'value', oldValue: oldObj[k], newValue: undefined }
        hasChange = true
      } else {
        const itemDiff = deepDiff(oldObj[k], newObj[k], allI18nOld, allI18nNew, fieldPath)
        if (itemDiff) {
          Object.assign(changes, itemDiff)
          hasChange = true
        }
      }
    }
    return hasChange ? changes : null
  }

  return { [path]: { type: 'value', oldValue: oldVal, newValue: newVal } }
}

function diffTables(
  tableName: string,
  v1: string,
  v2: string,
  dataOld: Record<string, any>,
  dataNew: Record<string, any>,
  allI18nOld: Record<string, Record<string, string>>,
  allI18nNew: Record<string, Record<string, string>>,
): TableDiff {
  const allKeys = new Set([...Object.keys(dataOld), ...Object.keys(dataNew)])
  const diff: TableDiff = {
    tableName,
    versionOld: v1,
    versionNew: v2,
    locale: 'all',
    stats: { added: 0, removed: 0, changed: 0 },
    entries: { added: {}, removed: {}, changed: {} },
  }

  for (const key of allKeys) {
    if (!(key in dataOld)) {
      diff.entries.added[key] = dataNew[key]
      diff.stats.added++
    } else if (!(key in dataNew)) {
      diff.entries.removed[key] = dataOld[key]
      diff.stats.removed++
    } else {
      const changes = deepDiff(dataOld[key], dataNew[key], allI18nOld, allI18nNew)
      if (changes && Object.keys(changes).length > 0) {
        diff.entries.changed[key] = {
          oldValue: dataOld[key],
          newValue: dataNew[key],
          changed: changes,
        }
        diff.stats.changed++
      }
    }
  }

  return diff
}

function diffI18nDicts(
  locale: string,
  oldDict: Record<string, string>,
  newDict: Record<string, string>,
) {
  const allKeys = new Set([...Object.keys(oldDict), ...Object.keys(newDict)])
  const added: Record<string, string> = {}
  const removed: Record<string, string> = {}
  const changed: Record<string, { oldText: string; newText: string }> = {}

  for (const key of allKeys) {
    if (!(key in oldDict)) {
      added[key] = newDict[key]
    } else if (!(key in newDict)) {
      removed[key] = oldDict[key]
    } else if (oldDict[key] !== newDict[key]) {
      changed[key] = { oldText: oldDict[key], newText: newDict[key] }
    }
  }

  return { locale, stats: { added: Object.keys(added).length, removed: Object.keys(removed).length, changed: Object.keys(changed).length }, added, removed, changed }
}

// ── main ──

async function main() {
  const opts = program.parse()
  const [v1, v2] = opts.args

  const dir1 = join(DATA_DIR, v1)
  const dir2 = join(DATA_DIR, v2)
  const outDir = opts.opts().outDir || join(DATA_DIR, '__diffs__', `${v1}__${v2}`)

  console.log(`Old:  ${dir1}`)
  console.log(`New:  ${dir2}`)
  console.log(`Diff: ${outDir}`)

  // Verify directories exist
  try { await readdir(dir1) } catch { console.error(`Directory not found: ${dir1}`); process.exit(1) }
  try { await readdir(dir2) } catch { console.error(`Directory not found: ${dir2}`); process.exit(1) }

  // Discover locales from first version
  const allFiles1 = await readdir(dir1)
  const locales = allFiles1
    .filter((f) => f.startsWith(I18N_TABLE_PREFIX) && f.endsWith('.json'))
    .map((f) => basename(f, '.json').slice(I18N_TABLE_PREFIX.length))
  console.log(`Locales: ${locales.length} [${locales.join(', ')}]`)

  // Load I18nTextTable for both versions
  const i18nOld: Record<string, Record<string, string>> = {}
  const i18nNew: Record<string, Record<string, string>> = {}
  for (const locale of locales) {
    try {
      const raw1 = await readFile(join(dir1, `${I18N_TABLE_PREFIX}${locale}.json`), 'utf-8')
      i18nOld[locale] = safeParse(raw1)
    } catch { console.warn(`Warning: ${I18N_TABLE_PREFIX}${locale}.json not found in ${dir1}`) }

    try {
      const raw2 = await readFile(join(dir2, `${I18N_TABLE_PREFIX}${locale}.json`), 'utf-8')
      i18nNew[locale] = safeParse(raw2)
    } catch { console.warn(`Warning: ${I18N_TABLE_PREFIX}${locale}.json not found in ${dir2}`) }
  }

  await mkdir(outDir, { recursive: true })

  // Diff I18nTextTable for each locale
  for (const locale of locales) {
    if (i18nOld[locale] && i18nNew[locale]) {
      const result = diffI18nDicts(locale, i18nOld[locale], i18nNew[locale])
      if (result.stats.added + result.stats.removed + result.stats.changed > 0) {
        await writeFile(join(outDir, `I18nTextTable_${locale}.json`), JSON.stringify(result, null, 2))
      }
    }
  }
  console.log(`I18n diffs: ${locales.length}`)

  // Diff each regular table
  const tableFiles = allFiles1.filter((f) => f.endsWith('.json') && !f.startsWith('I18n'))
  const allFiles2 = new Set(await readdir(dir2))
  const commonFiles = tableFiles.filter((f) => allFiles2.has(f))
    .concat(
      // Tables only in v2
      (await readdir(dir2))
        .filter((f) => f.endsWith('.json') && !f.startsWith('I18n') && !allFiles1.includes(f)),
    )

  console.log(`Tables to diff: ${commonFiles.length}`)

  let completed = 0
  for (const file of commonFiles) {
    const tableName = basename(file, '.json')

    let dataOld: Record<string, any> = {}
    let dataNew: Record<string, any> = {}
    let hasOld = false
    let hasNew = false

    try {
      dataOld = safeParse(await readFile(join(dir1, file), 'utf-8'))
      hasOld = true
    } catch { /* table only exists in v2 */ }

    try {
      dataNew = safeParse(await readFile(join(dir2, file), 'utf-8'))
      hasNew = true
    } catch { /* table only exists in v1 */ }

    const result = diffTables(tableName, v1, v2, dataOld, dataNew, i18nOld, i18nNew)
    const totalChanges = result.stats.added + result.stats.removed + result.stats.changed
    if (totalChanges > 0) {
      await writeFile(join(outDir, file), JSON.stringify(result, null, 2))
    }

    completed++
    if (totalChanges > 0) {
      process.stdout.write(`\r${completed}/${commonFiles.length}  ${tableName}  +${result.stats.added} -${result.stats.removed} ~${result.stats.changed}`)
    } else {
      process.stdout.write(`\r${completed}/${commonFiles.length}  ${tableName}  (no changes)`)
    }
  }

  process.stdout.write(`\r${completed}/${commonFiles.length}\n`)
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
