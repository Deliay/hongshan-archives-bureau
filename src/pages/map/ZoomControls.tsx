import { useI18n } from '../../i18n'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

export default function ZoomControls({ onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  const { t } = useI18n()
  const buttonClass =
    'w-8 h-8 flex items-center justify-center text-archive-dust hover:text-archive-gold hover:bg-archive-border transition-colors first:rounded-t last:rounded-b border-b border-archive-border last:border-b-0'
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col rounded border border-archive-border bg-archive-file shadow-lg">
      <button type="button" aria-label={t('map.zoomIn')} title={t('map.zoomIn')} onClick={onZoomIn} className={buttonClass}>
        +
      </button>
      <button type="button" aria-label={t('map.zoomOut')} title={t('map.zoomOut')} onClick={onZoomOut} className={buttonClass}>
        −
      </button>
      <button type="button" aria-label={t('map.zoomFit')} title={t('map.zoomFit')} onClick={onFit} className={buttonClass}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </div>
  )
}
