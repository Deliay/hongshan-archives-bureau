import { rarityColor } from '../data/constants'

export default function RarityStars({ level }: { level: number }) {
  const color = rarityColor(level)
  return (
    <span className="inline-flex gap-0.5 text-xs" style={{ color }}>
      {'★'.repeat(Math.min(level, 6))}
    </span>
  )
}
