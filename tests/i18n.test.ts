import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { LOCALES, negotiateLocale } from '../src/i18n/config.ts'
import { createTranslator, format } from '../src/i18n/format.ts'
import type { Locale } from '../src/i18n/config.ts'
import type { Messages } from '../src/i18n/messages/en.ts'
import de from '../src/i18n/messages/de.ts'
import en from '../src/i18n/messages/en.ts'
import es from '../src/i18n/messages/es.ts'
import fr from '../src/i18n/messages/fr.ts'
import ja from '../src/i18n/messages/ja.ts'
import ko from '../src/i18n/messages/ko.ts'
import ptBR from '../src/i18n/messages/pt-BR.ts'
import zhCN from '../src/i18n/messages/zh-CN.ts'

// Mirrors src/i18n/messages/index.ts (Node's test runner needs explicit .ts extensions).
const ALL: Record<Locale, Messages> = { en, ja, 'zh-CN': zhCN, ko, es, 'pt-BR': ptBR, fr, de }
const getMessages = (locale: Locale) => ALL[locale]

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()
const tags = (text: string) => (text.match(/<\/?\w+>/g) ?? []).sort()

describe('translations', () => {
  for (const { code } of LOCALES) {
    test(`${code} has every key with the same placeholders and tags as English`, () => {
      const messages = getMessages(code)
      assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort())
      for (const [key, english] of Object.entries(en)) {
        const translated = messages[key as keyof typeof en]
        assert.ok(translated.trim().length > 0, `${code} ${key} is empty`)
        // Plural forms may legitimately omit {count} in one form, but never add unknown names.
        assert.deepEqual(placeholders(translated), placeholders(english), `${code} ${key} placeholders`)
        assert.deepEqual(tags(translated), tags(english), `${code} ${key} tags`)
      }
    })
  }
})

describe('negotiateLocale', () => {
  test('falls back to English', () => {
    assert.equal(negotiateLocale(null), 'en')
    assert.equal(negotiateLocale(''), 'en')
    assert.equal(negotiateLocale('it-IT,it;q=0.9'), 'en')
  })
  test('uses quality values and base languages', () => {
    assert.equal(negotiateLocale('ja,en-US;q=0.8'), 'ja')
    assert.equal(negotiateLocale('en;q=0.5, de;q=0.9'), 'de')
    assert.equal(negotiateLocale('zh-TW'), 'zh-CN')
    assert.equal(negotiateLocale('pt-PT'), 'pt-BR')
    assert.equal(negotiateLocale('KO-kr'), 'ko')
    assert.equal(negotiateLocale('fr;q=0, es'), 'es')
  })
})

describe('translator', () => {
  test('formats placeholders and plurals', () => {
    assert.equal(format('Hi {name}, {missing}', { name: 'A' }), 'Hi A, {missing}')
    const t = createTranslator('en', getMessages('en'))
    assert.equal(t.tp('user.kept', 1), '<b>1</b> gift kept')
    assert.equal(t.tp('user.kept', 3), '<b>3</b> gifts kept')
    const ja = createTranslator('ja', getMessages('ja'))
    assert.equal(ja.tp('user.kept', 1), '受け取ったギフト <b>1</b> 件')
  })
  test('formats README dates and leaves other text alone', () => {
    const t = createTranslator('en', getMessages('en'))
    assert.equal(t.date('2026-11-11'), 'Nov 11, 2026')
    assert.equal(t.date('Christmas'), 'Christmas')
  })
})
