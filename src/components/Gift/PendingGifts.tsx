'use client'

import { useState } from 'react'
import { CheckCircleIcon, GiftIcon, IssueOpenedIcon, StopIcon, XIcon } from '@primer/octicons-react'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

export type Pending = { number: number; from: string; createdAt: string; message: string }

type Outcome = 'open' | 'decline'

// Unopened gifts. Unwrapping shows the message first; the owner then decides whether to add it
// to their public README (a commit under the sender's name) or to decline it.
export default function PendingGifts({ gifts }: { gifts: Pending[] }) {
  const { state, run } = useGiftAction()
  const [unwrapped, setUnwrapped] = useState<number | null>(null)
  const [busy, setBusy] = useState<{ number: number; action: Outcome } | null>(null)
  // GitHub's Issue list and README reads lag behind a just-made change, so the outcome is
  // tracked locally instead of waiting for the refreshed server data.
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const added = gifts.filter((gift) => outcomes[gift.number] === 'open')
  const visible = gifts.filter((gift) => !outcomes[gift.number])

  if (visible.length === 0 && added.length === 0) return null

  const act = async (number: number, action: Outcome) => {
    setBusy({ number, action })
    if (await run(`/api/gifts/${number}/${action}`)) {
      setOutcomes((prev) => ({ ...prev, [number]: action }))
      setUnwrapped(null)
    }
    setBusy(null)
  }

  return (
    <>
      {added.map((gift) => (
        <div key={gift.number} className="flash flash-success">
          <CheckCircleIcon size={16} />
          <p>
            Added the gift from <b>@{gift.from}</b> to your box. It may take a moment to appear in the list below.
          </p>
        </div>
      ))}

      {visible.length > 0 && (
        <section className={`box ${styles.pendingBox}`} aria-labelledby="pending">
          <div className="box-header">
            <h2 id="pending" className="box-title">
              <GiftIcon size={16} className={styles.giftAccent} /> Unopened gifts
            </h2>
            <span className="counter">{visible.length}</span>
          </div>
          <ul className={styles.list}>
            {visible.map((gift) => {
              const isOpen = unwrapped === gift.number
              const isBusy = busy?.number === gift.number
              return (
                <li key={gift.number} className={`box-row ${styles.pendingRow}`}>
                  <div className={styles.pendingHeader}>
                    <IssueOpenedIcon size={16} className={styles.openIcon} />
                    <div className={styles.pendingMeta}>
                      <p className={styles.pendingTitle}>A gift from @{gift.from}</p>
                      <p className="text-muted text-small">
                        #{gift.number} opened on {gift.createdAt.slice(0, 10)} by{' '}
                        <a href={`https://github.com/${gift.from}`} target="_blank" rel="noreferrer">
                          {gift.from}
                        </a>
                      </p>
                    </div>
                    {isOpen ? (
                      <button
                        type="button"
                        className={`btn ${styles.iconOnly}`}
                        onClick={() => setUnwrapped(null)}
                        aria-label="Wrap it back up"
                        disabled={busy !== null}
                      >
                        <XIcon size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setUnwrapped(gift.number)}
                        disabled={busy !== null}
                      >
                        <GiftIcon size={16} /> Unwrap
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className={styles.unwrapped}>
                      <div className={styles.letter}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="avatar"
                          src={`https://github.com/${gift.from}.png?size=48`}
                          alt={gift.from}
                          width={24}
                          height={24}
                        />
                        <p className={styles.letterText}>{gift.message}</p>
                      </div>
                      <p className="text-muted text-small">
                        Adding it commits this message to your public README with @{gift.from} as the author.
                      </p>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => act(gift.number, 'decline')}
                          disabled={busy !== null}
                        >
                          {isBusy && busy?.action === 'decline' ? 'Declining…' : 'Decline'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => act(gift.number, 'open')}
                          disabled={busy !== null}
                        >
                          {isBusy && busy?.action === 'open' ? 'Committing…' : 'Add to my box'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {state.status === 'error' && (
        <div className="flash flash-error">
          <StopIcon size={16} />
          <p>{state.message}</p>
        </div>
      )}
    </>
  )
}
