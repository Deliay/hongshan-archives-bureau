import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBakerChats, useBakerDialog } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { BakerContactList } from '../../components/Baker/BakerContactList'
import { BakerChatPanel } from '../../components/Baker/BakerChatPanel'
import { resolveDialog } from '../../lib/baker'
import { getSpriteUrl } from '../../lib/adapter'
import type { BakerSpeakerContext } from '../../lib/adapter'
import { ListSkeleton } from '../../components/ui/ListSkeleton'

type Choice = { branchId: number; optionId: string }

export default function BakerTerminal() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const chatId = searchParams.get('chat') || null
  const { data: chatsData, loading: chatsLoading } = useBakerChats()
  const { data: dialogData, loading: dialogLoading } = useBakerDialog(chatId)
  const [choices, setChoices] = useState<Choice[]>([])
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const activeChat = chatsData?.chats.find(c => c.id === chatId) ?? null

  const speakerCtx: BakerSpeakerContext | null = useMemo(() => {
    if (!chatsData) return null
    const chatMap: Record<string, any> = {}
    for (const c of chatsData.chats) chatMap[c.id] = c
    return {
      chatMap,
      selfName: t('baker.selfName'),
      selfIconUrl: getSpriteUrl('charroundicon/icon_round_chr_0003_endminf'),
    }
  }, [chatsData, t])

  const beats = useMemo(() => {
    if (!dialogData || !speakerCtx || !activeChat) return []
    const choicesMap = Object.fromEntries(choices.map(c => [c.branchId, c.optionId]))
    const allBeats = []
    for (const dialog of dialogData.dialogs) {
      const resolved = resolveDialog(
        dialog.dialogId,
        dialog.nodes,
        dialogData.options,
        choicesMap,
        { ...dialogData.ctx, speaker: speakerCtx },
      )
      allBeats.push(...resolved)
    }
    return allBeats
  }, [dialogData, speakerCtx, activeChat, choices])

  const topics = useMemo(() => {
    if (!chatsData || !chatId) return []
    return chatsData.topics.filter(top => top.dialogs.some(d => {
      const dialog = dialogData?.dialogs.find(dd => dd.dialogId === d.dialogId)
      return dialog != null
    }))
  }, [chatsData, chatId, dialogData])

  const handleSelect = useCallback((id: string) => {
    setSearchParams({ chat: id })
    setChoices([])
    setMobileShowChat(true)
  }, [setSearchParams])

  const handleSwitchOption = useCallback((branchId: number, optionId: string) => {
    setChoices(prev => {
      const idx = prev.findIndex(c => c.branchId === branchId)
      return [...(idx >= 0 ? prev.slice(0, idx) : prev), { branchId, optionId }]
    })
  }, [])

  if (chatsLoading) return <ListSkeleton cards={8} />

  return (
    <div className="h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-[300px_1fr]">
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} flex-col border-r border-archive-border`}>
        <BakerContactList
          chats={chatsData?.chats ?? []}
          activeChatId={chatId}
          onSelect={handleSelect}
        />
      </div>
      <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-col`}>
        {mobileShowChat && (
          <button
            type="button"
            onClick={() => setMobileShowChat(false)}
            className="md:hidden p-2 text-sm text-archive-dust hover:text-archive-gold border-b border-archive-border"
          >
            &larr; {t('baker.tab.all')}
          </button>
        )}
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-archive-dust">
            {t('baker.selectChat')}
          </div>
        ) : dialogLoading ? (
          <ListSkeleton cards={4} />
        ) : (
          <BakerChatPanel
            chat={activeChat}
            topics={topics}
            beats={beats}
            onSwitchOption={handleSwitchOption}
          />
        )}
      </div>
    </div>
  )
}
