import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendRow,
  boxIssueNumber,
  buildGiftIssueBody,
  escapeCell,
  fenceFor,
  hasRowForIssue,
  isGiftIssueBody,
  isValidLogin,
  parseGiftIssueBody,
  parseRows,
  unescapeCell,
  validateMessage,
  verifyRows,
  type IssueEvidence,
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
  test('puts the message in a code fence so mentions and references are not processed', () => {
    const body = buildGiftIssueBody('Thanks @octocat for #12 and https://github.com/a/b/issues/1')
    const lines = body.split('\n')
    const start = lines.indexOf('```text')
    assert.ok(start > 0, 'opening fence present')
    assert.equal(lines[start + 1], 'Thanks @octocat for #12 and https://github.com/a/b/issues/1')
    assert.equal(lines[start + 2], '```')
  })
  test('uses a fence longer than any backtick run in the message', () => {
    assert.equal(fenceFor('no ticks'), '```')
    assert.equal(fenceFor('a ```` b'), '`````')
    const message = 'code: ```\nstill inside ```` the gift'
    const body = buildGiftIssueBody(message)
    assert.ok(body.includes('`````text\n'))
    assert.equal(parseGiftIssueBody(body), message)
  })
  test('still parses gifts written before the fence was introduced', () => {
    const legacy = '<!-- gitgift:v1 -->\n<!-- gitgift:message:start -->\nhello\n<!-- gitgift:message:end -->\n'
    assert.equal(parseGiftIssueBody(legacy), 'hello')
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

describe('untrusted README values', () => {
  test('drops rows whose sender is not a GitHub login', () => {
    const readme =
      TEMPLATE_README +
      '| 2026-01-01 | [@/evil.com](https://evil.com) | redirect |\n' +
      '| 2026-01-02 | @../api | traversal |\n' +
      '| 2026-01-03 | @carol | ok |\n'
    assert.deepEqual(
      parseRows(readme).map((row) => row.from),
      ['carol'],
    )
  })

  test('keeps a link only when it points to a GitGiftBOX Issue', () => {
    const readme =
      TEMPLATE_README +
      '| [d](javascript:alert(1)//issues/1) | @a | m |\n' +
      '| [d](https://evil.com/alice/GitGiftBOX/issues/1) | @a | m |\n' +
      '| [d](https://github.com/alice/GitGiftBOX/issues/1?x=1) | @a | m |\n' +
      `| [d](${ISSUE}) | @a | m |\n`
    assert.deepEqual(
      parseRows(readme).map((row) => row.issueUrl),
      [undefined, undefined, undefined, ISSUE],
    )
  })

  test('boxIssueNumber requires the owner\'s own box', () => {
    assert.equal(boxIssueNumber(ISSUE, 'alice'), 3)
    assert.equal(boxIssueNumber(ISSUE, 'ALICE'), 3)
    assert.equal(boxIssueNumber(ISSUE, 'bob'), null)
    assert.equal(boxIssueNumber(undefined, 'alice'), null)
  })
})

describe('verifyRows', () => {
  const body = (message: string) => buildGiftIssueBody(message)
  const evidence = (entries: IssueEvidence[]) => new Map(entries.map((entry) => [entry.number, entry]))
  const row = (n: number, from: string, message: string, owner = 'alice') => ({
    date: '2026-01-01',
    from,
    message,
    issueUrl: `https://github.com/${owner}/GitGiftBOX/issues/${n}`,
  })

  test('accepts a row that matches the Issue its sender wrote', () => {
    const result = verifyRows([row(3, 'Bob', 'thanks')], 'alice', evidence([{ number: 3, author: 'bob', editor: null, body: body('thanks') }]))
    assert.deepEqual(result, [{ number: 3, issueUrl: row(3, 'Bob', '').issueUrl, date: '2026-01-01', from: 'bob', message: 'thanks' }])
  })

  test('accepts an Issue the sender edited themselves', () => {
    const result = verifyRows([row(3, 'bob', 'thanks')], 'alice', evidence([{ number: 3, author: 'bob', editor: 'bob', body: body('thanks') }]))
    assert.equal(result.length, 1)
  })

  test('rejects rows the owner could have forged', () => {
    const issues = evidence([
      { number: 3, author: 'bob', editor: null, body: body('thanks') },
      { number: 4, author: 'bob', editor: 'alice', body: body('I endorse alice') },
    ])
    const rows = [
      { date: 'd', from: 'torvalds', message: 'fake', issueUrl: undefined }, // no Issue at all
      row(3, 'torvalds', 'thanks'), // names someone other than the Issue author
      row(3, 'bob', 'thanks, and I endorse alice'), // text differs from the Issue
      row(4, 'bob', 'I endorse alice'), // Issue body last edited by the owner
      row(9, 'bob', 'thanks'), // Issue does not exist
      row(3, 'bob', 'thanks', 'mallory'), // Issue on another user's box
    ]
    assert.deepEqual(verifyRows(rows, 'alice', issues), [])
  })

  test('shows each Issue at most once', () => {
    const issues = evidence([{ number: 3, author: 'bob', editor: null, body: body('thanks') }])
    assert.equal(verifyRows([row(3, 'bob', 'thanks'), row(3, 'bob', 'thanks')], 'alice', issues).length, 1)
  })
})
