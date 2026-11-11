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

export type MessageValidation = { ok: true; message: string } | { ok: false; error: string }

export function validateMessage(raw: unknown): MessageValidation {
  if (typeof raw !== 'string') return { ok: false, error: 'Message must be a string.' }
  // Normalise line endings and strip our own markers so that a message cannot break the envelope.
  const message = raw
    .replace(/\r\n?/g, '\n')
    .split(MARKER).join('')
    .split(MESSAGE_START).join('')
    .split(MESSAGE_END).join('')
    .trim()
  if (message.length === 0) return { ok: false, error: 'Message is empty.' }
  if (Array.from(message).length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` }
  }
  return { ok: true, message }
}

export function giftIssueTitle(senderLogin: string): string {
  return `🎁 A gift from @${senderLogin}`
}

export function buildGiftIssueBody(message: string, siteUrl?: string): string {
  const via = siteUrl ? `[GitGift](${siteUrl})` : 'GitGift'
  return [
    MARKER,
    MESSAGE_START,
    message,
    MESSAGE_END,
    '',
    '---',
    `This gift was wrapped with ${via}. The owner of this box can open it there to add it to the README.`,
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
  const message = text.slice(start + MESSAGE_START.length, end).trim()
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
    rows.push({
      date: dateLink ? dateLink[1] : dateCell,
      issueUrl: dateLink ? dateLink[2] : undefined,
      from: (fromLink ? fromLink[1] : fromCell).replace(/^@/, ''),
      message: unescapeCell(rest.join(' | ')),
    })
  }
  return rows
}
