import { useState, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import ItemTile from '../Items/ItemTile'

const LIST_PAGE_SIZE = 50

interface FactoryItemSidebarProps {
  itemIds: string[]
  itemMeta: Record<string, { name: string; rarity: number }>
  searchPlaceholder: string
  /** 移动端折叠按钮上展示的内容 */
  toggleLabel: ReactNode
  isSelected: (id: string) => boolean
  onSelect: (id: string) => void
  /** 已选中项是否禁止再次点击（多选场景） */
  disableSelected?: boolean
  /** 选中后清空搜索框 */
  clearSearchOnSelect?: boolean
}

export default function FactoryItemSidebar({
  itemIds,
  itemMeta,
  searchPlaceholder,
  toggleLabel,
  isSelected,
  onSelect,
  disableSelected = false,
  clearSearchOnSelect = false,
}: FactoryItemSidebarProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [listPage, setListPage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setListPage(0)
  }, [search])

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

  function handleSelect(id: string) {
    if (disableSelected && isSelected(id)) return
    onSelect(id)
    // 多选场景（disableSelected）保持展开，便于连续添加
    if (!disableSelected) setMobileOpen(false)
    if (clearSearchOnSelect) setSearch('')
  }

  function renderItem(id: string, hoverClass: string) {
    const meta = itemMeta[id]
    const selected = isSelected(id)
    const disabled = disableSelected && selected
    return (
      <button
        key={id}
        type="button"
        onClick={() => handleSelect(id)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
          selected
            ? `bg-archive-gold/10 text-archive-gold${disabled ? ' cursor-not-allowed' : ''}`
            : `text-archive-dust hover:text-archive-ivory ${hoverClass}`
        }`}
      >
        <ItemTile itemId={id} size="sm" name={meta?.name} rarity={meta?.rarity} showTips={false} />
        <span className="truncate">{meta?.name || id}</span>
      </button>
    )
  }

  const pagination = (
    <div className="flex items-center justify-center gap-1 text-xs mt-2">
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
  )

  return (
    <div className="md:w-72 shrink-0">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder:text-archive-lead focus:outline-none focus:border-archive-gold/40 mb-3"
      />

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory"
        >
          <span className="flex items-center gap-2 flex-1 min-w-0 text-left">{toggleLabel}</span>
          <svg className={`w-4 h-4 text-archive-lead shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileOpen && (
          <div className="mt-1 max-h-[50vh] overflow-y-auto rounded border border-archive-border bg-archive-file">
            {pagedList.map(id => renderItem(id, 'hover:bg-archive-border'))}
            {filteredIds.length === 0 && (
              <div className="text-sm text-archive-lead py-4 text-center">{t('factory.noRecipes')}</div>
            )}
          </div>
        )}
        {listTotalPages > 1 && mobileOpen && pagination}
      </div>

      <div className="hidden md:block max-h-[70vh] overflow-y-auto space-y-0.5 pr-1">
        {pagedList.map(id => renderItem(id, 'rounded hover:bg-archive-file'))}
        {filteredIds.length === 0 && (
          <div className="text-sm text-archive-lead py-4 text-center">{t('factory.noRecipes')}</div>
        )}
      </div>
      {listTotalPages > 1 && <div className="hidden md:block">{pagination}</div>}
    </div>
  )
}
