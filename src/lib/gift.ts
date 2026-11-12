// Pure helpers for wrapping a gift into an Issue and unwrapping it into the
// GitGiftBOX README table. No I/O here so that the format can be unit-tested.

export const BOX_REPO = 'GitGiftBOX'
export const MAX_MESSAGE_LENGTH = 500

const MARKER = '<!-- gitgift:v1 -->'
const MESSAGE_START = '<!-- gitgift:message:start -->'
const MESSAGE_END = '<!-- gitgift:message:end -->'

// GitHub usernames: alphanumerics and single hyphens, no leading/trailing hyphen, max 39 chars.
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

export function isValidLogin(login: string): boolean {
  return LOGIN_PATTERN.test(login)
}

export type MessageValidation =
  | { ok: true; message: string }
  | { ok: false; error: string; code: 'messageType' | 'messageEmpty' | 'messageTooLong' }

export function validateMessage(raw: unknown): MessageValidation {
  if (typeof raw !== 'string') return { ok: false, error: 'Message must be a string.', code: 'messageType' }
  // Normalise line endings and strip our own markers so that a message cannot break the envelope.
  const message = raw
    .replace(/\r\n?/g, '\n')
    .split(MARKER).join('')
    .split(MESSAGE_START).join('')
    .split(MESSAGE_END).join('')
    .trim()
  if (message.length === 0) return { ok: false, error: 'Message is empty.', code: 'messageEmpty' }
  if (Array.from(message).length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`, code: 'messageTooLong' }
  }
  return { ok: true, message }
}

export function giftIssueTitle(senderLogin: string): string {
  return `🎁 A gift from @${senderLogin}`
}

// A fence longer than any backtick run in the message, so the message cannot close it early.
export function fenceFor(message: string): string {
  const longestRun = Math.max(0, ...(message.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longestRun + 1))
}

// The message is placed in a fenced code block. GitHub does not process @mentions, #references
// or autolinks inside code, so a gift cannot be used to notify or cross-reference third parties.
export function buildGiftIssueBody(message: string, siteUrl?: string): string {
  const via = siteUrl ? `[GitGift](${siteUrl})` : 'GitGift'
  const fence = fenceFor(message)
  return [
    MARKER,
    MESSAGE_START,
    `${fence}text`,
    message,
    fence,
    MESSAGE_END,
    '',
    '---',
    `This gift was wrapped with ${via}. It is public. The owner of this box can open it there to add it to the README.`,
  ].join('\n')
}

export function isGiftIssueBody(body: string | null | undefined): boolean {
  return typeof body === 'string' && body.replace(/\r\n?/g, '\n').trimStart().startsWith(MARKER)
}

export function parseGiftIssueBody(body: string | null | undefined): string | null {
  if (!isGiftIssueBody(body)) return null
  const text = body!.replace(/\r\n?/g, '\n')
  const start = text.indexOf(MESSAGE_START)
  const end = text.indexOf(MESSAGE_END, start + MESSAGE_START.length)
  if (start === -1 || end === -1) return null
  let message = text.slice(start + MESSAGE_START.length, end).trim()
  // Unwrap the code fence (gifts from before the fence was introduced have none).
  const lines = message.split('\n')
  const open = lines[0]?.match(/^(`{3,})[^`]*$/)
  if (open && lines.length >= 2 && lines[lines.length - 1] === open[1]) {
    message = lines.slice(1, -1).join('\n').trim()
  }
  return message.length > 0 ? message : null
}

// ---- README table -------------------------------------------------------

export type GiftRow = {
  date: string
  from: string
  message: string
  issueUrl?: string
}

export function escapeCell(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n?|\n/g, '<br>')
}

export function unescapeCell(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\([\\|])/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function formatRow(row: GiftRow): string {
  const date = row.issueUrl ? `[${row.date}](${row.issueUrl})` : row.date
  return `| ${date} | [@${row.from}](https://github.com/${row.from}) | ${escapeCell(row.message)} |`
}

export function hasRowForIssue(readme: string, issueUrl: string): boolean {
  return readme.includes(`](${issueUrl})`)
}

const SEPARATOR_PATTERN = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/

// Appends a row directly after the last row of the first table in the README.
// Falls back to creating the table when the README has none.
export function appendRow(readme: string, row: GiftRow): string {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n')
  const sepIndex = lines.findIndex((line) => SEPARATOR_PATTERN.test(line))
  const newRow = formatRow(row)
  if (sepIndex === -1) {
    const header = [' Date | From | Message |', ' :---: | :---: | :--- |', newRow]
    const base = readme.replace(/\s+$/, '')
    return (base.length > 0 ? `${base}\n\n` : '') + header.join('\n') + '\n'
  }
  let last = sepIndex
  while (last + 1 < lines.length && lines[last + 1].trim().startsWith('|')) last++
  lines.splice(last + 1, 0, newRow)
  const result = lines.join('\n')
  return result.endsWith('\n') ? result : `${result}\n`
}

// Splits a table row on unescaped pipes.
function splitCells(line: string): string[] {
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      current += ch + line[i + 1]
      i++
    } else if (ch === '|') {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  if (line.trim().startsWith('|')) cells.shift()
  if (line.trim().endsWith('|') && !line.trim().endsWith('\\|')) cells.pop()
  return cells.map((c) => c.trim())
}

// A link to an Issue on some user's GitGiftBOX. Anything else in a README cell is not trusted as a URL.
const BOX_ISSUE_URL = new RegExp(`^https://github\\.com/([A-Za-z0-9-]{1,39})/${BOX_REPO}/issues/([1-9]\\d{0,9})$`)

// The Issue number when `url` points to an Issue on `owner`'s GitGiftBOX, otherwise null.
export function boxIssueNumber(url: string | undefined, owner: string): number | null {
  const match = url?.match(BOX_ISSUE_URL)
  if (!match || match[1].toLowerCase() !== owner.toLowerCase()) return null
  return Number(match[2])
}

// Parses the gift table of a README. The README is written by the box owner, so values are
// untrusted: rows whose sender is not a valid GitHub login are dropped, and a link is kept only
// when it points to a GitGiftBOX Issue.
export function parseRows(readme: string): GiftRow[] {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n')
  const sepIndex = lines.findIndex((line) => SEPARATOR_PATTERN.test(line))
  if (sepIndex === -1) return []
  const rows: GiftRow[] = []
  for (let i = sepIndex + 1; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const cells = splitCells(lines[i])
    if (cells.length < 3) continue
    const [dateCell, fromCell, ...rest] = cells
    const dateLink = dateCell.match(/^\[([^\]]*)\]\(([^)]+)\)$/)
    const fromLink = fromCell.match(/^\[@?([^\]]+)\]\([^)]*\)$/)
    const from = (fromLink ? fromLink[1] : fromCell).replace(/^@/, '')
    if (!isValidLogin(from)) continue
    const issueUrl = dateLink && BOX_ISSUE_URL.test(dateLink[2]) ? dateLink[2] : undefined
    rows.push({
      date: dateLink ? dateLink[1] : dateCell,
      issueUrl,
      from,
      message: unescapeCell(rest.join(' | ')),
    })
  }
  return rows
}

