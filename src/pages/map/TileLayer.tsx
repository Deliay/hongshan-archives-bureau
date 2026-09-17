import { useMemo, useState } from 'react'
import { chunkRect, tileUrl, visibleChunks } from '../../lib/map/mapConfig'
import type { LevelMapConfig, MapLod, MapView } from '../../lib/map/mapConfig'

interface TileLayerProps {
  levelId: string
  config: LevelMapConfig
  lod: MapLod
  view: MapView
  viewport: { width: number; height: number }
}

export default function TileLayer({ levelId, config, lod, view, viewport }: TileLayerProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const chunks = useMemo(
    () => visibleChunks(config.chunks[lod], config, lod, view, viewport),
    [config, lod, view, viewport],
  )

  return (
    <>
      {chunks.map((chunk) => {
        if (failed.has(chunk.chunkId)) return null
        const rect = chunkRect(config, chunk)
        return (
          <img
            key={chunk.chunkId}
            src={tileUrl(levelId, chunk.chunkId)}
            alt=""
            draggable={false}
            className="absolute select-none pointer-events-none max-w-none"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev)
                next.add(chunk.chunkId)
                return next
              })
            }
          />
        )
      })}
    </>
  )
}
