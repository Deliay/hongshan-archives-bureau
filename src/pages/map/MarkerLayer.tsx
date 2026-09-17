import type { ReactNode } from 'react'
import { LOD_ORDER, MARKER_MIN_LOD, pickLod, staticElementImageUrl } from '../../lib/map/mapConfig'
import type { MapMarker, MapMarkerKind } from '../../lib/map/mapConfig'
import { useI18n } from '../../i18n'
import StrokedText from './StrokedText'

interface MarkerLayerProps {
  markers: MapMarker[]
  scale: number
  regionIds: Set<string>
  onSelectRegion: (levelId: string) => void
  hiddenKeys: Set<string>
  activeTier: number | null
}

function PlaceName({ marker }: { marker: MapMarker }) {
  if (!marker.label) {
    return <span className="block w-1.5 h-1.5 rounded-full bg-archive-ivory/60" />
  }
  return <StrokedText text={marker.label} className="text-sm font-semibold text-archive-ivory" />
}

function Dot({ className }: { className: string }) {
  return <span className={`block w-2 h-2 rounded-full border ${className}`} />
}

function ArrowIcon({ kind }: { kind: MapMarkerKind }) {
  const double = kind === 'tier-switch'
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {double ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l5 6H7l5-6z" fill="currentColor" />
      )}
    </svg>
  )
}

function MarkerIcon({ marker }: { marker: MapMarker }) {
  if (marker.icon) {
    return (
      <img
        src={marker.icon}
        alt=""
        draggable={false}
        className="w-6 h-6 object-contain select-none pointer-events-none max-w-none"
        onError={(event) => { (event.target as HTMLImageElement).style.visibility = 'hidden' }}
      />
    )
  }
  return <Dot className="border-archive-gold bg-archive-gold/40" />
}

export default function MarkerLayer({ markers, scale, regionIds, onSelectRegion, hiddenKeys, activeTier }: MarkerLayerProps) {
  const { t } = useI18n()
  const lod = pickLod(scale)
  const visible = markers.filter((marker) => {
    if (hiddenKeys.has(marker.typeKey)) return false
    if (LOD_ORDER[lod] < LOD_ORDER[MARKER_MIN_LOD[marker.kind]]) return false
    if (activeTier !== null && marker.tierId !== 0 && marker.tierId !== activeTier) return false
    return true
  })

  return (
    <>
      {visible.map((marker) => {
        const clickable = marker.kind === 'level-entrance' && !!marker.targetLevelId && regionIds.has(marker.targetLevelId)
        let visual: ReactNode
        if (marker.kind === 'place-name') {
          visual = <PlaceName marker={marker} />
        } else if (marker.kind === 'settlement') {
          visual = (
            <span className="flex flex-col items-center gap-0.5">
              {marker.label && <StrokedText text={marker.label} className="text-xs font-medium text-archive-bronze" />}
              <span className="block w-2.5 h-2.5 rounded-sm rotate-45 bg-archive-bronze border border-archive-ivory/70" />
            </span>
          )
        } else if (marker.kind === 'poi') {
          visual = <MarkerIcon marker={marker} />
        } else if (marker.kind === 'static-image') {
          visual = marker.imagePath ? (
            <img
              src={staticElementImageUrl(marker.imagePath)}
              alt=""
              draggable={false}
              className="w-16 h-16 object-contain select-none pointer-events-none max-w-none opacity-80"
              onError={(event) => { (event.target as HTMLImageElement).style.visibility = 'hidden' }}
            />
          ) : (
            <Dot className="border-archive-bronze bg-archive-bronze/30" />
          )
        } else if (marker.kind === 'region') {
          visual = <Dot className="border-archive-lead bg-archive-lead/30" />
        } else {
          visual = (
            <span
              className={`block ${clickable ? 'text-archive-gold' : 'text-archive-dust'}`}
              style={marker.directionAngle ? { transform: `rotate(${marker.directionAngle}deg)` } : undefined}
            >
              <ArrowIcon kind={marker.kind} />
            </span>
          )
        }

        const tooltip = marker.kind === 'level-entrance' && marker.label
          ? t('map.gotoRegion', { name: marker.label })
          : (marker.kind === 'poi' || marker.kind === 'tier-switch' || marker.kind === 'static-image') && (marker.label || marker.typeLabel)
            ? marker.label || marker.typeLabel
            : undefined

        const centered = marker.kind === 'poi' || marker.kind === 'static-image'
        const content = (
          <span className="relative flex flex-col items-center group">
            {visual}
            {tooltip && (
              <span className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded border border-archive-border bg-archive-file px-2 py-0.5 text-[11px] text-archive-ivory shadow-lg">
                {tooltip}
              </span>
            )}
          </span>
        )

        return (
          <div
            key={marker.id}
            data-testid="map-marker"
            data-kind={marker.kind}
            data-level-id={marker.targetLevelId ?? ''}
            data-type-key={marker.typeKey}
            data-tier-id={marker.tierId}
            style={{ position: 'absolute', left: marker.canvas.x, top: marker.canvas.y, width: 0, height: 0 }}
          >
            <div style={{ transform: `scale(${1 / scale})`, transformOrigin: '0 0' }}>
              <div style={{ transform: centered ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)' }}>
                {clickable ? (
                  <button
                    type="button"
                    title={tooltip}
                    onClick={() => onSelectRegion(marker.targetLevelId!)}
                    className="cursor-pointer hover:opacity-80"
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}
