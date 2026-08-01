import { BakerMessageBubble } from './BakerMessageBubble'
import { BakerOptionGroup } from './BakerOptionGroup'
import type { BakerChat, BakerBeat } from '../../lib/types'
import { useI18n } from '../../i18n'

interface BakerChatPanelProps {
  chat: BakerChat
  beats: BakerBeat[]
  onSwitchOption: (branchId: number, optionId: string) => void
}

export function BakerChatPanel({ chat, beats, onSwitchOption }: BakerChatPanelProps) {
  const { t } = useI18n()

  return (
    <div className="h-full flex flex-col overflow-y-auto">
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
  )
}
