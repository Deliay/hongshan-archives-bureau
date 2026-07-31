import { describe, it, expect } from 'vitest'
import {
  adaptRecapScene,
  adaptRecapFallbackScene,
  adaptRecapChapter,
  adaptPrtsCategory,
  adaptPrtsVolume,
  adaptPrtsItem,
  adaptBakerChat,
  adaptBakerMessage,
  resolveContentType,
  getSpriteUrl,
  type BakerSpeakerContext,
} from '../adapter'

describe('adaptRecapScene', () => {
  const i18nMap = { '100': '你与佩丽卡准备前往基地。' }

  it('parses standard key dlg_e1m3_4', () => {
    const result = adaptRecapScene('dlg_e1m3_4', 'summary_1', { id: 100 }, i18nMap, '场')
    expect(result).not.toBeNull()
    expect(result!.chapterType).toBe('e')
    expect(result!.chapterId).toBe('e1')
    expect(result!.missionId).toBe('e1m3')
    expect(result!.sceneNo).toBe(4)
    expect(result!.sceneSub).toBe(0)
    expect(result!.code).toBe('E1·M3·场04')
    expect(result!.text).toBe('你与佩丽卡准备前往基地。')
  })

  it('parses l-segment key dlg_sm2l4m5_9', () => {
    const result = adaptRecapScene('dlg_sm2l4m5_9', 'summary_2', { id: 100 }, i18nMap, '场')
    expect(result).not.toBeNull()
    expect(result!.chapterType).toBe('sm')
    expect(result!.chapterId).toBe('sm2')
    expect(result!.missionId).toBe('sm2l4m5')
    expect(result!.sceneNo).toBe(9)
  })

  it('parses m-sub key dlg_a1m8d1_1', () => {
    const result = adaptRecapScene('dlg_a1m8d1_1', 'summary_3', { id: 100 }, i18nMap, '场')
    expect(result).not.toBeNull()
    expect(result!.chapterType).toBe('a')
    expect(result!.missionId).toBe('a1m8d1')
    expect(result!.sceneNo).toBe(1)
  })

  it('parses scene-sub key dlg_e1m1_4d2', () => {
    const result = adaptRecapScene('dlg_e1m1_4d2', 'summary_4', { id: 100 }, i18nMap, '场')
    expect(result).not.toBeNull()
    expect(result!.sceneNo).toBe(4)
    expect(result!.sceneSub).toBe(2)
    expect(result!.code).toBe('E1·M1·场04d2')
  })

  it('returns null for unrecognized key', () => {
    const result = adaptRecapScene('unknown_key', 'summary_5', { id: 100 }, i18nMap, '场')
    expect(result).toBeNull()
  })
})

describe('adaptRecapFallbackScene', () => {
  it('creates other-group scene for unrecognized key', () => {
    const result = adaptRecapFallbackScene('bad_key', 'summary_6', { id: 100, text: 'fallback' }, undefined, '场')
    expect(result.chapterType).toBe('other')
    expect(result.chapterId).toBe('other')
    expect(result.code).toContain('bad_key')
  })
})

