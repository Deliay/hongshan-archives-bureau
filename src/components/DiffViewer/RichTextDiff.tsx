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

function colorText(text: string, color: string, bg: string): string {
  return `<color=${color}><mark=#${bg}>${text}</mark></color>`
}

function wrapDiff(text: string, additions: string[], removals: string[]): string {
  const words = text.split(/(\s+)/)
  return words.map(w => {
    if (removals.includes(w)) return colorText(w, '#f87171', '451a1a')
    if (additions.includes(w)) return colorText(w, '#4ade80', '14321e')
    return w
  }).join('')
}

interface Props {
  oldText: string
  newText: string
  formatter?: (text: string) => string
}

export function RichTextDiff({ oldText, newText, formatter }: Props) {
  const { oldOnly, newOnly } = wordDiff(oldText, newText)
  const hasChanges = oldOnly.length > 0 || newOnly.length > 0

  const apply = (text: string) => formatter ? formatter(text) : text

  if (!hasChanges) {
    return (
      <span className="text-[10px]">
        <RichText text={apply(newText)} />
      </span>
    )
  }

  return (
    <span className="inline text-[10px] leading-relaxed">
      <span className="line-through decoration-1" style={{ backgroundColor: '#451a1a' }}>
        <RichText text={apply(wrapDiff(oldText, [], oldOnly))} />
      </span>
      <span className="mx-1" style={{ backgroundColor: '#14321e' }}>
        <RichText text={apply(wrapDiff(newText, newOnly, []))} />
      </span>
    </span>
  )
}
