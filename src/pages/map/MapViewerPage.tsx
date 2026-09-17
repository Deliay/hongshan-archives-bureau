import { useEffect, useMemo, useState } from 'react'
import { useMapConfig, useMapRegionList } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import RegionPicker from './RegionPicker'
import MapCanvas from './MapCanvas'

export default function MapViewerPage() {
  const { t } = useI18n()
  const { data: groups, loading: listLoading } = useMapRegionList()
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null)
  const { data: mapData, error } = useMapConfig(currentLevelId)

  useEffect(() => {
    if (currentLevelId || !groups || groups.length === 0) return
    const first = groups[0].regions[0]
    if (first) setCurrentLevelId(first.levelId)
  }, [groups, currentLevelId])

  const regionIds = useMemo(
    () => new Set((groups ?? []).flatMap((group) => group.regions.map((region) => region.levelId))),
    [groups],
  )

  const unavailable = !!error || (!!mapData && mapData.config.chunks.h.length === 0)

  return (
    <div className="flex-1 min-h-0 flex">
      <RegionPicker
        groups={groups}
        loading={listLoading}
        currentLevelId={currentLevelId}
        onSelect={setCurrentLevelId}
      />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {unavailable ? (
          <div className="flex-1 flex items-center justify-center text-sm text-archive-dust" data-testid="map-unavailable">
            {t('map.unavailable')}
          </div>
        ) : mapData ? (
          <MapCanvas
            config={mapData.config}
            markers={mapData.markers}
            regionIds={regionIds}
            onSelectRegion={setCurrentLevelId}
          />
        ) : (
          <div className="flex-1" data-testid="map-loading" />
        )}
      </div>
    </div>
  )
}
