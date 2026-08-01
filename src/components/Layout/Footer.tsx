import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-archive-border py-6 text-center text-xs text-archive-lead">
      <p className="text-archive-dust">{t('site.footer')}</p>
      <p className="mt-1">
        {t('site.dataSourcePrefix')}
        <a
          href="https://endfield-assets.fffdan.com/scalar"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-archive-gold transition-colors"
        >
          {t('site.dataSourceApiName')}
        </a>
        <span> · </span>
        <a
          href="https://www.akedata.wiki/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-archive-gold transition-colors"
        >
          AKEData
        </a>
      </p>
    </footer>
  )
}
