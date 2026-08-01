import { describe, it, expect } from 'vitest'
import {
  adaptRecapScene,
  adaptRecapFallbackScene,
  adaptRecapChapter,
  buildRecapChaptersFromMissions,
  adaptPrtsCategory,
  adaptPrtsVolume,
  adaptPrtsItem,
  adaptBakerChat,
  adaptBakerMessage,
  resolveContentType,
  getSpriteUrl,
  resolveRuntimeText,
  extractMissionIds,
  buildMissionNameMapFromBrief,
  resolveLevelMapId,
  adaptMissionRuntime,
  buildMissionQuestTree,
  type BakerSpeakerContext,
} from '../adapter'
import type { StoryRecapScene } from '../types'

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

  it('resolves mission name from map and falls back to missionId', () => {
    const scenes = [
      { id: '1', dlgId: 'dlg_e1m1_1', chapterId: 'e1', missionId: 'e1m1', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
      { id: '2', dlgId: 'dlg_e1m2_1', chapterId: 'e1', missionId: 'e1m2', sceneNo: 1, sceneSub: 0, chapterType: 'e', code: '', text: '' },
    ]
    const chapters = adaptRecapChapter(scenes, { e1m1: '迟到的特训' })
    expect(chapters[0].missions[0].name).toBe('迟到的特训')
    expect(chapters[0].missions[1].name).toBe('e1m2')
  })
})

