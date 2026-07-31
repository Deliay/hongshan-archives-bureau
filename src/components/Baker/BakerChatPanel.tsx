import { BakerMessageBubble } from './BakerMessageBubble'
import { BakerOptionGroup } from './BakerOptionGroup'
import type { BakerChat, BakerTopic, BakerBeat } from '../../lib/types'
import { useI18n } from '../../i18n'

interface BakerChatPanelProps {
  chat: BakerChat
  topics: BakerTopic[]
  beats: BakerBeat[]
  onSwitchOption: (branchId: number, optionId: string) => void
}

export function BakerChatPanel({ chat, topics, beats, onSwitchOption }: BakerChatPanelProps) {
  const { t } = useI18n()

  return (
    <div className="h-full flex flex-col">
      <div className="flex overflow-x-auto gap-2 p-2 border-b border-archive-border">
        {topics.map(topic => (
          <div
            key={topic.topicId}
            className="px-3 py-1 rounded-full text-xs whitespace-nowrap bg-archive-file text-archive-dust"
          >
            {topic.topicName || topic.dialogs[0]?.preview?.slice(0, 20) || topic.topicId}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {beats.length === 0 && (
          <div className="text-center text-archive-dust py-12">{t('baker.emptyChat')}</div>
        )}
        {beats.map((beat, i) => (
          <div key={i}>
            {beat.messages.map((msg) => (
              <div key={msg.id} className="mb-2">
                <BakerMessageBubble
                  message={msg}
                  showAvatar={chat.kind === 'group'}
                />
              </div>
            ))}
            {beat.options && (
              <BakerOptionGroup
                options={beat.options}
                selectedId={beat.selectedOptionId}
                onSelect={(optId) => onSwitchOption(beat.branchId!, optId)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
