/**
 * 区域自然资源上限（单位：个/分钟）。
 * 区域列表即该区域全部可采资源：未列出的自然资源在该区域不可采集（上限 0），
 * 需求需改走配方路线；液体泵采（酸/水）不受区域限制。
 */
export interface FactoryRegion {
  id: string
  /** i18n key（factory.* 命名空间） */
  nameKey: string
  /** itemId → 区域采集上限（/min） */
  caps: Record<string, number>
}

export const FACTORY_REGIONS: FactoryRegion[] = [
  {
    id: 'wuling',
    nameKey: 'factory.regionWuling',
    caps: {
      item_gas_xiranite: 100, // 息壤气
      item_gas_inert: 460, // 惰气
      item_originium_ore: 540, // 源矿
      item_iron_ore: 120, // 蓝铁矿
      item_copper_ore: 420, // 赤铜矿
    },
  },
  {
    id: 'valley4',
    nameKey: 'factory.regionValley4',
    caps: {
      item_originium_ore: 560, // 源矿
      item_quartz_sand: 240, // 紫晶矿
      item_iron_ore: 1080, // 蓝铁矿
    },
  },
]

export const DEFAULT_REGION_ID = 'wuling'

export function getFactoryRegion(id: string | null | undefined): FactoryRegion | undefined {
  return FACTORY_REGIONS.find(r => r.id === id)
}
