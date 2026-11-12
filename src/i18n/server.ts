// Server-side only.

import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from './config'
import { createTranslator, type Translator } from './format'
import { getMessages } from './messages'

// The user's explicit choice (cookie) wins over the browser's Accept-Language.
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(chosen)) return chosen
  return negotiateLocale((await headers()).get('accept-language'))
}

export async function getTranslator(): Promise<Translator> {
  const locale = await getLocale()
  return createTranslator(locale, getMessages(locale))
}
