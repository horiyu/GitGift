import { NextResponse } from 'next/server'
import { format, type Params } from '@/i18n/format'
import en, { type ErrorCode } from '@/i18n/messages/en'

// JSON error for the API routes. `code` and `params` let the browser show the message in the
// user's language; `error` is the English text for other clients and logs.
export function apiError(code: ErrorCode, status: number, params?: Params): NextResponse {
  return NextResponse.json({ error: format(en[`errors.${code}`], params), code, params }, { status })
}

export type { ErrorCode }
