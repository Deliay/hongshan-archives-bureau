import { describe, it, expect } from 'vitest'
import { parseActivityTime, getActivityGroup, getActivityStatus, adaptActivity } from '../adapter'
import type { ActivityTimeRange } from '../types'

describe('parseActivityTime', () => {
  it('should parse zero-padded datetime as UTC+8', () => {
    expect(parseActivityTime('2025/12/09 04:00:00')).toBe(Date.UTC(2025, 11, 8, 20, 0, 0))
  })

  it('should parse non-padded datetime', () => {
    expect(parseActivityTime('2025/12/9 4:00:00')).toBe(Date.UTC(2025, 11, 8, 20, 0, 0))
  })

  it('should parse sample from TimeRangeTable', () => {
    expect(parseActivityTime('2026/2/7 12:00:00')).toBe(Date.UTC(2026, 1, 7, 4, 0, 0))
  })

  it('should convert UTC+8 noon to UTC 04:00', () => {
    expect(parseActivityTime('2026/1/15 12:30:45')).toBe(Date.UTC(2026, 0, 15, 4, 30, 45))
  })

  it('should handle hour crossing to previous UTC day', () => {
    expect(parseActivityTime('2026/3/1 0:00:00')).toBe(Date.UTC(2026, 1, 28, 16, 0, 0))
  })

  it('should return null for empty string', () => {
    expect(parseActivityTime('')).toBeNull()
  })

  it('should return null for non-matching string', () => {
    expect(parseActivityTime('not a date')).toBeNull()
  })

  it('should return null for timestamp-like input', () => {
    expect(parseActivityTime('1733203200000')).toBeNull()
  })
})

describe('getActivityGroup', () => {
  it('should map known types to groups', () => {
    expect(getActivityGroup(2)).toBe('checkin')
    expect(getActivityGroup(7)).toBe('challenge')
    expect(getActivityGroup(8)).toBe('challenge')
    expect(getActivityGroup(17)).toBe('challenge')
    expect(getActivityGroup(9)).toBe('trial')
    expect(getActivityGroup(1)).toBe('welfare')
    expect(getActivityGroup(3)).toBe('welfare')
    expect(getActivityGroup(5)).toBe('welfare')
    expect(getActivityGroup(16)).toBe('welfare')
    expect(getActivityGroup(11)).toBe('reflow')
    expect(getActivityGroup(13)).toBe('guide')
  })

  it('should fallback unknown types to other', () => {
    expect(getActivityGroup(4)).toBe('other')
    expect(getActivityGroup(45)).toBe('other')
    expect(getActivityGroup(0)).toBe('other')
    expect(getActivityGroup(999)).toBe('other')
  })
})

describe('getActivityStatus', () => {
  const now = Date.UTC(2026, 0, 15, 4, 0, 0)

  it('should return unknown for empty ranges', () => {
    expect(getActivityStatus([], now)).toBe('unknown')
  })

  it('should return ongoing when a range covers now', () => {
    const ranges: ActivityTimeRange[] = [{ openTime: now - 1000, closeTime: now + 1000 }]
    expect(getActivityStatus(ranges, now)).toBe('ongoing')
  })

  it('should return permanent for permanent range already open', () => {
    const ranges: ActivityTimeRange[] = [{ openTime: now - 1000, closeTime: null }]
    expect(getActivityStatus(ranges, now)).toBe('permanent')
  })

  it('should return ongoing when openTime equals now', () => {
    const ranges: ActivityTimeRange[] = [{ openTime: now, closeTime: now + 1000 }]
    expect(getActivityStatus(ranges, now)).toBe('ongoing')
  })

  it('should not be ongoing when now equals closeTime', () => {
    const ranges: ActivityTimeRange[] = [{ openTime: now - 2000, closeTime: now }]
    expect(getActivityStatus(ranges, now)).toBe('expired')
  })

  it('should return permanent for not-yet-open permanent range', () => {
    const ranges: ActivityTimeRange[] = [{ openTime: now + 1000, closeTime: null }]
    expect(getActivityStatus(ranges, now)).toBe('permanent')
  })

  it('should prefer permanent over ongoing', () => {
    const ranges: ActivityTimeRange[] = [
      { openTime: now + 1000, closeTime: null },
      { openTime: now - 1000, closeTime: now + 500 },
    ]
    expect(getActivityStatus(ranges, now)).toBe('permanent')
  })

  it('should return upcoming when all ranges open in the future', () => {
    const ranges: ActivityTimeRange[] = [
      { openTime: now + 1000, closeTime: now + 2000 },
      { openTime: now + 3000, closeTime: now + 4000 },
    ]
    expect(getActivityStatus(ranges, now)).toBe('upcoming')
  })

  it('should return expired when all ranges closed', () => {
    const ranges: ActivityTimeRange[] = [
      { openTime: now - 4000, closeTime: now - 3000 },
      { openTime: now - 2000, closeTime: now - 1000 },
    ]
    expect(getActivityStatus(ranges, now)).toBe('expired')
  })

  it('should prefer upcoming over expired when mixed', () => {
    const ranges: ActivityTimeRange[] = [
      { openTime: now - 4000, closeTime: now - 3000 },
      { openTime: now + 1000, closeTime: now + 2000 },
    ]
    expect(getActivityStatus(ranges, now)).toBe('upcoming')
  })
})

