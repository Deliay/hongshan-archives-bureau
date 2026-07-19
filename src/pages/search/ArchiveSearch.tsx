import { useState } from 'react'
import { useI18n } from '../../i18n'
import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { useArchiveSearch } from '../../hooks/useData'
import ArchiveSearchResults from '../../components/Search/ArchiveSearchResults'

export default function ArchiveSearch() {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const { results, entities, total, page, pageSize, loading, error, setPage } = useArchiveSearch(query)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setQuery(input)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('search.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.search}</Badge>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="w-full px-4 py-2.5 rounded border border-archive-border bg-archive-file text-sm text-archive-ivory placeholder-archive-lead focus:outline-none focus:border-archive-gold/50 transition-colors mb-4"
      />

      {!query && !loading && !error && (
        <div className="text-archive-dust text-sm p-4 text-center">
          {t('search.hint')}
        </div>
      )}

      {query && (
        <ArchiveSearchResults
          query={query}
          results={results}
          entities={entities}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          error={error}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
