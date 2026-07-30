import { describe, it, expect } from 'vitest'
import { getAudioUrl } from '../audio'

describe('getAudioUrl', () => {
  it('should build chinese URL for CN locale', () => {
    expect(getAudioUrl('vo_001', 'CN')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001',
    )
  })

  it('should build chinese URL for TC locale', () => {
    expect(getAudioUrl('vo_001', 'TC')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/vo_001',
    )
  })

  it('should build english URL for EN locale', () => {
    expect(getAudioUrl('vo_001', 'EN')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
  })

  it('should build japanese URL for JP locale', () => {
    expect(getAudioUrl('vo_001', 'JP')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/japanese/vo_001',
    )
  })

  it('should build korean URL for KR locale', () => {
    expect(getAudioUrl('vo_001', 'KR')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/korean/vo_001',
    )
  })

  it('should fallback to english for unknown locale', () => {
    expect(getAudioUrl('vo_001', 'RU')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
    expect(getAudioUrl('vo_001', 'DE')).toBe(
      'https://endfield-assets.fffdan.com/audios/dialogs/vo/english/vo_001',
    )
  })
})
