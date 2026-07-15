import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const API_BASE = 'https://endfield-assets.fffdan.com'

const program = new Command()
program
  .name('acquire-api')
  .description('Acquire all game tables & i18n text tables from the API')
  .version('1.0.0')
  .addHelpText('after', `
FLOW
  1. Fetch version from \`GET /version\`
  2. Fetch all table names from \`GET /table\`
  3. Download every table via \`GET /table/{name}/all\`
  4. Save to endfield-data/{version}/

OUTPUT
  endfield-data/{version}/
    {TableName}.json              — raw table data
    I18nTextTable_{Locale}.json   — complete i18n text tables (included in above)

NOTES
  - Fetches ALL tables including I18nTextTable_* (complete i18n dicts)
  - No arguments required; just run it
  `)

function safeParse(text: string): any {
  const prepared = text.replace(/(?<=: ?)(-?\d{17,})(?=[,\s\]\}])/g, '"$1"')
  return JSON.parse(prepared)
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${res.status} ${url}`)
  return res.json()
}

async function fetchJsonSafe(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) return null
  const text = await res.text()
  return safeParse(text)
}

async function main() {
  const versionRes = await fetch(`${API_BASE}/version`)
  const version = (await versionRes.text()).trim()
  console.log(`Version: ${version}`)

  const dataDir = join(ROOT, 'endfield-data', version)

  const tableNames: string[] = await fetchJson(`${API_BASE}/table`)
  console.log(`Tables: ${tableNames.length}`)
  console.log(`Output: ${dataDir}`)

  await mkdir(dataDir, { recursive: true })

  let completed = 0
  const total = tableNames.length
  for (const name of tableNames) {
    const data = await fetchJsonSafe(`${API_BASE}/table/${name}/all`)
    if (data !== null) {
      await writeFile(join(dataDir, `${name}.json`), JSON.stringify(data, null, 2))
    }
    completed++
    process.stdout.write(`\r${completed}/${total}  ${name}`)
  }
  process.stdout.write(`\r${completed}/${total}\n`)

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
