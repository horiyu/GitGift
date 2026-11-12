// Locale-independent message formatting, shared by server and client code.

import type { Locale } from './config'
import type { MessageKey, Messages } from './messages/en'

export type Params = Record<string, string | number>

// Replaces {name} placeholders.
export function format(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

// Keys that have plural forms are stored as "<key>.one" and "<key>.other".
type PluralBase = MessageKey extends infer K ? (K extends `${infer B}.other` ? B : never) : never

export type Translator = {
  locale: Locale
  t: (key: MessageKey, params?: Params) => string
  // Picks the plural form for `count` (exposed to the template as {count}).
  tp: (key: PluralBase, count: number, params?: Params) => string
  date: (value: string) => string
}

export function createTranslator(locale: Locale, messages: Messages): Translator {
  const rules = new Intl.PluralRules(locale)
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
  return {
    locale,
    t: (key, params) => format(messages[key], params),
    tp: (key, count, params) => {
      const form = rules.select(count) === 'one' ? 'one' : 'other'
      const entry = messages[`${key}.${form}` as MessageKey] ?? messages[`${key}.other` as MessageKey]
      return format(entry, { count, ...params })
    },
    // Dates are shown as YYYY-MM-DD in README tables; anything else is shown as written.
    date: (value) => (/^\d{4}-\d{2}-\d{2}/.test(value) ? dateFormat.format(new Date(value.slice(0, 10))) : value),
  }
}
