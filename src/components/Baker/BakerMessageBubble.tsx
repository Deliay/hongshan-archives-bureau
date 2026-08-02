import { RichText } from '../../lib/richText'
import type { BakerMessage } from '../../lib/types'

interface BakerMessageBubbleProps {
  message: BakerMessage
}

function Avatar({ url }: { url?: string }) {
  if (!url) {
    return <div className="w-8 h-8 rounded-full shrink-0 bg-archive-file border border-archive-border" />
  }
  return <img src={url} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
}

export function BakerMessageBubble({ message }: BakerMessageBubbleProps) {
  if (message.kind === 'system') {
    return (
      <div className="text-center text-xs text-archive-dust py-2">
        {message.text}
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${message.isSelf ? 'flex-row-reverse' : ''}`}>
      <Avatar url={message.speakerIconUrl} />
      <div className={`flex flex-col min-w-0 max-w-[70%] ${message.isSelf ? 'items-end' : 'items-start'}`}>
        {!message.isSelf && (
          <div className="text-xs text-archive-dust mb-1">{message.speakerName}</div>
        )}
        <div className={`rounded-lg px-3 py-2 w-fit ${
          message.isSelf
            ? 'bg-archive-gold/10 border border-archive-gold/30'
            : 'bg-archive-file'
        }`}>
          {message.kind === 'text' && <RichText text={message.text} imageSize="2rem" />}
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
      </div>
    </div>
  )
}
