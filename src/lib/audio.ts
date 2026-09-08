import { getApiBase } from './api'

const AUDIO_LOCALE_MAP: Record<string, string> = {
  CN: 'chinese',
  TC: 'chinese',
  EN: 'english',
  JP: 'japanese',
  KR: 'korean',
}

export function getAudioUrl(voId: string, locale: string): string {
  const lang = AUDIO_LOCALE_MAP[locale] ?? 'english'
  return `${getApiBase()}/audios/dialogs/vo/${lang}/${voId}`
}

export function getMusicUrl(itemId: string): string {
  return `${getApiBase()}/audios/music/spaceship/${itemId}`
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
