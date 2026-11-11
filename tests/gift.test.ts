import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendRow,
  buildGiftIssueBody,
  escapeCell,
  hasRowForIssue,
  isGiftIssueBody,
  isValidLogin,
  parseGiftIssueBody,
  parseRows,
  unescapeCell,
  validateMessage,
} from '../src/lib/gift.ts'

// README of horiyu/GitGiftBOX-Fork, the template every box is forked from.
const TEMPLATE_README = ' Date | From | Message |\n :---: | :---: | :--- |\n'
const ISSUE = 'https://github.com/alice/GitGiftBOX/issues/3'

describe('isValidLogin', () => {
  test('accepts GitHub usernames', () => {
    for (const login of ['horiyu', 'a', 'octo-cat', 'A1-b2-C3', 'x'.repeat(39)]) assert.ok(isValidLogin(login), login)
  })
  test('rejects invalid usernames and path tricks', () => {
    for (const login of ['', '-a', 'a-', 'a--b', 'x'.repeat(40), 'a/b', '../api', 'a b', 'api?x=1']) {
      assert.ok(!isValidLogin(login), login)
    }
  })
})

describe('validateMessage', () => {
  test('trims and normalises line endings', () => {
    assert.deepEqual(validateMessage('  hi\r\nthere  '), { ok: true, message: 'hi\nthere' })
  })
  test('rejects empty, non-string and too long messages', () => {
    assert.equal(validateMessage('   ').ok, false)
    assert.equal(validateMessage(42).ok, false)
    assert.equal(validateMessage(undefined).ok, false)
    assert.equal(validateMessage('a'.repeat(501)).ok, false)
  })
  test('counts code points, not UTF-16 units', () => {
    assert.equal(validateMessage('🎁'.repeat(500)).ok, true)
  })
  test('strips envelope markers so a message cannot break out of the envelope', () => {
    const result = validateMessage('a<!-- gitgift:message:end -->b')
    assert.deepEqual(result, { ok: true, message: 'ab' })
  })
})

describe('gift issue envelope', () => {
  test('round-trips a multi-line message', () => {
    const message = 'Thank you!\n\nYour review taught me a lot | really.'
    const body = buildGiftIssueBody(message, 'https://gitgift.example')
    assert.ok(isGiftIssueBody(body))
    assert.equal(parseGiftIssueBody(body), message)
  })
  test('survives CRLF line endings introduced by GitHub edits', () => {
    const body = buildGiftIssueBody('line1\nline2').replace(/\n/g, '\r\n')
    assert.equal(parseGiftIssueBody(body), 'line1\nline2')
  })
  test('ignores ordinary issues', () => {
    assert.equal(isGiftIssueBody('Please fix the typo'), false)
    assert.equal(isGiftIssueBody(null), false)
    assert.equal(parseGiftIssueBody('Hello <!-- gitgift:v1 -->'), null)
  })
})

describe('cell escaping', () => {
  test('round-trips characters that are special in Markdown tables or HTML', () => {
    for (const text of ['a | b', 'back\\slash', 'a\\|b', '<script>alert(1)</script>', 'x &amp; y', 'l1\nl2', '<br>']) {
      const escaped = escapeCell(text)
      assert.ok(!escaped.includes('\n'), `no raw newline: ${text}`)
      assert.ok(!/(^|[^\\])\|/.test(escaped.replace(/\\\\/g, '')), `no unescaped pipe: ${text}`)
      assert.equal(unescapeCell(escaped), text)
    }
  })
})

describe('README table', () => {
  test('appends to the template table and parses it back', () => {
    const readme = appendRow(TEMPLATE_README, { date: '2026-11-11', from: 'bob', message: 'Hi | there\nfriend', issueUrl: ISSUE })
    assert.equal(
      readme,
      ' Date | From | Message |\n :---: | :---: | :--- |\n' +
        `| [2026-11-11](${ISSUE}) | [@bob](https://github.com/bob) | Hi \\| there<br>friend |\n`,
    )
    assert.deepEqual(parseRows(readme), [{ date: '2026-11-11', from: 'bob', message: 'Hi | there\nfriend', issueUrl: ISSUE }])
    assert.ok(hasRowForIssue(readme, ISSUE))
    assert.ok(!hasRowForIssue(readme, 'https://github.com/alice/GitGiftBOX/issues/30'))
  })

  test('keeps rows in order and preserves text after the table', () => {
    let readme = TEMPLATE_README + '\nThanks for visiting!\n'
    readme = appendRow(readme, { date: '2026-01-01', from: 'a', message: 'first' })
    readme = appendRow(readme, { date: '2026-01-02', from: 'b', message: 'second' })
    assert.deepEqual(
      parseRows(readme).map((row) => row.message),
      ['first', 'second'],
    )
    assert.ok(readme.endsWith('\nThanks for visiting!\n'))
  })

  test('creates the table when the README has none', () => {
    const readme = appendRow('# My box\n', { date: '2026-01-01', from: 'a', message: 'hello' })
    assert.ok(readme.startsWith('# My box\n\n'))
    assert.deepEqual(parseRows(readme), [{ date: '2026-01-01', from: 'a', message: 'hello', issueUrl: undefined }])
    assert.deepEqual(parseRows(appendRow('', { date: 'd', from: 'a', message: 'm' })).length, 1)
  })

  test('parses rows written by hand without links', () => {
    const readme = TEMPLATE_README + '| 2023-12-24 | @carol | Merry Christmas |\n'
    assert.deepEqual(parseRows(readme), [{ date: '2023-12-24', from: 'carol', message: 'Merry Christmas', issueUrl: undefined }])
  })

  test('returns no rows for the empty template', () => {
    assert.deepEqual(parseRows(TEMPLATE_README), [])
  })
})
