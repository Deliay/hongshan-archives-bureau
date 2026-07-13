export const PROFESSION_MAP: Record<number, string> = {
  0: '近卫',
  2: '重装',
  4: '辅助',
  5: '术师',
  7: '先锋',
  8: '突击',
}

export const ELEMENT_MAP: Record<string, { name: string; color: string }> = {
  Cryst:    { name: '寒冷', color: '#21C6D0' },
  Fire:     { name: '灼热', color: '#FF623D' },
  Pulse:    { name: '电磁', color: '#FFC000' },
  Natural:  { name: '自然', color: '#9EDC23' },
  Physical: { name: '物理', color: '#888888' },
}

export const RARITY_STARS: Record<number, number> = {
  0: 3,
  1: 4,
  2: 5,
}

export function inferWeaponType(id: string): string {
  if (id.includes('sword')) return '剑'
  if (id.includes('claym')) return '大剑'
  if (id.includes('lance')) return '长枪'
  if (id.includes('pistol')) return '手枪'
  if (id.includes('funnel')) return '浮游单元'
  return '未知'
}
