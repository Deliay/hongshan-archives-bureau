import { RichText } from '../../lib/richText'

function wordDiff(oldText: string, newText: string) {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)
  const oldOnly: string[] = []
  const newOnly: string[] = []
  let oi = 0, ni = 0
  while (oi < oldWords.length || ni < newWords.length) {
    if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
      oi++
      ni++
    } else {
      const oldIdx = oldWords.indexOf(newWords[ni], oi)
      const newIdx = newWords.indexOf(oldWords[oi], ni)
      if (ni < newWords.length && (oldIdx === -1 || (newIdx !== -1 && newIdx - ni < oldIdx - oi))) {
        newOnly.push(newWords[ni])
        ni++
      } else if (oi < oldWords.length) {
        oldOnly.push(oldWords[oi])
        oi++
      } else {
        break
      }
    }
  }
  return { oldOnly, newOnly }
}

function wrapDiff(text: string, additions: string[], removals: string[]): string {
  const words = text.split(/(\s+)/)
  return words.map(w => {
    if (additions.includes(w)) return `<color=#4ade80>${w}</color>`
    if (removals.includes(w)) return `<color=#ef4444>${w}</color>`
    return w
  }).join('')
}

interface Props {
  oldText: string
  newText: string
}

export function RichTextDiff({ oldText, newText }: Props) {
  const { oldOnly, newOnly } = wordDiff(oldText, newText)
  const hasChanges = oldOnly.length > 0 || newOnly.length > 0

  if (!hasChanges) {
    return (
      <div className="text-[10px]">
        <RichText text={newText} />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px]">
        <span className="text-[#8B8982]">旧 </span>
        <RichText text={wrapDiff(oldText, [], oldOnly)} />
      </div>
      <div className="text-[10px]">
        <span className="text-[#8B8982]">新 </span>
        <RichText text={wrapDiff(newText, newOnly, [])} />
      </div>
    </div>
  )
}
