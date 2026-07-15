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

export const WEAPON_TYPE_KEYS: Record<number, string> = {
  1: 'LUA_WEAPON_TYPE_1',
  2: 'LUA_WEAPON_TYPE_2',
  3: 'LUA_WEAPON_TYPE_3',
  5: 'LUA_WEAPON_TYPE_5',
  6: 'LUA_WEAPON_TYPE_6',
}
