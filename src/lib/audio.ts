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

const MUSIC_BASE_URL = 'https://endfield-assets.fffdan.com/audios/music/spaceship'

export function getMusicUrl(itemId: string): string {
  return `${MUSIC_BASE_URL}/${itemId}`
}

const audioHeadCache = new Map<string, Promise<boolean>>()

export function checkAudioUrl(url: string): Promise<boolean> {
  if (!audioHeadCache.has(url)) {
    const p = fetch(url, { method: 'HEAD' })
      .then(res => res.ok)
      .catch(() => false)
    audioHeadCache.set(url, p)
  }
  return audioHeadCache.get(url)!
}

export function clearAudioUrlCache(): void {
  audioHeadCache.clear()
}
