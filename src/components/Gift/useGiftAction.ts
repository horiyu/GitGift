'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type State = { status: 'idle' | 'pending' | 'done' | 'error'; message?: string; url?: string }

// POSTs to a GitGift API route and refreshes the server-rendered page on success.
export function useGiftAction() {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'idle' })

  const run = async (path: string, body?: unknown): Promise<boolean> => {
    setState({ status: 'pending' })
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const data: { error?: string; url?: string } = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setState({ status: 'error', message: data.error ?? `Request failed (${res.status}).` })
        return false
      }
      setState({ status: 'done', url: data.url })
      router.refresh()
      return true
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.' })
      return false
    }
  }

  return { state, run }
}
