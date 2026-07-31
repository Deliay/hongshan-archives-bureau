import { adaptBakerMessage, getSpriteUrl, resolveI18n, type BakerSpeakerContext } from './adapter'
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
      const selected = options[selectedId]
      beats.push({
        messages: [],
        branchId: Number(currentId),
        selectedOptionId: selectedId,
        options: validIds.map((oid) => ({
          id: oid,
          text: resolveI18n(options[oid].optionDesc, ctx.optionI18n),
          emojiUrl: options[oid].optionResPath ? getSpriteUrl(`sns/emoji/${options[oid].optionResPath}`) : undefined,
        })),
      })
      beats.push({
        messages: [{
          id: `${dialogId}:${currentId}:${selectedId}`,
          speakerId: 'endmin',
          isSelf: true,
          speakerName: ctx.speaker.selfName,
          speakerIconUrl: ctx.speaker.selfIconUrl,
          kind: selected.optionResPath ? 'sticker' : 'text',
          text: resolveI18n(selected.optionDesc, ctx.optionI18n),
          imageUrl: selected.optionResPath ? getSpriteUrl(`sns/emoji/${selected.optionResPath}`) : undefined,
          reactions: undefined,
        }],
      })
      currentId = String(selected.optionNextContentId)
      continue
    }

    if (node.contentType === 9) {
      const target = findMessage(String(node.preContentId))
      const reaction = parseReaction(node.contentParams, ctx)
      if (target && reaction) (target.reactions ??= []).push(reaction)
      currentId = String(node.nextContentId)
      continue
    }

    const message = adaptBakerMessage(dialogId, currentId, node, ctx.speaker, ctx.dialogI18n)
    if (message) beats.push({ messages: [message] })
    currentId = String(node.nextContentId)
  }
  return beats
}

function parseReaction(contentParams: string | undefined, ctx: ResolveContext) {
  if (!contentParams) return null
  try {
    const [r] = JSON.parse(contentParams)
    if (!r?.emojiResPath) return null
    return {
      emojiUrl: getSpriteUrl(`sns/emoji/${r.emojiResPath}`),
      fromNames: (r.npcIds ?? []).map((id: string) => ctx.speaker.chatMap[id]?.name ?? id),
      count: r.npcCount ?? (r.npcIds?.length ?? 0),
    }
  } catch {
    return null
  }
}
