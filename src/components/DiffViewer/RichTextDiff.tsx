import { RichText } from '../../lib/richText'

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const regex = /(<[^>]*>)|(.)/gs
  for (;;) {
    const match = regex.exec(text)
    if (!match) break
    tokens.push(match[0])
  }
  return tokens
}

function charDiff(oldText: string, newText: string) {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)
  const oldOnly: string[] = []
  const newOnly: string[] = []
  let oi = 0, ni = 0
  while (oi < oldTokens.length || ni < newTokens.length) {
    if (oi < oldTokens.length && ni < newTokens.length && oldTokens[oi] === newTokens[ni]) {
      oi++
      ni++
    } else {
      const oldIdx = oldTokens.indexOf(newTokens[ni], oi)
      const newIdx = newTokens.indexOf(oldTokens[oi], ni)
      if (ni < newTokens.length && (oldIdx === -1 || (newIdx !== -1 && newIdx - ni < oldIdx - oi))) {
        newOnly.push(newTokens[ni])
        ni++
      } else if (oi < oldTokens.length) {
        oldOnly.push(oldTokens[oi])
        oi++
      } else {
        break
      }
    }
  }
  return { oldOnly, newOnly }
}

function wrapDiff(text: string, additions: string[], removals: string[]): string {
  const tokens = tokenize(text)
  const result: string[] = []
  let i = 0
  while (i < tokens.length) {
    if (additions.includes(tokens[i]) || removals.includes(tokens[i])) {
      const isAdd = additions.includes(tokens[i])
      const color = isAdd ? '#4ade80' : '#f87171'
      const bg = isAdd ? '14321e' : '451a1a'
      const group: string[] = [tokens[i]]
      i++
      while (i < tokens.length && (additions.includes(tokens[i]) || removals.includes(tokens[i]))) {
        group.push(tokens[i])
        i++
      }
      result.push(`<color=${color}><mark=#${bg}>${group.join('')}</mark></color>`)
    } else {
      result.push(tokens[i])
      i++
    }
  }
  return result.join('')
}

interface Props {
  oldText: string
  newText: string
  formatter?: (text: string) => string
}

export function RichTextDiff({ oldText, newText, formatter }: Props) {
  const { oldOnly, newOnly } = charDiff(oldText, newText)
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
