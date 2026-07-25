const LOCALE_DATE_TAGS: Record<string, string> = {
  CN: 'zh-CN',
  TC: 'zh-TW',
  EN: 'en-US',
  JP: 'ja-JP',
  KR: 'ko-KR',
  RU: 'ru-RU',
  MX: 'es-MX',
  BR: 'pt-BR',
  DE: 'de-DE',
  FR: 'fr-FR',
  VN: 'vi-VN',
  TH: 'th-TH',
  ID: 'id-ID',
  IT: 'it-IT',
}

export function formatActivityTime(ts: number): string {
  const d = new Date(ts + 8 * 3600_000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()} ${hh}:${mm}`
}

export function formatMonthLabel(ts: number, locale: string): string {
  const tag = LOCALE_DATE_TAGS[locale] ?? 'en-US'
  return new Date(ts).toLocaleDateString(tag, { year: 'numeric', month: 'numeric', timeZone: 'UTC' })
}