// ---- Verifying README rows against their Issues --------------------------

// What GitHub records about the Issue a README row links to.
export type IssueEvidence = {
  number: number
  author: string | null
  // Last editor of the Issue body; null when the body was never edited.
  editor: string | null
  body: string | null
}

export type VerifiedGift = { number: number; issueUrl: string; date: string; from: string; message: string }

// Keeps only rows that GitHub can vouch for: the row links to an Issue on this owner's box,
// the Issue was written (and, if edited, last edited) by the sender the row names, and the
// row's message is exactly the message in that Issue. Anything else could have been typed
// into the README by the box owner and is not shown under someone else's name.
export function verifyRows(rows: GiftRow[], owner: string, evidence: Map<number, IssueEvidence>): VerifiedGift[] {
  const seen = new Set<number>()
  const verified: VerifiedGift[] = []
  for (const row of rows) {
    const number = boxIssueNumber(row.issueUrl, owner)
    if (number === null || seen.has(number)) continue
    const issue = evidence.get(number)
    if (!issue?.author || issue.author.toLowerCase() !== row.from.toLowerCase()) continue
    if (issue.editor && issue.editor.toLowerCase() !== issue.author.toLowerCase()) continue
    if (parseGiftIssueBody(issue.body) !== row.message) continue
    seen.add(number)
    verified.push({ number, issueUrl: row.issueUrl!, date: row.date, from: issue.author, message: row.message })
  }
  return verified
}
