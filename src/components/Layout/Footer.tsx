import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-archive-border mt-16 py-6 text-center text-xs text-archive-lead">
      <p className="text-archive-dust">{t('site.footer')}</p>
      <p className="mt-1">{t('site.dataSource')}</p>
    </footer>
  )
}
