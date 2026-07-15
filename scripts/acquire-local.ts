import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const program = new Command()
program
  .name('acquire-local')
  .description('Acquire local table JSONs + I18nTextTable files into endfield-data/{version}')
  .version('1.0.0')
  .argument('<input-dir>', 'Directory containing flat table JSONs and I18nTextTable files')
  .argument('<version>', 'Version string for the output path')
  .addHelpText('after', `
INPUT
  A flat directory with all table JSONs and I18nTextTable_{Locale}.json files.
  Example: /path/to/Data/TableCfg/
    CharacterTable.json
    CharProfessionTable.json
    I18nTextTable_CN.json
    I18nTextTable_EN.json
    ...

FLOW
  Copies all JSON files from input directory to output, preserving everything as-is.

OUTPUT
  endfield-data/{version}/
    {TableName}.json              — original table data (preserved)
    I18nTextTable_{Locale}.json   — complete i18n text tables (preserved)
  `)

async function main() {
  const opts = program.parse()
  const [inputDir, version] = opts.args

  const outputDir = join(ROOT, 'endfield-data', version)

  const allFiles = await readdir(inputDir)
  const jsonFiles = allFiles.filter((f) => f.endsWith('.json'))

  if (jsonFiles.length === 0) {
    console.error(`No JSON files found in ${inputDir}`)
    process.exit(1)
  }

  console.log(`Input:  ${inputDir}`)
  console.log(`Output: ${outputDir}`)
  console.log(`Files:  ${jsonFiles.length}`)

  await mkdir(outputDir, { recursive: true })

  let completed = 0
  for (const file of jsonFiles) {
    const data = await readFile(join(inputDir, file))
    await writeFile(join(outputDir, file), data)
    completed++
    process.stdout.write(`\rCopying: ${completed}/${jsonFiles.length}  ${file}`)
  }

  process.stdout.write(`\rCopying: ${completed}/${jsonFiles.length}\n`)
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
