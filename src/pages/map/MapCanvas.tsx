import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { canvasSize, clampView, fitView, pickLod, tierMaskCells, zoomAt } from '../../lib/map/mapConfig'
import type { LevelMapConfig, MapLod, MapMarker, MapView } from '../../lib/map/mapConfig'
import TileLayer from './TileLayer'
import MarkerLayer from './MarkerLayer'
import ZoomControls from './ZoomControls'

interface MapCanvasProps {
  config: LevelMapConfig
  markers: MapMarker[]
  regionIds: Set<string>
  onSelectRegion: (levelId: string) => void
  hiddenKeys: Set<string>
  activeTier: number | null
}

const WHEEL_SENSITIVITY = 0.0015
const BUTTON_ZOOM = 1.25
const DOUBLE_CLICK_ZOOM = 1.5
const PREV_LOD_MS = 300

export default function MapCanvas({ config, markers, regionIds, onSelectRegion, hiddenKeys, activeTier }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const fittedRef = useRef<string | null>(null)
  const prevLodRef = useRef<MapLod | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<MapView>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [prevLod, setPrevLod] = useState<MapLod | null>(null)
  const [dragging, setDragging] = useState(false)

  const canvas = useMemo(() => canvasSize(config), [config])
  const fitScale = useMemo(
    () => fitView(canvas.width, canvas.height, viewport.width, viewport.height).scale,
    [canvas.width, canvas.height, viewport.width, viewport.height],
  )
  const minScale = Math.min(fitScale, 1)
  const maxScale = Math.max(1, fitScale)

  const applyClamp = useCallback(
    (next: MapView) => clampView(next, canvas.width, canvas.height, viewport.width, viewport.height),
    [canvas.width, canvas.height, viewport.width, viewport.height],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setViewport({ width: el.clientWidth, height: el.clientHeight })
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setViewport({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!viewport.width || !viewport.height) return
    if (fittedRef.current !== config.levelId) {
      fittedRef.current = config.levelId
      setView(fitView(canvas.width, canvas.height, viewport.width, viewport.height))
    } else {
      setView((v) => clampView(v, canvas.width, canvas.height, viewport.width, viewport.height))
    }
  }, [config.levelId, canvas.width, canvas.height, viewport.width, viewport.height])

  const lod = pickLod(view.scale)

  useEffect(() => {
    const previous = prevLodRef.current
    prevLodRef.current = lod
    if (previous && previous !== lod) {
      setPrevLod(previous)
      const timer = setTimeout(() => setPrevLod(null), PREV_LOD_MS)
      return () => clearTimeout(timer)
    }
  }, [lod])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      setView((v) => {
        const next = Math.min(maxScale, Math.max(minScale, v.scale * Math.exp(-event.deltaY * WHEEL_SENSITIVITY)))
        return applyClamp(zoomAt(v, next, px, py))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyClamp, minScale, maxScale])

  const zoomBy = (factor: number) => {
    setView((v) => {
      const next = Math.min(maxScale, Math.max(minScale, v.scale * factor))
      return applyClamp(zoomAt(v, next, viewport.width / 2, viewport.height / 2))
    })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, offsetX: view.offsetX, offsetY: view.offsetY }
    setDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    setView((v) => applyClamp({ scale: v.scale, offsetX: drag.offsetX + dx, offsetY: drag.offsetY + dy }))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    setView((v) => {
      const next = Math.min(maxScale, Math.max(minScale, v.scale * DOUBLE_CLICK_ZOOM))
      return applyClamp(zoomAt(v, next, px, py))
    })
  }

  return (
    <div
      ref={containerRef}
      data-testid="map-canvas"
      className={`relative flex-1 min-w-0 min-h-0 overflow-hidden bg-archive-ink select-none touch-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div
        data-testid="map-plane"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: canvas.width,
          height: canvas.height,
          transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {prevLod && prevLod !== lod && (
          <TileLayer key={prevLod} levelId={config.levelId} config={config} lod={prevLod} view={view} viewport={viewport} />
        )}
        <TileLayer key={lod} levelId={config.levelId} config={config} lod={lod} view={view} viewport={viewport} />
        {activeTier !== null && tierMaskCells(config, activeTier).map((cell, index) => (
          <div
            key={index}
            className="absolute bg-archive-ink/70 pointer-events-none"
            style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height }}
          />
        ))}
        <MarkerLayer
          markers={markers}
          scale={view.scale}
          regionIds={regionIds}
          onSelectRegion={onSelectRegion}
          hiddenKeys={hiddenKeys}
          activeTier={activeTier}
        />
      </div>
      <ZoomControls onZoomIn={() => zoomBy(BUTTON_ZOOM)} onZoomOut={() => zoomBy(1 / BUTTON_ZOOM)} onFit={() => setView(fitView(canvas.width, canvas.height, viewport.width, viewport.height))} />
    </div>
  )
}