describe('adaptActivity', () => {
  const i18nMap: Record<string, string> = {
    '100': '签到活动',
    '200': '每日签到领取奖励',
  }
  const tagNameMap: Record<string, string> = {
    activity_tag_checkin_time: '限时签到',
  }

  const raw = {
    id: 'activity_checkin_laevat',
    name: { id: '100', text: '' },
    desc: { id: '200', text: '' },
    type: 2,
    timeId: 'time_special_1_0_1',
    tagIds: ['activity_tag_checkin_time'],
    tabImg: 'bg_activity_tab_char_sign_laevat',
    tabImgColor: '#ea0235',
    sortId: 8300,
  }

  const timeRaw = {
    timeRangeList: [
      { openTime: '2025/12/9 4:00:00', closeTime: '2026/2/7 12:00:00' },
      { openTime: '2025/12/9 4:00:00', closeTime: '2026/2/7 12:00:00' },
      { openTime: '2025/12/9 4:00:00', closeTime: '2026/2/7 12:00:00' },
    ],
  }

  it('should resolve name and desc via i18n', () => {
    const result = adaptActivity(raw, timeRaw, i18nMap, tagNameMap)
    expect(result.name).toBe('签到活动')
    expect(result.desc).toBe('每日签到领取奖励')
  })

  it('should dedupe repeated time ranges', () => {
    const result = adaptActivity(raw, timeRaw, i18nMap, tagNameMap)
    expect(result.timeRanges).toHaveLength(1)
    expect(result.timeRanges[0]).toEqual({
      openTime: Date.UTC(2025, 11, 8, 20, 0, 0),
      closeTime: Date.UTC(2026, 1, 7, 4, 0, 0),
    })
  })

  it('should sort multiple ranges by openTime ascending', () => {
    const multi = {
      timeRangeList: [
        { openTime: '2026/3/1 4:00:00', closeTime: '2026/3/10 12:00:00' },
        { openTime: '2026/1/1 4:00:00', closeTime: '2026/1/10 12:00:00' },
      ],
    }
    const result = adaptActivity(raw, multi, i18nMap, tagNameMap)
    expect(result.timeRanges[0].openTime).toBeLessThan(result.timeRanges[1].openTime)
  })

  it('should parse permanent activity with empty closeTime', () => {
    const permanent = { timeRangeList: [{ openTime: '2026/1/1 4:00:00', closeTime: '' }] }
    const result = adaptActivity(raw, permanent, i18nMap, tagNameMap)
    expect(result.timeRanges[0].closeTime).toBeNull()
  })

  it('should compute group from type', () => {
    const result = adaptActivity(raw, timeRaw, i18nMap, tagNameMap)
    expect(result.group).toBe('checkin')
  })

  it('should fallback group to other for unknown type', () => {
    const result = adaptActivity({ ...raw, type: 42 }, timeRaw, i18nMap, tagNameMap)
    expect(result.group).toBe('other')
  })

  it('should build full tabImg URL', () => {
    const result = adaptActivity(raw, timeRaw, i18nMap, tagNameMap)
    expect(result.tabImg).toBe(
      'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/activity/bg_activity_tab_char_sign_laevat.png',
    )
  })

  it('should resolve tag names via tagNameMap', () => {
    const result = adaptActivity(raw, timeRaw, i18nMap, tagNameMap)
    expect(result.tags).toEqual(['限时签到'])
  })

  it('should fallback tag to raw id when unmapped', () => {
    const result = adaptActivity({ ...raw, tagIds: ['activity_tag_unknown'] }, timeRaw, i18nMap, tagNameMap)
    expect(result.tags).toEqual(['activity_tag_unknown'])
  })

  it('should return unknown status when time range data missing', () => {
    const result = adaptActivity(raw, undefined, i18nMap, tagNameMap)
    expect(result.timeRanges).toEqual([])
    expect(result.status).toBe('unknown')
  })

  it('should handle missing optional fields gracefully', () => {
    const result = adaptActivity({ id: 'a1' }, undefined)
    expect(result.id).toBe('a1')
    expect(result.name).toBe('a1')
    expect(result.desc).toBe('')
    expect(result.group).toBe('other')
    expect(result.tags).toEqual([])
    expect(result.tabImg).toBe('')
    expect(result.tabImgColor).toBe('')
    expect(result.sortId).toBe(0)
  })
})
