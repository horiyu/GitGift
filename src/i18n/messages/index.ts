import type { Locale } from '../config'
import de from './de'
import en, { type Messages } from './en'
import es from './es'
import fr from './fr'
import ja from './ja'
import ko from './ko'
import ptBR from './pt-BR'
import zhCN from './zh-CN'

const MESSAGES: Record<Locale, Messages> = { en, ja, 'zh-CN': zhCN, ko, es, 'pt-BR': ptBR, fr, de }

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale]
}
