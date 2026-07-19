interface SubDescEntry {
  name: string
  value: string
}

interface SubDescListProps {
  entries: SubDescEntry[]
}

export default function SubDescList({ entries }: SubDescListProps) {
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {entries.map((s, i) => (
        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust whitespace-nowrap">
          {s.name}: {s.value}
        </span>
      ))}
    </div>
  )
}
