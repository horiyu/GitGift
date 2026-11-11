'use client'

import { useState } from 'react'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

export type Pending = { number: number; from: string; createdAt: string; message: string }

type Outcome = 'open' | 'decline'

// Unopened gifts. Unwrapping shows the message first; the owner then decides whether to add it
// to their public README (a commit under the sender's name) or to decline it.
export default function PendingGifts({ gifts }: { gifts: Pending[] }) {
  const { state, run } = useGiftAction()
  const [unwrapped, setUnwrapped] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  // GitHub's Issue list and README reads lag behind a just-made change, so the outcome is
  // tracked locally instead of waiting for the refreshed server data.
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const added = gifts.filter((gift) => outcomes[gift.number] === 'open')
  const visible = gifts.filter((gift) => !outcomes[gift.number])

  if (visible.length === 0 && added.length === 0) return null

  const act = async (number: number, action: Outcome) => {
    setBusy(number)
    if (await run(`/api/gifts/${number}/${action}`)) {
      setOutcomes((prev) => ({ ...prev, [number]: action }))
      setUnwrapped(null)
    }
    setBusy(null)
  }

  return (
    <section className={styles.section}>
      {added.length > 0 && (
        <ul className={styles.list}>
          {added.map((gift) => (
            <li key={gift.number} className={styles.card}>
              <p className={styles.notice}>✓ Added to your box from @{gift.from}.</p>
              <p className={styles.date}>It may take a moment to appear in the list below.</p>
            </li>
          ))}
        </ul>
      )}
      {visible.length > 0 && (
        <>
          <h2 className={added.length > 0 ? styles.spaced : undefined}>
            🎁 {visible.length} unopened {visible.length === 1 ? 'gift' : 'gifts'}
          </h2>
          <ul className={styles.list}>
            {visible.map((gift) => (
              <li key={gift.number} className={styles.pending}>
                <div className={styles.pendingHeader}>
                  <span>
                    From <a href={`https://github.com/${gift.from}`}>@{gift.from}</a>
                    <span className={styles.date}> · {gift.createdAt.slice(0, 10)}</span>
                  </span>
                  {unwrapped !== gift.number && (
                    <button className={styles.primary} onClick={() => setUnwrapped(gift.number)} disabled={busy !== null}>
                      Unwrap
                    </button>
                  )}
                </div>
                {unwrapped === gift.number && (
                  <div className={styles.unwrapped}>
                    <p className={styles.cardMessage}>{gift.message}</p>
                    <p className={styles.date}>
                      Adding it commits this message to your public README under @{gift.from}&apos;s name.
                    </p>
                    <div className={styles.actions}>
                      <button className={styles.secondary} onClick={() => act(gift.number, 'decline')} disabled={busy !== null}>
                        {busy === gift.number ? '...' : 'Decline'}
                      </button>
                      <button className={styles.primary} onClick={() => act(gift.number, 'open')} disabled={busy !== null}>
                        {busy === gift.number ? '...' : 'Add to my box'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
    </section>
  )
}
