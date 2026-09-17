import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapConfig, useMapRegionList } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import RegionPicker from './RegionPicker'
import MapCanvas from './MapCanvas'
import LayerPanel from './LayerPanel'
import MarkerPanel from './MarkerPanel'

export default function MapViewerPage() {
  const { t } = useI18n()
  const { data: groups, loading: listLoading } = useMapRegionList()
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null)
  const { data: mapData, error } = useMapConfig(currentLevelId)
  const [activeTier, setActiveTier] = useState<number | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const initializedLevel = useRef<string | null>(null)

  useEffect(() => {
    if (currentLevelId || !groups || groups.length === 0) return
    const first = groups[0].regions[0]
    if (first) setCurrentLevelId(first.levelId)
  }, [groups, currentLevelId])

  useEffect(() => {
    if (!mapData || !currentLevelId || initializedLevel.current === currentLevelId) return
    initializedLevel.current = currentLevelId
    setActiveTier(null)
    setHiddenKeys(new Set(mapData.markers.filter((marker) => !marker.defaultVisible).map((marker) => marker.typeKey)))
  }, [mapData, currentLevelId])

  const regionIds = useMemo(
    () => new Set((groups ?? []).flatMap((group) => group.regions.map((region) => region.levelId))),
    [groups],
  )

  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const setMany = useCallback((keys: string[], visible: boolean) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (visible) next.delete(key)
        else next.add(key)
      }
      return next
    })
  }, [])

  const unavailable = !!error || (!!mapData && mapData.config.chunks.h.length === 0)
  const activeTierName = activeTier !== null ? mapData?.tiers.find((tier) => tier.tierId === activeTier)?.name : null

  return (
    <div className="flex-1 min-h-0 flex">
      <RegionPicker
        groups={groups}
        loading={listLoading}
        currentLevelId={currentLevelId}
        onSelect={setCurrentLevelId}
      />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
        {unavailable ? (
          <div className="flex-1 flex items-center justify-center text-sm text-archive-dust" data-testid="map-unavailable">
            {t('map.unavailable')}
          </div>
        ) : mapData ? (
          <>
            <MapCanvas
              config={mapData.config}
              markers={mapData.markers}
              regionIds={regionIds}
              onSelectRegion={setCurrentLevelId}
              hiddenKeys={hiddenKeys}
              activeTier={activeTier}
            />
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
              <LayerPanel tiers={mapData.tiers} activeTier={activeTier} onSelect={setActiveTier} />
              <MarkerPanel markers={mapData.markers} hiddenKeys={hiddenKeys} onToggle={toggleKey} onSetMany={setMany} />
            </div>
            {activeTierName && (
              <div className="absolute top-4 left-4 z-10 rounded border border-archive-border bg-archive-file/95 px-3 py-1 text-xs text-archive-gold shadow-lg" data-testid="active-layer-badge">
                {activeTierName}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1" data-testid="map-loading" />
        )}
      </div>
    </div>
  )
}
