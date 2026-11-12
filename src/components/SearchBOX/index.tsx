'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersonIcon, SearchIcon } from '@primer/octicons-react'
import { isValidLogin } from '@/lib/gift'
import styles from './searchbox.module.css'

// Looks up a GitHub user and moves to their GitGift page.
// "hero" is the large field on the landing page; "compact" sits in the header and focuses on "/".
export default function SearchBOX({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const login = query.trim().replace(/^@/, '')
    if (!isValidLogin(login)) {
      setError('Enter a valid GitHub username.')
      return
    }
    setError(null)
    setQuery('')
    inputRef.current?.blur()
    router.push(`/${login}`)
  }

  if (variant === 'compact') {
    return (
      <form className={styles.compact} onSubmit={onSubmit} role="search">
        <SearchIcon size={16} className={styles.compactIcon} />
        <input
          ref={inputRef}
          className={`form-control ${styles.compactInput} ${error ? styles.invalid : ''}`}
          type="text"
          placeholder="Find a GitHub user"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setError(null)
          }}
          aria-label="Find a GitHub user"
          aria-invalid={!!error}
          title={error ?? undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className={styles.kbd} aria-hidden="true">
          /
        </kbd>
      </form>
    )
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.hero} onSubmit={onSubmit} role="search">
        <div className={styles.heroField}>
          <PersonIcon size={16} className={styles.heroIcon} />
          <input
            ref={inputRef}
            className={`form-control ${styles.heroInput}`}
            type="text"
            placeholder="GitHub username of the person you want to thank"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setError(null)
            }}
            aria-label="GitHub username"
            aria-invalid={!!error}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-large">
          Find their box
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
