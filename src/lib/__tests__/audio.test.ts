import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAudioUrl, checkAudioUrl, clearAudioUrlCache } from '../audio'

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

describe('checkAudioUrl', () => {
  const url = 'https://endfield-assets.fffdan.com/audios/dialogs/vo/chinese/au_dlg_e1m3_6_001'

  beforeEach(() => {
    vi.restoreAllMocks()
    clearAudioUrlCache()
  })

  it('returns true when HEAD responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    await expect(checkAudioUrl(url)).resolves.toBe(true)
  })

  it('returns false when HEAD responds not-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(checkAudioUrl(url)).resolves.toBe(false)
  })

  it('returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    await expect(checkAudioUrl(url)).resolves.toBe(false)
  })

  it('caches result per url (single fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await checkAudioUrl(url)
    await checkAudioUrl(url)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
