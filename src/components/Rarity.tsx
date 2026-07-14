const RARITY_COLORS = ['black', 'black', 'gray', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

export default function Rarity({ level }: { level: number }) {
  const stars = Math.min(level, RARITY_COLORS.length - 1)
  return (
    <span className="inline-flex gap-0.5 text-xs" style={{ color: RARITY_COLORS[stars] }}>
      {'★'.repeat(stars)}
    </span>
  )
}
