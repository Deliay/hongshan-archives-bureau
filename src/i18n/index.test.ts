import { describe, it, expect } from 'vitest'
import { translate } from './index'

describe('i18n translate', () => {
  it('returns current locale text', () => {
    expect(translate('EN', 'nav.operators')).toBe('Operators')
  })

  it('falls back to EN when key missing in target locale', () => {
    // 'site.name' is site-specific and only available in supported UI locales,
    // so use a synthetic locale that is present in messages but lacks the key.
    expect(translate('MX', 'site.name')).toBe('Hongshan Archives Bureau')
  })

  it('falls back to CN when key missing in both target and EN', () => {
    expect(translate('EN', 'site.subtitle')).toBe('Talos-II Official Archive Management and Retrieval System')
  })

  it('falls back to key when missing everywhere', () => {
    expect(translate('CN', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('replaces variables', () => {
    expect(translate('CN', 'common.countPeople', { count: 3 })).toBe('3 人')
    expect(translate('EN', 'common.backToList', { list: 'Operators' })).toBe('Back to Operators list')
  })
})
