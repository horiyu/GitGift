'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/client'
import type { Params } from '@/i18n/format'
import type { ErrorCode } from '@/i18n/messages/en'

type State = { status: 'idle' | 'pending' | 'done' | 'error'; message?: string; code?: ErrorCode; url?: string }

type ApiResponse = { error?: string; code?: ErrorCode; params?: Params; url?: string }

// Error codes meaning the recipient has no box that can take a gift yet.
export const NOT_READY_CODES: readonly ErrorCode[] = ['noBox', 'issuesOff', 'notConnected']

// POSTs JSON to a GitGift API route and refreshes the server-rendered page on success.
// The API routes require application/json and a same-origin request (CSRF defence).
// Errors come back as codes and are shown in the user's language.
export function useGiftAction() {
  const router = useRouter()
  const { t } = useI18n()
  const [state, setState] = useState<State>({ status: 'idle' })

  const run = async (path: string, body: unknown = {}): Promise<boolean> => {
    setState({ status: 'pending' })
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: ApiResponse = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        const message = data.code ? t(`errors.${data.code}`, data.params) : t('errors.requestFailed', { status: res.status })
        setState({ status: 'error', message, code: data.code })
        return false
      }
      setState({ status: 'done', url: data.url })
      router.refresh()
      return true
    } catch {
      setState({ status: 'error', message: t('errors.network') })
      return false
    }
  }

  return { state, run }
}
