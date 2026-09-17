import { useMemo, useState } from 'react'
import { STATIC_KIND_KEYS } from '../../lib/map/mapConfig'
import type { MapMarker, MapMarkerKind } from '../../lib/map/mapConfig'
import { useI18n } from '../../i18n'

interface MarkerPanelProps {
  markers: MapMarker[]
  hiddenKeys: Set<string>
  onToggle: (key: string) => void
  onSetMany: (keys: string[], visible: boolean) => void
}

interface PanelItem {
  key: string
  label: string
  icon?: string
}

interface PanelGroup {
  id: string
  label: string
  sortId: number
  items: PanelItem[]
}

export default function MarkerPanel({ markers, hiddenKeys, onToggle, onSetMany }: MarkerPanelProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  const groups = useMemo<PanelGroup[]>(() => {
    const result: PanelGroup[] = []
    const staticItems = new Map<string, PanelItem>()
    const poiGroups = new Map<string, PanelGroup>()

    for (const marker of markers) {
      if (marker.kind === 'poi') {
        const groupId = marker.categoryId !== null && marker.categoryId !== undefined ? String(marker.categoryId) : '__other__'
        if (!poiGroups.has(groupId)) {
          poiGroups.set(groupId, {
            id: groupId,
            label: marker.categoryName || t('map.markerGroupOther'),
            sortId: marker.categorySortId ?? 999,
            items: [],
          })
        }
        const group = poiGroups.get(groupId)!
        if (!group.items.some((item) => item.key === marker.typeKey)) {
          group.items.push({ key: marker.typeKey, label: marker.typeLabel || marker.label || marker.typeKey, icon: marker.icon })
        }
      } else {
        const kind = marker.kind as Exclude<MapMarkerKind, 'poi'>
        const key = STATIC_KIND_KEYS[kind]
        if (!staticItems.has(marker.typeKey)) {
          staticItems.set(marker.typeKey, { key: marker.typeKey, label: key ? t(key) : marker.typeKey })
        }
      }
    }

    if (staticItems.size > 0) {
      result.push({ id: '__static__', label: t('map.markerGroupElements'), sortId: -1, items: [...staticItems.values()] })
    }
    result.push(...[...poiGroups.values()].sort((a, b) => a.sortId - b.sortId))
    return result
  }, [markers, t])

  if (groups.length === 0) return null

  return (
    <div className="rounded border border-archive-border bg-archive-file/95 shadow-lg backdrop-blur w-52" data-testid="marker-panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full px-3 py-1.5 text-xs font-medium tracking-wider text-archive-dust uppercase text-left hover:text-archive-ivory"
      >
        {t('map.markerPanelTitle')}
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-2 max-h-72 overflow-y-auto">
          {groups.map((group) => {
            const keys = group.items.map((item) => item.key)
            const allVisible = keys.every((key) => !hiddenKeys.has(key))
            return (
              <div key={group.id}>
                <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                  <span className="text-[11px] text-archive-dust">{group.label}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      data-testid="marker-group-all"
                      onClick={() => onSetMany(keys, true)}
                      className={`text-[10px] ${allVisible ? 'text-archive-lead' : 'text-archive-gold hover:underline'}`}
                    >
                      {t('map.markerSelectAll')}
                    </button>
                    <button
                      type="button"
                      data-testid="marker-group-none"
                      onClick={() => onSetMany(keys, false)}
                      className={`text-[10px] ${allVisible ? 'text-archive-gold hover:underline' : 'text-archive-lead'}`}
                    >
                      {t('map.markerClear')}
                    </button>
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const visible = !hiddenKeys.has(item.key)
                    return (
                      <label key={item.key} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-archive-border cursor-pointer">
                        <input
                          type="checkbox"
                          data-testid="marker-toggle"
                          data-type-key={item.key}
                          checked={visible}
                          onChange={() => onToggle(item.key)}
                          className="accent-archive-gold"
                        />
                        {item.icon && <img src={item.icon} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />}
                        <span className="text-xs text-archive-ivory truncate">{item.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
