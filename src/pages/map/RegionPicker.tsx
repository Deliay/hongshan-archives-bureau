import { useI18n } from '../../i18n'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import type { MapRegionGroup } from '../../hooks/useData'

interface RegionPickerProps {
  groups: MapRegionGroup[] | null
  loading: boolean
  currentLevelId: string | null
  onSelect: (levelId: string) => void
}

export default function RegionPicker({ groups, loading, currentLevelId, onSelect }: RegionPickerProps) {
  const { t } = useI18n()
  return (
    <div className="w-60 shrink-0 overflow-y-auto border-r border-archive-border bg-archive-file">
      {loading || !groups ? (
        <div className="p-3">
          <ListSkeleton filters={0} cards={6} />
        </div>
      ) : (
        <div className="p-2 space-y-4">
          {groups.map((group) => (
            <div key={group.mapId ?? '__other__'}>
              <div className="px-2 py-1 text-xs font-medium tracking-wider text-archive-dust uppercase" data-testid="map-region-group">
                {group.mapId ? group.name : t('map.groupOther')}
              </div>
              <div className="mt-1 space-y-0.5">
                {group.regions.map((region) => {
                  const active = region.levelId === currentLevelId
                  return (
                    <button
                      key={region.levelId}
                      type="button"
                      data-testid="map-region-item"
                      data-level-id={region.levelId}
                      onClick={() => onSelect(region.levelId)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors border ${
                        active
                          ? 'text-archive-gold bg-archive-gold/10 border-archive-gold'
                          : 'text-archive-dust border-transparent hover:text-archive-ivory hover:bg-archive-border'
                      }`}
                    >
                      {region.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
