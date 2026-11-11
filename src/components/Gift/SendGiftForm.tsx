'use client'

import { FormEvent, useState } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/lib/gift'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

export default function SendGiftForm({ to }: { to: string }) {
  const [message, setMessage] = useState('')
  const { state, run } = useGiftAction()
  const length = Array.from(message.trim()).length

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await run('/api/gifts', { to, message })) setMessage('')
  }

  return (
    <form className={styles.sendForm} onSubmit={onSubmit}>
      <textarea
        className={styles.textarea}
        placeholder={`Write a message to @${to}...`}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={5}
        aria-label={`Message to @${to}`}
      />
      <p className={styles.publicNote}>
        Gifts are public: your message is posted as an Issue on @{to}&apos;s public GitGiftBOX under your GitHub
        account, and @{to} may add it to the box&apos;s README.
      </p>
      <div className={styles.sendFooter}>
        <span className={length > MAX_MESSAGE_LENGTH ? styles.over : styles.counter}>
          {length} / {MAX_MESSAGE_LENGTH}
        </span>
        <button
          className={styles.primary}
          type="submit"
          disabled={state.status === 'pending' || length === 0 || length > MAX_MESSAGE_LENGTH}
        >
          {state.status === 'pending' ? 'Wrapping...' : 'Send gift'}
        </button>
      </div>
      {state.status === 'done' && (
        <p className={styles.notice}>
          Your gift is wrapped and waiting in @{to}&apos;s box.{' '}
          {state.url && (
            <a href={state.url} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          )}
        </p>
      )}
      {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
    </form>
  )
}
