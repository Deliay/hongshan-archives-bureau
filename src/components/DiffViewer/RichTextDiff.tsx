import { RichText } from '../../lib/richText'

interface Props {
  oldText: string
  newText: string
  formatter?: (text: string) => string
}

export function RichTextDiff({ oldText, newText, formatter }: Props) {
  const apply = (text: string) => formatter ? formatter(text) : text

  if (oldText === newText) {
    return (
      <span className="text-[10px]">
        <RichText text={apply(newText)} />
      </span>
    )
  }

  return (
    <span className="inline text-[10px] leading-relaxed">
      <span className="line-through decoration-1" style={{ backgroundColor: '#451a1a' }}>
        <RichText text={apply(oldText)} />
      </span>
      <span className="mx-1" style={{ backgroundColor: '#14321e' }}>
        <RichText text={apply(newText)} />
      </span>
    </span>
  )
}
