import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { BakerChat } from '../../lib/types'

interface BakerContactListProps {
  chats: BakerChat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
}

type TabKey = 'all' | 'operator' | 'contact' | 'group'

const TAB_KIND_MAP: Record<TabKey, BakerChat['kind'] | null> = {
  all: null,
  operator: 'operator',
  contact: 'contact',
  group: 'group',
}

export function BakerContactList({ chats, activeChatId, onSelect }: BakerContactListProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>('all')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('baker.tab.all') },
    { key: 'operator', label: t('baker.tab.operator') },
    { key: 'contact', label: t('baker.tab.contact') },
    { key: 'group', label: t('baker.tab.group') },
  ]

  const filtered = TAB_KIND_MAP[tab] ? chats.filter(c => c.kind === TAB_KIND_MAP[tab]) : chats

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 p-2 border-b border-archive-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              tab === key
                ? 'text-archive-gold bg-archive-gold/20'
                : 'text-archive-dust hover:text-archive-ivory'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(chat => (
          <button
            key={chat.id}
            type="button"
            onClick={() => onSelect(chat.id)}
            className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
              activeChatId === chat.id
                ? 'bg-archive-file border-l-2 border-archive-gold'
                : 'hover:bg-archive-file'
            }`}
          >
            {chat.iconUrl ? (
              <img
                src={chat.iconUrl}
                alt=""
                className="w-10 h-10 rounded-full border border-archive-border object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-archive-border bg-archive-file" />
            )}
            <span className="text-sm text-archive-ivory truncate">{chat.name || chat.id}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
