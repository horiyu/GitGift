'use client'

import { useState } from 'react'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

export type Pending = { number: number; from: string; createdAt: string }

// Unopened gifts. The message stays hidden until the owner opens it, like a wrapped present.
export default function PendingGifts({ gifts }: { gifts: Pending[] }) {
  const { state, run } = useGiftAction()
  const [opening, setOpening] = useState<number | null>(null)
  // GitHub's Issue list lags behind a just-closed Issue, so hide opened gifts locally.
  const [opened, setOpened] = useState<number[]>([])
  const visible = gifts.filter((gift) => !opened.includes(gift.number))

  if (visible.length === 0) return null

  const open = async (number: number) => {
    setOpening(number)
    if (await run(`/api/gifts/${number}/open`)) setOpened((prev) => [...prev, number])
    setOpening(null)
  }

  return (
    <section className={styles.section}>
      <h2>🎁 {visible.length} unopened {visible.length === 1 ? 'gift' : 'gifts'}</h2>
      <ul className={styles.list}>
        {visible.map((gift) => (
          <li key={gift.number} className={styles.pending}>
            <span>
              From <a href={`https://github.com/${gift.from}`}>@{gift.from}</a>
              <span className={styles.date}> · {gift.createdAt.slice(0, 10)}</span>
            </span>
            <button className={styles.primary} onClick={() => open(gift.number)} disabled={state.status === 'pending'}>
              {opening === gift.number ? 'Opening...' : 'Open'}
            </button>
          </li>
        ))}
      </ul>
      {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
    </section>
  )
}
