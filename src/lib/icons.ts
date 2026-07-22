import { ASSET_BASE } from './adapter'

export function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}
