// Supported UI languages. The locale is not part of the URL, because /<segment> is a GitHub
// username (a user called "ja" exists); it comes from a cookie or the Accept-Language header.

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'gitgift-locale'

const CODES: readonly string[] = LOCALES.map((locale) => locale.code)

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && CODES.includes(value)
}

// Picks the best supported locale for an Accept-Language header, e.g. "ja,en-US;q=0.8".
// An exact match wins; otherwise the base language is used ("zh-TW" → "zh-CN", "pt" → "pt-BR").
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const ranges = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const quality = q ? Number(q.slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index }
    })
    .filter((range) => range.tag && range.tag !== '*' && range.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)

  for (const { tag } of ranges) {
    const exact = LOCALES.find((locale) => locale.code.toLowerCase() === tag)
    if (exact) return exact.code
    const base = tag.split('-')[0]
    const sameLanguage = LOCALES.find((locale) => locale.code.toLowerCase().split('-')[0] === base)
    if (sameLanguage) return sameLanguage.code
  }
  return DEFAULT_LOCALE
}
