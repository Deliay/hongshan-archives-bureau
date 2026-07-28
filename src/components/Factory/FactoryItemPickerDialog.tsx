import { useState, useMemo, useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'
import ItemTile from '../Items/ItemTile'

const LIST_PAGE_SIZE = 50

interface FactoryItemPickerDialogProps {
  open: boolean
  onClose: () => void
  itemIds: string[]
  itemMeta: Record<string, { name: string; rarity: number }>
  /** 已选中项展示为高亮禁用态 */
  isSelected: (id: string) => boolean
  onSelect: (id: string) => void
}

export default function FactoryItemPickerDialog({
  open,
  onClose,
  itemIds,
  itemMeta,
  isSelected,
  onSelect,
}: FactoryItemPickerDialogProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [listPage, setListPage] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // 每次打开时重置搜索与分页
  useEffect(() => {
    if (open) {
      setSearch('')
      setListPage(0)
    }
  }, [open])

  useEffect(() => {
    setListPage(0)
  }, [search])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filteredIds = useMemo(() => {
    if (!search.trim()) return itemIds
    const q = search.toLowerCase()
    return itemIds.filter(id => {
      const meta = itemMeta[id]
      return meta?.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    })
  }, [itemIds, itemMeta, search])

  const listTotalPages = Math.max(1, Math.ceil(filteredIds.length / LIST_PAGE_SIZE))
  const pagedList = filteredIds.slice(listPage * LIST_PAGE_SIZE, (listPage + 1) * LIST_PAGE_SIZE)

  if (!open) return null

  function handleSelect(id: string) {
    if (isSelected(id)) return
    onSelect(id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="max-w-md w-full mx-4 max-h-[80vh] flex flex-col rounded border border-archive-border bg-archive-file shadow-2xl"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="border-b border-archive-border px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-archive-ivory">{t('factory.addTarget')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-archive-lead hover:text-archive-ivory transition-colors text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('factory.searchItem')}
            autoFocus
            className="w-full px-3 py-2 rounded border border-archive-border bg-archive-ink text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-1 space-y-0.5">
          {pagedList.map(id => {
            const meta = itemMeta[id]
            const selected = isSelected(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                disabled={selected}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  selected
                    ? 'bg-archive-gold/10 text-archive-gold cursor-not-allowed'
                    : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-ink'
                }`}
              >
                <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
                <span className="truncate">{meta?.name || id}</span>
              </button>
            )
          })}
          {filteredIds.length === 0 && (
            <div className="text-sm text-archive-lead py-4 text-center">{t('factory.noRecipes')}</div>
          )}
        </div>

        {listTotalPages > 1 && (
          <div className="flex items-center justify-center gap-1 text-xs py-2 border-t border-archive-border">
            <button
              type="button"
              disabled={listPage === 0}
              onClick={() => setListPage(p => p - 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="text-archive-lead px-1">{listPage + 1}/{listTotalPages}</span>
            <button
              type="button"
              disabled={listPage >= listTotalPages - 1}
              onClick={() => setListPage(p => p + 1)}
              className="px-2 py-0.5 rounded border border-archive-border text-archive-dust hover:text-archive-ivory disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