describe('buildRecapChaptersFromMissions', () => {
  const scene = (id: string, dlgId: string, missionId: string, sceneNo: number): StoryRecapScene => ({
    id, dlgId, chapterId: missionId.replace(/m\d+$/, ''), missionId, sceneNo, sceneSub: 0, chapterType: '', code: '', text: `text-${sceneNo}`,
  })

  it('drives navigation by mission list and groups by ([a-z]+) prefix', () => {
    const missionIds = ['a1m2', 'hidden52', 'sm2l4m5', 'db01m10', 'a1m1']
    const scenes = [
      scene('1', 'dlg_a1m1_1', 'a1m1', 1),
      scene('2', 'dlg_a1m1_2', 'a1m1', 2),
      scene('3', 'dlg_a1m2_1', 'a1m2', 1),
    ]
    const chapters = buildRecapChaptersFromMissions(missionIds, scenes)
    const types = chapters.map(c => c.chapterType)
    expect(types).toEqual(['sm', 'a', 'db', 'hidden'])
    const a = chapters.find(c => c.chapterType === 'a')!
    expect(a.missions.map(m => m.missionId)).toEqual(['a1m1', 'a1m2'])
    // a1m1 has 2 scenes, a1m2 has 1, hidden52 has 0
    expect(a.missions[0].scenes.map(s => s.sceneNo)).toEqual([1, 2])
    expect(a.missions[1].scenes).toHaveLength(1)
    const hidden = chapters.find(c => c.chapterType === 'hidden')!
    expect(hidden.missions[0].scenes).toHaveLength(0)
  })

  it('orders chapters by priority E > C > GM > SM > M > rest', () => {
    const missionIds = ['m1m24', 'hidden52', 'e11m1', 'c33m1', 'sm1l1m2', 'gm02m25']
    const chapters = buildRecapChaptersFromMissions(missionIds, [])
    expect(chapters.map(c => c.chapterType)).toEqual(['e', 'c', 'gm', 'sm', 'm', 'hidden'])
  })

  it('resolves mission names from map', () => {
    const chapters = buildRecapChaptersFromMissions(['a1m2'], [], { a1m2: '生存特训' })
    expect(chapters[0].missions[0].name).toBe('生存特训')
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

describe('resolveRuntimeText', () => {
  const resolve = (key: string) => `T:${key}`

  it('resolves {key} object via resolver', () => {
    expect(resolveRuntimeText({ key: 'a1m2_name' }, resolve)).toBe('T:a1m2_name')
  })

  it('returns raw string as-is', () => {
    expect(resolveRuntimeText('黑盒接取条件隐藏任务', resolve)).toBe('黑盒接取条件隐藏任务')
  })

  it('returns empty for null/empty object', () => {
    expect(resolveRuntimeText(null, resolve)).toBe('')
    expect(resolveRuntimeText({}, resolve)).toBe('')
    expect(resolveRuntimeText(undefined, resolve)).toBe('')
  })
})

describe('extractMissionIds', () => {
  it('extracts ids and drops meta entries', () => {
    const paths = [
      'Data/Json/MissionRuntimeAsset/a1m2.json',
      'Data/Json/MissionRuntimeAsset/a1m2_meta.json',
      'Data/Json/MissionRuntimeAsset/hidden68_m1m80.json',
      'Data/Json/MissionRuntimeAsset/hidden68_m1m80_meta.json',
    ]
    expect(extractMissionIds(paths)).toEqual(['a1m2', 'hidden68_m1m80'])
  })
})

describe('buildMissionNameMapFromBrief', () => {
  const resolveKey = (key: string) => `T:${key}`

  it('maps missionId to resolved name from brief missionName key', () => {
    const brief = [
      { missionId: 'e11m7d5', missionName: { key: 'e11m7_name' }, missionType: 0 },
      { missionId: 'a1m2', missionName: { key: 'a1m2_name' } },
    ]
    expect(buildMissionNameMapFromBrief(brief, resolveKey)).toEqual({
      e11m7d5: 'T:e11m7_name',
      a1m2: 'T:a1m2_name',
    })
  })

  it('skips entries without a resolvable name (empty brief or no key)', () => {
    const brief = [
      { missionId: 'hidden58', missionName: {} },
      { missionId: 'hidden52' },
      { missionId: '', missionName: { key: 'x_name' } },
    ]
    expect(buildMissionNameMapFromBrief(brief, resolveKey)).toEqual({})
  })

  it('handles empty brief and plain-string names', () => {
    expect(buildMissionNameMapFromBrief([], resolveKey)).toEqual({})
    const brief = [{ missionId: 'a1m1', missionName: '直接文本' }]
    expect(buildMissionNameMapFromBrief(brief, resolveKey)).toEqual({ a1m1: '直接文本' })
  })
})

describe('resolveLevelMapId', () => {
  const mapRaw = { map01: {}, map02: {}, base01_lv001: {} }

  it('uses levelId itself when it is a mapId', () => {
    expect(resolveLevelMapId('base01_lv001', mapRaw)).toBe('base01_lv001')
  })

  it('strips _lv<digits> suffix to find mapId', () => {
    expect(resolveLevelMapId('map02_lv007', mapRaw)).toBe('map02')
    expect(resolveLevelMapId('map01_lv001', mapRaw)).toBe('map01')
  })

  it('returns null when no map matches', () => {
    expect(resolveLevelMapId('dung01_cdg001', mapRaw)).toBeNull()
    expect(resolveLevelMapId('', mapRaw)).toBeNull()
  })
})

describe('adaptMissionRuntime', () => {
  const resolve = (key: string) => `T:${key}`

  it('parses mission fields, name and description via key', () => {
    const raw = {
      missionId: 'a1m2',
      missionName: { key: 'a1m2_name' },
      missionDescription: { key: 'a1m2_desc_001' },
      missionType: 11,
      baseMissionImportance: 1,
      overrideImportance: 0,
      charId: '',
      levelId: 'map01_lv001',
      missionChapterBitmask: 0,
      isWrapperMission: false,
      mainPathQuests: ['a1m2_q#3', 'a1m2_q#4'],
      questDic: {
        'a1m2_q#3': { questType: 1, flowIndex: 0, prevQuestIdList: [], objectiveList: [{ description: { key: 'objective_a1m2_1_001' } }] },
        'a1m2_q#4': { questType: 0, flowIndex: 1, prevQuestIdList: ['a1m2_q#3'], objectiveList: [] },
      },
    }
    const mission = adaptMissionRuntime(raw, resolve)
    expect(mission.missionId).toBe('a1m2')
    expect(mission.name).toBe('T:a1m2_name')
    expect(mission.description).toBe('T:a1m2_desc_001')
    expect(mission.missionType).toBe(11)
    expect(mission.importance).toBe(1)
    expect(mission.quests).toHaveLength(2)
    expect(mission.quests[0].questId).toBe('a1m2_q#3')
    expect(mission.quests[0].inMainPath).toBe(true)
    expect(mission.quests[0].objectives[0].description).toBe('T:objective_a1m2_1_001')
    expect(mission.quests[1].prevQuestIds).toEqual(['a1m2_q#3'])
  })

  it('treats string description as-is and handles overrideMissionDesc', () => {
    const raw = {
      missionId: 'dm01m5',
      missionDescription: '黑盒接取条件隐藏任务',
      missionName: {},
      mainPathQuests: ['dm01m5_q#1'],
      questDic: {
        'dm01m5_q#1': {
          questType: 4,
          overrideMissionDesc: true,
          descriptionOverride: { key: 'override_desc' },
          objectiveList: [],
        },
      },
    }
    const mission = adaptMissionRuntime(raw, resolve)
    expect(mission.description).toBe('黑盒接取条件隐藏任务')
    expect(mission.name).toBe('')
    expect(mission.quests[0].description).toBe('T:override_desc')
  })

  it('sorts main-path quests before branch quests', () => {
    const raw = {
      missionId: 'e11m8d5',
      mainPathQuests: ['e11m8d5_q#1', 'e11m8d5_q#2'],
      questDic: {
        'e11m8d5_q#4': { questType: 0, objectiveList: [] },
        'e11m8d5_q#1': { questType: 0, objectiveList: [] },
        'e11m8d5_q#2': { questType: 0, objectiveList: [] },
      },
    }
    const mission = adaptMissionRuntime(raw, resolve)
    expect(mission.quests.map(q => q.questId)).toEqual(['e11m8d5_q#1', 'e11m8d5_q#2', 'e11m8d5_q#4'])
  })
})

describe('buildMissionQuestTree', () => {
  const mk = (questId: string, prev: string[] = [], inMainPath = true) => ({
    questId,
    questType: 0,
    inMainPath,
    flowIndex: 0,
    prevQuestIds: prev,
    description: '',
    objectives: [],
  })

  it('flattens main-path quests into a flat spine (no nesting)', () => {
    const quests = [
      mk('a1m2_q#3'),
      mk('a1m2_q#4', ['a1m2_q#3']),
      mk('a1m2_q#Day1', ['a1m2_q#4']),
    ]
    const tree = buildMissionQuestTree(['a1m2_q#3', 'a1m2_q#4', 'a1m2_q#Day1'], quests)
    expect(tree.map(n => n.questId)).toEqual(['a1m2_q#3', 'a1m2_q#4', 'a1m2_q#Day1'])
    expect(tree.every(n => n.children.length === 0)).toBe(true)
  })

  it('attaches branch quests to their main-path parent', () => {
    const quests = [
      mk('sm2l4m5_q#7'),
      mk('sm2l4m5_q#8', [], false),
      mk('sm2l4m5_q#10', ['sm2l4m5_q#7', 'sm2l4m5_q#8'], false),
    ]
    const tree = buildMissionQuestTree(['sm2l4m5_q#7'], quests)
    // q#7 spine root; q#8 orphan root; q#10 attached to q#7 (first main-path prev)
    expect(tree.map(n => n.questId)).toEqual(['sm2l4m5_q#7', 'sm2l4m5_q#8'])
    expect(tree[0].children.map(c => c.questId)).toEqual(['sm2l4m5_q#10'])
  })

  it('nests branch-on-branch quests under their branch parent', () => {
    const quests = [
      mk('q#1'),
      mk('q#B1', ['q#1'], false),
      mk('q#B2', ['q#B1'], false),
    ]
    const tree = buildMissionQuestTree(['q#1'], quests)
    expect(tree[0].children.map(c => c.questId)).toEqual(['q#B1'])
    expect(tree[0].children[0].children.map(c => c.questId)).toEqual(['q#B2'])
  })

  it('treats quests whose prev is not in the questDic as roots', () => {
    const quests = [
      mk('e11m8d5_q#1', ['external_q#x']),
      mk('e11m8d5_q#2', ['external_q#y']),
    ]
    const tree = buildMissionQuestTree(['e11m8d5_q#1', 'e11m8d5_q#2'], quests)
    expect(tree).toHaveLength(2)
  })

  it('guards against dependency cycles', () => {
    const quests = [
      mk('q#1', ['q#2']),
      mk('q#2', ['q#1']),
    ]
    const tree = buildMissionQuestTree([], quests)
    expect(tree).toHaveLength(1)
    expect(tree[0].children.map(c => c.questId)).toEqual(['q#2'])
    expect(tree[0].children[0].children).toEqual([])
  })
})
