import { useMemo, useState } from 'react'
import { tierTileUrl, tierTiles } from '../../lib/map/mapConfig'
import type { LevelMapConfig, MapLod, MapView } from '../../lib/map/mapConfig'

interface TierLayerProps {
  levelId: string
  config: LevelMapConfig
  lod: MapLod
  tierId: number
  view: MapView
  viewport: { width: number; height: number }
}

export default function TierLayer({ levelId, config, lod, tierId, view, viewport }: TierLayerProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const tiles = useMemo(
    () => tierTiles(config, lod, tierId, view, viewport),
    [config, lod, tierId, view, viewport],
  )

  return (
    <>
      {tiles.map((tile) => {
        if (failed.has(tile.textureId)) return null
        return (
          <img
            key={tile.textureId}
            data-testid="map-tier-tile"
            src={tierTileUrl(levelId, tile.textureId)}
            alt=""
            draggable={false}
            className="absolute select-none pointer-events-none max-w-none"
            style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height }}
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev)
                next.add(tile.textureId)
                return next
              })
            }
          />
        )
      })}
    </>
  )
}
