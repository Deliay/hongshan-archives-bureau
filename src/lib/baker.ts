import { adaptBakerMessage, ASSET_BASE, resolveI18n, type BakerSpeakerContext } from './adapter'
import { SNS_DIALOG_CONTENT_TYPE } from '../data/constants'
import type { BakerBeat, BakerMessage } from './types'

interface RawNode {
  content: { id?: number | string; text?: string }
  contentType: number
  speaker: string
  nextContentId: number
  preContentId: number
  dialogOptionIds: string[]
  contentParam?: string[]
  contentParams?: string
  isEnd: boolean
  linkMissionId?: string
}

interface RawOption {
  optionDesc: { id?: number | string; text?: string }
  optionNextContentId: number
  optionResPath: string
  optionNPCIds: string[]
}

export interface ResolveContext {
  speaker: BakerSpeakerContext
  dialogI18n?: Record<string, string>
  optionI18n?: Record<string, string>
  startId?: string
  prtsName?: (id: string) => string
  missionName?: (id: string) => string
}

export function getSnsAssetUrl(resPath: string): string {
  if (!resPath) return ''
  if (resPath.startsWith('sns_sticker_')) {
    return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/sns/sticker/${resPath}.png`
  }
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/sns/emoji/${resPath}.png`
}

export function resolveDialog(
  dialogId: string,
  nodes: Record<string, RawNode>,
  options: Record<string, RawOption>,
  choices: Record<number, string> = {},
  ctx: ResolveContext,
): BakerBeat[] {
  const beats: BakerBeat[] = []
  const visited = new Set<string>()
  let currentId = ctx.startId ?? '1'

  const findMessage = (contentId: string): BakerMessage | undefined =>
    beats.flatMap((b) => b.messages).find((m) => m.id === `${dialogId}:${contentId}`)

  while (currentId && currentId !== '-1' && currentId !== '0' && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodes[currentId]
    if (!node) break

    if (node.dialogOptionIds?.length) {
      const validIds = node.dialogOptionIds.filter((oid) => options[oid])
      if (!validIds.length) break
      const selectedId = choices[Number(currentId)] ?? validIds[0]
      beats.push({
        messages: [],
        branchId: Number(currentId),
        selectedOptionId: selectedId,
        options: validIds.map((oid) => ({
          id: oid,
          text: resolveI18n(options[oid].optionDesc, ctx.optionI18n),
          emojiUrl: options[oid].optionResPath ? getSnsAssetUrl(options[oid].optionResPath) : undefined,
        })),
      })
      currentId = String(options[selectedId].optionNextContentId)
      continue
    }

    if (node.contentType === SNS_DIALOG_CONTENT_TYPE.EmojiResult) {
      const target = findMessage(String(node.preContentId))
      const reaction = parseReaction(node.contentParams, ctx)
      if (target && reaction) (target.reactions ??= []).push(reaction)
      currentId = String(node.nextContentId)
      continue
    }

    if (node.contentType === SNS_DIALOG_CONTENT_TYPE.PRTS) {
      const card = buildPrtsCard(dialogId, currentId, node, ctx)
      if (card) beats.push({ messages: [card] })
      currentId = String(node.nextContentId)
      continue
    }

    if (node.contentType === SNS_DIALOG_CONTENT_TYPE.Task) {
      const card = buildMissionCard(dialogId, currentId, node, ctx)
      if (card) beats.push({ messages: [card] })
      currentId = String(node.nextContentId)
      continue
    }

    const message = adaptBakerMessage(dialogId, currentId, node, ctx.speaker, ctx.dialogI18n)
    if (message) beats.push({ messages: [message] })
    currentId = String(node.nextContentId)
  }
  return beats
}

function cardSpeaker(node: RawNode, ctx: ResolveContext) {
  const isSelf = node.speaker === 'endmin'
  return {
    isSelf,
    speakerName: isSelf ? ctx.speaker.selfName : (node.speaker ? ctx.speaker.chatMap[node.speaker]?.name ?? '' : ''),
    speakerIconUrl: isSelf ? ctx.speaker.selfIconUrl : (node.speaker ? ctx.speaker.chatMap[node.speaker]?.iconUrl ?? '' : ''),
  }
}

function buildPrtsCard(
  dialogId: string,
  contentId: string,
  node: RawNode,
  ctx: ResolveContext,
): BakerMessage | null {
  const ref = parsePrtsRef(node.contentParams)
  if (!ref) return null
  const speaker = cardSpeaker(node, ctx)
  return {
    id: `${dialogId}:${contentId}`,
    speakerId: node.speaker ?? '',
    ...speaker,
    kind: 'share',
    text: ref.id,
    card: {
      kind: 'prts',
      title: ctx.prtsName?.(ref.id) ?? ref.id,
      to: `/archive/story/library?doc=${ref.id}`,
    },
  }
}

function parsePrtsRef(contentParams: string | undefined): { id: string } | null {
  if (!contentParams) return null
  try {
    const r = JSON.parse(contentParams)
    if (typeof r?.id !== 'string' || !r.id) return null
    return { id: r.id }
  } catch {
    return null
  }
}

function buildMissionCard(
  dialogId: string,
  contentId: string,
  node: RawNode,
  ctx: ResolveContext,
): BakerMessage | null {
  const missionId = node.linkMissionId || node.contentParam?.[0]
  if (!missionId) return null
  const speaker = cardSpeaker(node, ctx)
  return {
    id: `${dialogId}:${contentId}`,
    speakerId: node.speaker ?? '',
    ...speaker,
    kind: 'mission',
    text: missionId,
    card: {
      kind: 'mission',
      title: ctx.missionName?.(missionId) ?? missionId,
      to: `/archive/story/recap?mission=${missionId}`,
    },
  }
}

function parseReaction(contentParams: string | undefined, ctx: ResolveContext) {
  if (!contentParams) return null
  try {
    const [r] = JSON.parse(contentParams)
    if (!r?.emojiResPath) return null
    return {
      emojiUrl: getSnsAssetUrl(r.emojiResPath),
      fromNames: (r.npcIds ?? []).map((id: string) => ctx.speaker.chatMap[id]?.name ?? id),
      count: r.npcCount ?? (r.npcIds?.length ?? 0),
    }
  } catch {
    return null
  }
}
