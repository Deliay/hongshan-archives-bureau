export function toCountString(amount: number): string {
  return amount > 10000 ? `${(amount / 1000).toFixed(1)}k` : `${amount}`
}

interface AmountBadgeProps {
  amount: number
}

export default function AmountBadge({ amount }: AmountBadgeProps) {
  return (
    <span className="absolute top-0.5 right-0.5 rounded bg-archive-ink/80 px-0.5 text-[9px] font-mono text-archive-ivory">
      ×{toCountString(amount)}
    </span>
  )
}
