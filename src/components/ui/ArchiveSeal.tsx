interface ArchiveSealProps {
  className?: string
  size?: number
}

export function ArchiveSeal({ className, size = 48 }: ArchiveSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="宏山档案局徽章"
    >
      <circle cx="24" cy="24" r="22" stroke="#B89A6A" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="17" stroke="#9E3A3A" strokeWidth="1" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="var(--color-archive-ivory)"
        fontSize="16"
        fontFamily="Noto Serif SC, serif"
        fontWeight="600"
      >
        宏
      </text>
    </svg>
  )
}
