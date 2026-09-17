import { canvasSize, complementRects } from '../../lib/map/mapConfig'
import type { LevelMapConfig } from '../../lib/map/mapConfig'

interface TierMaskProps {
  config: LevelMapConfig
  tierId: number
}

export default function TierMask({ config, tierId }: TierMaskProps) {
  const tier = config.tiers.find((t) => t.tierId === tierId)
  if (!tier || tier.rects.length === 0) return null
  const size = canvasSize(config)
  const rects = complementRects(size.width, size.height, tier.rects)
  return (
    <>
      {rects.map((rect, index) => (
        <div
          key={`${rect.left}-${rect.top}-${index}`}
          data-testid="tier-mask"
          className="absolute pointer-events-none"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        />
      ))}
    </>
  )
}