describe('adaptRecapChapter', () => {
  it('sorts by numeric tuple (e10 after e2, scene 10 after scene 4)', () => {
    const scenes = [
      { id: '1', dlgId: 'dlg_e2m1_4', chapterId: 'e2', missionId: 'e2m1', sceneNo: 4, sceneSub: 0, chapterType: 'e', code: '', text: '' },
      { id: '2', dlgId: 'dlg_e10m1_1', chapterId: 'e10', missionId: 'e10m1', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
      { id: '3', dlgId: 'dlg_e2m1_10', chapterId: 'e2', missionId: 'e2m1', sceneNo: 10, sceneSub: 0, chapterType: 'e', code: '', text: '' },
      { id: '4', dlgId: 'dlg_e2m1_1', chapterId: 'e2', missionId: 'e2m1', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
    ]
    const chapters = adaptRecapChapter(scenes)
    expect(chapters[0].chapterId).toBe('e2')
    expect(chapters[1].chapterId).toBe('e10')
    const e2Scenes = chapters[0].missions[0].scenes
    expect(e2Scenes.map(s => s.sceneNo)).toEqual([1, 4, 10])
  })

  it('groups by chapter then mission', () => {
    const scenes = [
      { id: '1', dlgId: 'dlg_e1m1_1', chapterId: 'e1', missionId: 'e1m1', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
      { id: '2', dlgId: 'dlg_e1m2_1', chapterId: 'e1', missionId: 'e1m2', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
    ]
    const chapters = adaptRecapChapter(scenes)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].missions).toHaveLength(2)
  })
})

describe('adaptPrtsCategory', () => {
  it('maps fields correctly', () => {
    const result = adaptPrtsCategory({ $key: 'paper', name: { id: 200, text: 'Paper' }, order: 2 }, { '200': '纸质记录' })
    expect(result.id).toBe('paper')
    expect(result.name).toBe('纸质记录')
    expect(result.order).toBe(2)
  })
})

describe('adaptPrtsVolume', () => {
  it('builds icon URL from icon field', () => {
    const result = adaptPrtsVolume({ $key: 'v1', categoryId: 'paper', icon: 'icon_test', name: { text: 'Vol1' }, subName: { text: '' }, order: 1, itemIds: ['a'] })
    expect(result.iconUrl).toContain('prts/icon/icon_test')
  })

  it('returns empty iconUrl when no icon', () => {
    const result = adaptPrtsVolume({ $key: 'v1', categoryId: 'paper', name: { text: 'Vol1' }, subName: { text: '' }, order: 1, itemIds: [] })
    expect(result.iconUrl).toBe('')
  })
})

describe('adaptPrtsItem', () => {
  it('maps type correctly', () => {
    expect(adaptPrtsItem({ $key: 'a', firstLvId: 'v1', type: 'text', name: { text: '' }, desc: { text: '' }, order: 0, contentId: 'c1' }).type).toBe('text')
    expect(adaptPrtsItem({ $key: 'b', firstLvId: 'v1', type: 'multi_media', name: { text: '' }, desc: { text: '' }, order: 0, contentId: 'c2' }).type).toBe('multi_media')
  })
})

describe('adaptBakerChat', () => {
  it('maps chatType 1→contact, 2→group, 3→operator', () => {
    expect(adaptBakerChat({ $key: 'a', chatType: 1, name: { text: '' } }).kind).toBe('contact')
    expect(adaptBakerChat({ $key: 'b', chatType: 2, name: { text: '' } }).kind).toBe('group')
    expect(adaptBakerChat({ $key: 'c', chatType: 3, name: { text: '' } }).kind).toBe('operator')
  })
})

describe('resolveContentType', () => {
  it('maps known types', () => {
    expect(resolveContentType(1)).toBe('text')
    expect(resolveContentType(2)).toBe('image')
    expect(resolveContentType(7)).toBe('system')
    expect(resolveContentType(10)).toBe('share')
    expect(resolveContentType(12)).toBe('mission')
  })
  it('returns null for unknown types', () => {
    expect(resolveContentType(4)).toBeNull()
    expect(resolveContentType(5)).toBeNull()
    expect(resolveContentType(99)).toBeNull()
  })
})

describe('adaptBakerMessage', () => {
  const ctx: BakerSpeakerContext = {
    chatMap: {
      'sns_chr_0013_aglina': { id: 'sns_chr_0013_aglina', kind: 'operator', name: 'Aglaia', iconUrl: 'http://icon', isSettlementChannel: false },
    },
    selfName: 'Me',
    selfIconUrl: 'http://self',
  }

  it('identifies self messages', () => {
    const msg = adaptBakerMessage('d1', 'c1', { contentType: 1, speaker: 'endmin', content: { text: 'hello' } }, ctx)
    expect(msg).not.toBeNull()
    expect(msg!.isSelf).toBe(true)
    expect(msg!.speakerName).toBe('Me')
  })

  it('resolves speaker from chatMap', () => {
    const msg = adaptBakerMessage('d1', 'c1', { contentType: 1, speaker: 'sns_chr_0013_aglina', content: { text: 'hi' } }, ctx)
    expect(msg!.isSelf).toBe(false)
    expect(msg!.speakerName).toBe('Aglaia')
  })

  it('returns null for unknown contentType', () => {
    const msg = adaptBakerMessage('d1', 'c1', { contentType: 4, speaker: 'endmin', content: { text: '' } }, ctx)
    expect(msg).toBeNull()
  })

  it('takes first element of contentParam array for images', () => {
    const msg = adaptBakerMessage('d1', 'c1', { contentType: 2, speaker: 'endmin', content: { text: '' }, contentParam: ['img1', 'img2'] }, ctx)
    expect(msg!.imageUrl).toContain('img1')
  })
})

describe('getSpriteUrl', () => {
  it('builds correct URL', () => {
    const url = getSpriteUrl('charroundicon/icon_test')
    expect(url).toContain('sprites/charroundicon/icon_test.png')
  })
})
