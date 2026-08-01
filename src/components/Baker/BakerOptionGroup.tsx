import type { BakerOption } from '../../lib/types'

interface BakerOptionGroupProps {
  options: BakerOption[]
  selectedId?: string
  onSelect: (optionId: string) => void
}

export function BakerOptionGroup({ options, selectedId, onSelect }: BakerOptionGroupProps) {
  return (
    <div className="border border-archive-gold/30 rounded-lg p-3 space-y-2">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`w-full text-left px-3 py-2 rounded border transition-colors ${
            selectedId === opt.id
              ? 'border-archive-gold bg-archive-gold/10'
              : 'border-archive-border hover:border-archive-gold/50'
          }`}
        >
          {opt.emojiUrl ? (
            <img src={opt.emojiUrl} alt="" className="w-8 h-8 inline-block mr-2" />
          ) : null}
          <span className="text-sm text-archive-ivory">{opt.text}</span>
        </button>
      ))}
    </div>
  )
}
