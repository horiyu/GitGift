import { Fragment, type ReactNode } from 'react'

// Renders a translated string that marks parts with tags, e.g. "Choose <b>Only select</b>".
// Each tag name maps to a function that wraps the enclosed text. Text outside tags, and the
// enclosed text itself, are rendered as plain strings, so translations cannot inject markup.
export function rich(text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const parts: ReactNode[] = []
  const pattern = /<(\w+)>(.*?)<\/\1>/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const wrap = tags[match[1]]
    parts.push(<Fragment key={match.index}>{wrap ? wrap(match[2]) : match[2]}</Fragment>)
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
