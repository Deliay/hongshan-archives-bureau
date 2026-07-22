import { rarityColor } from '../data/constants'

interface RarityFilterSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  levels: number[]
  allLabel?: string
  className?: string
}

export default function RarityFilterSelect({ value, onChange, levels, allLabel = '', className }: RarityFilterSelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
      className={`px-3 py-1.5 text-sm rounded border border-archive-border bg-archive-file text-archive-ivory focus:outline-none focus:border-archive-gold/40 transition-colors ${className ?? ''}`}
    >
      <option value="">{allLabel}</option>
      {levels.map(r => (
        <option key={r} value={r} style={{ color: rarityColor(r) }}>{'★'.repeat(r)}</option>
      ))}
    </select>
  )
}
