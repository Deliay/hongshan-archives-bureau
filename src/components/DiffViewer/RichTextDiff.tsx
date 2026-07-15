import { RichText } from '../../lib/richText'

function commonPrefixLen(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

function commonSuffixLen(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++
  return i
}

interface Props {
  oldText: string
  newText: string
  formatter?: (text: string) => string
}

export function RichTextDiff({ oldText, newText, formatter }: Props) {
  if (oldText === newText) {
    return (
      <span className="text-[10px]">
        <RichText text={formatter ? formatter(newText) : newText} />
      </span>
    )
  }

  const prefixLen = commonPrefixLen(oldText, newText)
  const suffixLen = commonSuffixLen(
    oldText.slice(prefixLen),
    newText.slice(prefixLen),
  )

  const prefix = oldText.slice(0, prefixLen)
  const oldMid = oldText.slice(prefixLen, oldText.length - suffixLen)
  const newMid = newText.slice(prefixLen, newText.length - suffixLen)
  const suffix = oldText.slice(oldText.length - suffixLen)

  const apply = (text: string) => formatter ? formatter(text) : text

  return (
    <span className="inline text-[10px] leading-relaxed">
      {prefix && <RichText text={apply(prefix)} />}
      {oldMid && (
        <span className="line-through decoration-1" style={{ backgroundColor: '#451a1a' }}>
          <RichText text={apply(oldMid)} />
        </span>
      )}
      {newMid && (
        <span style={{ backgroundColor: '#14321e' }}>
          <RichText text={apply(newMid)} />
        </span>
      )}
      {suffix && <RichText text={apply(suffix)} />}
    </span>
  )
}
