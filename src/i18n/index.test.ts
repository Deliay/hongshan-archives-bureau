import { describe, it, expect } from 'vitest'
import { translate } from './index'

describe('i18n translate', () => {
  it('returns current locale text', () => {
    expect(translate('EN', 'nav.operators')).toBe('Operators')
  })

  it('returns correct locale text for keys with full translation coverage', () => {
    expect(translate('MX', 'site.name')).toBe('Archivo de Hongshan')
    expect(translate('DE', 'site.name')).toBe('Hongshan-Archiv')
    expect(translate('FR', 'site.name')).toBe('Archives Hongshan')
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

  it('new common.loading* keys have translations in all locales', () => {
    for (const locale of ['CN', 'TC', 'EN', 'JP', 'KR', 'RU', 'MX', 'BR', 'DE', 'FR', 'VN', 'TH', 'ID', 'IT']) {
      const archive = translate(locale, 'common.loadingArchive')
      expect(archive).not.toBe('common.loadingArchive')
      const retry = translate(locale, 'common.loadingRetry')
      expect(retry).not.toBe('common.loadingRetry')
    }
  })

  it('nav.search has proper translations in all locales', () => {
    expect(translate('MX', 'nav.search')).not.toBe('档案搜索')
    expect(translate('TH', 'nav.search')).not.toBe('档案搜索')
    expect(translate('EN', 'nav.search')).toBe('Archive Search')
    expect(translate('CN', 'nav.search')).toBe('档案搜索')
  })

  it('search.resultCount variable interpolation works', () => {
    expect(translate('CN', 'search.resultCount', { count: 3 })).toBe('找到 3 条相关记载')
    expect(translate('EN', 'search.resultCount', { count: 3 })).toBe('Found 3 related records')
  })

  it('common.loadingRequestCount variable interpolation works', () => {
    expect(translate('CN', 'common.loadingRequestCount', { count: 5 })).toBe('正在调阅 5 份档案')
    expect(translate('EN', 'common.loadingRequestCount', { count: 5 })).toBe('Loading 5 archives...')
  })

  it('search.prev and search.next have proper locale-specific translations', () => {
    expect(translate('JP', 'search.prev')).toBe('前へ')
    expect(translate('JP', 'search.next')).toBe('次へ')
    expect(translate('CN', 'search.prev')).toBe('上一页')
    expect(translate('CN', 'search.next')).toBe('下一页')
  })
})
