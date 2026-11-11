'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isValidLogin } from '@/lib/gift'
import styles from './searchbox.module.css'

// Looks up a GitHub user and moves to their GitGift page.
export default function SearchBOX({ placeholder = '' }: { placeholder?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const login = query.trim().replace(/^@/, '')
    if (!isValidLogin(login)) {
      setError('Enter a GitHub username.')
      return
    }
    setError(null)
    router.push(`/${login}`)
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.searchbox} onSubmit={onSubmit}>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="GitHub username"
          autoComplete="off"
        />
        <input type="submit" value="Go" />
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
