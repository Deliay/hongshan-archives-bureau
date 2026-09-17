interface StrokedTextProps {
  text: string
  className?: string
}

export default function StrokedText({ text, className }: StrokedTextProps) {
  return (
    <span className={`stroked-text ${className ?? ''}`}>
      <span className="stroked-text__stroke" aria-hidden="true">{text}</span>
      <span className="stroked-text__fill">{text}</span>
    </span>
  )
}
