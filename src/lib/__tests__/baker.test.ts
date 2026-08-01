import { describe, it, expect } from 'vitest'
import { resolveDialog, type ResolveContext } from '../baker'
import type { BakerSpeakerContext } from '../adapter'

const speaker: BakerSpeakerContext = {
  chatMap: {
    npc1: { id: 'npc1', kind: 'contact', name: 'NPC One', iconUrl: 'http://npc1', isSettlementChannel: false },
  },
  selfName: 'Me',
  selfIconUrl: 'http://self',
}

function makeCtx(partial?: Partial<ResolveContext>): ResolveContext {
  return { speaker, ...partial }
}

function makeNode(overrides: any) {
  return {
    content: { id: 1, text: 'hello' },
    contentType: 1,
    speaker: 'npc1',
    nextContentId: -1,
    preContentId: 0,
    dialogOptionIds: [],
    isEnd: false,
    ...overrides,
  }
}

describe('resolveDialog', () => {
  it('traverses linear messages', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ nextContentId: 2 }),
      '2': makeNode({ content: { id: 2, text: 'world' }, speaker: 'endmin', nextContentId: -1 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx({ dialogI18n: { '1': 'hello', '2': 'world' } }))
    const allMsgs = beats.flatMap(b => b.messages)
    expect(allMsgs).toHaveLength(2)
    expect(allMsgs[0].isSelf).toBe(false)
    expect(allMsgs[1].isSelf).toBe(true)
  })

  it('stops at nextContentId = -1', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ nextContentId: -1 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx())
    expect(beats.flatMap(b => b.messages)).toHaveLength(1)
  })

  it('stops at nextContentId = 0', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ nextContentId: 0 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx())
    expect(beats.flatMap(b => b.messages)).toHaveLength(1)
  })

  it('handles dangling reference', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ nextContentId: 999 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx())
    expect(beats.flatMap(b => b.messages)).toHaveLength(1)
  })

  it('handles circular reference', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ nextContentId: 2 }),
      '2': makeNode({ nextContentId: 1 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx())
    expect(beats.flatMap(b => b.messages)).toHaveLength(2)
  })

  it('does not produce bubble for branch point node', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ dialogOptionIds: ['opt1', 'opt2'], content: { id: null }, contentType: 1, nextContentId: -1 }),
    }
    const options: Record<string, any> = {
      opt1: { optionDesc: { text: 'A' }, optionNextContentId: -1, optionResPath: '', optionNPCIds: [] },
      opt2: { optionDesc: { text: 'B' }, optionNextContentId: -1, optionResPath: '', optionNPCIds: [] },
    }
    const beats = resolveDialog('d1', nodes, options, {}, makeCtx())
    const branchBeat = beats.find(b => b.options)
    expect(branchBeat).toBeDefined()
    expect(branchBeat!.messages).toHaveLength(0)
    expect(branchBeat!.options).toHaveLength(2)
    expect(branchBeat!.selectedOptionId).toBe('opt1')
    // 选项分支不产生「我」的气泡
    expect(beats.some(b => b.messages.some(m => m.isSelf))).toBe(false)
  })

  it('selected option does not become a self bubble', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ dialogOptionIds: ['opt1'], content: { id: null }, nextContentId: -1 }),
      '2': makeNode({ content: { id: 2, text: 'npc reply' }, speaker: 'npc1', nextContentId: -1 }),
    }
    const options: Record<string, any> = {
      opt1: { optionDesc: { text: 'Choice A' }, optionNextContentId: 2, optionResPath: '', optionNPCIds: [] },
    }
    const beats = resolveDialog('d1', nodes, options, { 1: 'opt1' }, makeCtx({ dialogI18n: { '2': 'npc reply' } }))
    const selfMsgs = beats.flatMap(b => b.messages).filter(m => m.isSelf)
    expect(selfMsgs).toHaveLength(0)
    // 分支选中后沿 optionNextContentId 继续走 NPC 回复
    const texts = beats.flatMap(b => b.messages).map(m => m.text)
    expect(texts).toContain('npc reply')
  })

  it('option with optionResPath builds sticker asset under sns/sticker/', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ dialogOptionIds: ['opt1'], content: { id: null }, nextContentId: -1 }),
    }
    const options: Record<string, any> = {
      opt1: { optionDesc: { text: '' }, optionNextContentId: -1, optionResPath: 'sns_sticker_001', optionNPCIds: [] },
    }
    const beats = resolveDialog('d1', nodes, options, {}, makeCtx())
    const branchBeat = beats.find(b => b.options)
    expect(branchBeat!.options![0].emojiUrl).toContain('sns/sticker/sns_sticker_001')
    expect(branchBeat!.options![0].emojiUrl).not.toContain('sns/emoji/sns_sticker_001')
  })

  it('option with emoji resPath builds emoji asset under sns/emoji/', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ dialogOptionIds: ['opt1'], content: { id: null }, nextContentId: -1 }),
    }
    const options: Record<string, any> = {
      opt1: { optionDesc: { text: '' }, optionNextContentId: -1, optionResPath: 'sns_emoji_007', optionNPCIds: [] },
    }
    const beats = resolveDialog('d1', nodes, options, {}, makeCtx())
    const branchBeat = beats.find(b => b.options)
    expect(branchBeat!.options![0].emojiUrl).toContain('sns/emoji/sns_emoji_007')
  })

  it('contentType 9 merges into previous message reactions', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ content: { id: 1, text: 'msg' }, nextContentId: 2 }),
      '2': makeNode({
        contentType: 9,
        speaker: '',
        preContentId: 1,
        nextContentId: -1,
        content: { id: null },
        contentParams: JSON.stringify([{ emojiResPath: 'sns_emoji_happy', npcIds: ['npc1'], npcCount: 1 }]),
      }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx({ dialogI18n: { '1': 'msg' } }))
    const allMsgs = beats.flatMap(b => b.messages)
    expect(allMsgs[0].reactions).toHaveLength(1)
    expect(allMsgs[0].reactions![0].fromNames).toContain('NPC One')
  })

  it('unknown contentType is skipped', () => {
    const nodes: Record<string, any> = {
      '1': makeNode({ contentType: 4, nextContentId: 2 }),
      '2': makeNode({ content: { id: 2, text: 'ok' }, nextContentId: -1 }),
    }
    const beats = resolveDialog('d1', nodes, {}, {}, makeCtx({ dialogI18n: { '2': 'ok' } }))
    const allMsgs = beats.flatMap(b => b.messages)
    expect(allMsgs).toHaveLength(1)
    expect(allMsgs[0].text).toBe('ok')
  })
})
