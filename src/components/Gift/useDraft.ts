'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// A message being written to `to`, kept only in this browser's localStorage. It is never sent
// to the server, so a sender can write a gift before the recipient has a box and send it later.
// Storage can be unavailable (private mode, blocked site data); the form then works without it.

const PREFIX = 'gitgift:draft:'

function keyFor(to: string): string {
  return PREFIX + to.toLowerCase()
}

function read(to: string): string {
  try {
    return window.localStorage.getItem(keyFor(to)) ?? ''
  } catch {
    return ''
  }
}

function write(to: string, text: string): boolean {
  try {
    if (text.trim()) window.localStorage.setItem(keyFor(to), text)
    else window.localStorage.removeItem(keyFor(to))
    return true
  } catch {
    return false
  }
}

export function useDraft(to: string) {
  const [text, setText] = useState('')
  // Whether a non-empty draft was found when the page loaded.
  const [restored, setRestored] = useState(false)
  const [saved, setSaved] = useState(false)
  const loaded = useRef(false)

  // Read after mount: localStorage does not exist during server rendering.
  useEffect(() => {
    const initial = read(to)
    if (initial.trim()) {
      setText(initial)
      setRestored(true)
    }
    loaded.current = true
  }, [to])

  // Save shortly after typing stops.
  useEffect(() => {
    if (!loaded.current) return
    const timer = window.setTimeout(() => setSaved(write(to, text) && text.trim().length > 0), 400)
    return () => window.clearTimeout(timer)
  }, [to, text])

  const clear = useCallback(() => {
    write(to, '')
    setText('')
    setSaved(false)
    setRestored(false)
  }, [to])

  return { text, setText, restored, saved, clear }
}
