import { PlaceholderPage } from '../../components/Layout/PlaceholderPage'
import { useI18n } from '../../i18n'

export default function EquipmentOverview() {
  const { t } = useI18n()
  return <PlaceholderPage title={t('nav.equipment')} code="HSA-EQP" />
}
