'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from './config'
import { createTranslator, type Translator } from './format'
import type { Messages } from './messages/en'

const I18nContext = createContext<Translator | null>(null)

// Only the active locale's messages are sent to the browser.
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const translator = useMemo(() => createTranslator(locale, messages), [locale, messages])
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>
}

export function useI18n(): Translator {
  const translator = useContext(I18nContext)
  if (!translator) throw new Error('useI18n must be used inside <I18nProvider>.')
  return translator
}
