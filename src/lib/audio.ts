const AUDIO_LOCALE_MAP: Record<string, string> = {
  CN: 'chinese',
  TC: 'chinese',
  EN: 'english',
  JP: 'japanese',
  KR: 'korean',
}

const AUDIO_BASE_URL = 'https://endfield-assets.fffdan.com/audios/dialogs/vo'

export function getAudioUrl(voId: string, locale: string): string {
  const lang = AUDIO_LOCALE_MAP[locale] ?? 'english'
  return `${AUDIO_BASE_URL}/${lang}/${voId}`
}
