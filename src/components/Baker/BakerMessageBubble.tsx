import { RichText } from '../../lib/richText'
import type { BakerMessage } from '../../lib/types'

interface BakerMessageBubbleProps {
  message: BakerMessage
  showAvatar: boolean
}

export function BakerMessageBubble({ message, showAvatar }: BakerMessageBubbleProps) {
  if (message.kind === 'system') {
    return (
      <div className="text-center text-xs text-archive-dust py-2">
        {message.text}
      </div>
    )
  }

  const bubbleContent = (
    <>
      {showAvatar && !message.isSelf && (
        <div className="text-xs text-archive-dust mb-1">{message.speakerName}</div>
      )}
      <div className={`rounded-lg px-3 py-2 max-w-[70%] ${
        message.isSelf
          ? 'bg-archive-gold/10 border border-archive-gold/30'
          : 'bg-archive-file'
      }`}>
        {message.kind === 'text' && <RichText text={message.text} />}
        {message.kind === 'image' && message.imageUrl && (
          <img src={message.imageUrl} alt="" className="max-w-xs rounded" loading="lazy" />
        )}
        {message.kind === 'sticker' && message.imageUrl && (
          <img src={message.imageUrl} alt="" className="w-16 h-16" />
        )}
        {message.kind === 'share' && (
          <div className="text-sm">
            <div className="text-archive-gold text-xs mb-1">PRTS</div>
            <RichText text={message.text} />
          </div>
        )}
        {message.kind === 'mission' && (
          <div className="text-sm text-archive-dust">{message.text}</div>
        )}
      </div>
      {message.reactions?.map((r, i) => (
        <div key={i} className="inline-flex items-center gap-1 text-xs text-archive-dust mt-1">
          {r.emojiUrl && <img src={r.emojiUrl} alt="" className="w-4 h-4" />}
          <span>{r.fromNames.join(', ')}</span>
        </div>
      ))}
    </>
  )

  return (
    <div className={`flex gap-2 ${message.isSelf ? 'justify-end' : ''}`}>
      {showAvatar && !message.isSelf && message.speakerIconUrl && (
        <img src={message.speakerIconUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
      )}
      <div className={message.isSelf ? 'text-right' : ''}>
        {bubbleContent}
      </div>
    </div>
  )
}
