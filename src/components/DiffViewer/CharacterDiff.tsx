import type { TableDiffComponentProps } from './registry'
import DiffViewer from './DiffViewer'

export default function CharacterDiff({ diff }: TableDiffComponentProps) {
  return (
    <DiffViewer
      diff={diff}
      renderKey={(key) => {
        const entry: any = diff.entries.changed[key] ?? diff.entries.added[key] ?? diff.entries.removed[key]
        if (!entry) return key
        const name = entry.name?.text ?? entry.name ?? ''
        const profession = entry.profession ?? ''
        const rarity = entry.rarity ?? ''
        return `${key}  ${name ? `「${name}」` : ''}${profession ? `[${profession}]` : ''}${rarity ? `★${rarity}` : ''}`
      }}
    />
  )
}
