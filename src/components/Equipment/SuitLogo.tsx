import { ASSET_BASE } from '../../lib/adapter'

interface SuitLogoProps {
  logoName: string
  className?: string
}

export default function SuitLogo({ logoName, className }: SuitLogoProps) {
  if (!logoName) return null
  return (
    <img
      src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/equipmentlogobigwhite/${logoName}.png`}
      alt=""
      className={`h-7 w-auto object-contain ${className ?? ''}`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}
