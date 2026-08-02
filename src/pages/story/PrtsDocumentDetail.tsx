import { usePrtsItemDetail } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { Badge } from '../../components/ui/Badge'
import { RichText } from '../../lib/richText'
import { formatArchiveCode } from '../../data/archiveMeta'
import { DialogPlayerBar } from './DialogPlayerBar'
import { RadioPlayer } from './RadioPlayer'

interface PrtsDocumentDetailProps {
  itemId: string
}

export function PrtsDocumentDetail({ itemId }: PrtsDocumentDetailProps) {
  const { t } = useI18n()
  const { data: item, loading, error } = usePrtsItemDetail(itemId)

  if (loading) return <DetailSkeleton />
  if (error) return <div className="text-red-400 text-sm p-6">{t('common.loadFailed')}</div>
  if (!item) return <div className="text-archive-dust text-sm p-6">{t('common.empty')}</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="ghost" className="text-xs">{item.type}</Badge>
          {item.volumeName && <span className="text-xs text-archive-dust">{item.volumeName}</span>}
        </div>
        <h2 className="font-display text-2xl font-bold text-archive-ivory mt-2">{item.name || item.id}</h2>
        <div className="font-mono text-xs text-archive-gold mt-1">{formatArchiveCode('story', item.order)}</div>
        {item.desc && <p className="text-sm text-archive-dust mt-2">{item.desc}</p>}
      </div>

      {(item.type === 'text' || item.type === 'document') && (
        <div>
          {item.contents.length === 0 && (
            <p className="text-archive-dust text-sm">{t('story.emptyContent')}</p>
          )}
          {item.contents.map((content, ci) => (
            <div key={ci}>
              {content.title && <h3 className="text-lg font-medium text-archive-ivory mt-6 mb-2">{content.title}</h3>}
              {content.segments.map((seg, si) => (
                <div key={si} className="text-sm text-archive-ivory leading-relaxed mb-2">
                  <RichText text={seg} imageSize="min(100%, 28rem)" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {item.type === 'multi_media' && item.script && (
        <div>
          <DialogPlayerBar />
          <RadioPlayer script={item.script} />
        </div>
      )}
    </div>
  )
}
