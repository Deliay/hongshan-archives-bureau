import { useEffect, useRef } from 'react'
import { BakerMessageBubble } from './BakerMessageBubble'
import { BakerOptionGroup } from './BakerOptionGroup'
import type { BakerBeat } from '../../lib/types'
import { useI18n } from '../../i18n'

interface BakerChatPanelProps {
  beats: BakerBeat[]
  topicId?: string | null
  onSwitchOption: (branchId: number, optionId: string) => void
}

export function BakerChatPanel({ beats, topicId, onSwitchOption }: BakerChatPanelProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [topicId])

  return (
    <div ref={scrollRef} className="h-full flex flex-col overflow-y-auto p-4 space-y-2">
      {beats.length === 0 && (
        <div className="text-center text-archive-dust py-12">{t('baker.emptyChat')}</div>
      )}
      {beats.map((beat, i) => (
        <div key={i}>
          {beat.messages.map((msg) => (
            <div key={msg.id}>
              <BakerMessageBubble message={msg} />
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
