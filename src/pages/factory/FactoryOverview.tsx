import { PlaceholderPage } from '../../components/Layout/PlaceholderPage'
import { useI18n } from '../../i18n'

export default function FactoryOverview() {
  const { t } = useI18n()
  return <PlaceholderPage title={t('nav.factory')} code="HSA-FAC" />
}
