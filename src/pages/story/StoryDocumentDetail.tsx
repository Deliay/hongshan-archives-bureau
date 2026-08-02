import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { PrtsDocumentDetail } from './PrtsDocumentDetail'

export default function StoryDocumentDetail() {
  const { itemId } = useParams<{ itemId: string }>()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('cat') || ''

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link
        to={`/archive/story/library${catParam ? `?cat=${catParam}` : ''}`}
        className="text-sm text-archive-dust hover:text-archive-gold transition-colors mb-4 inline-block"
      >
        &larr; {t('story.backToVolume')}
      </Link>
      {itemId ? <PrtsDocumentDetail itemId={itemId} /> : null}
    </div>
  )
}
