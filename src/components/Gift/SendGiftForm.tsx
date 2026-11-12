'use client'

import { FormEvent, useState } from 'react'
import { CheckCircleIcon, GiftIcon, GlobeIcon, StopIcon } from '@primer/octicons-react'
import { MAX_MESSAGE_LENGTH } from '@/lib/gift'
import ShareBoxLink from './ShareBoxLink'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

type Props = { to: string; viewerLogin: string; viewerAvatar: string | null }

// Comment-composer style form, modelled on GitHub's Issue comment box.
export default function SendGiftForm({ to, viewerLogin, viewerAvatar }: Props) {
  const [message, setMessage] = useState('')
  const { state, run } = useGiftAction()
  const length = Array.from(message.trim()).length
  const over = length > MAX_MESSAGE_LENGTH

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await run('/api/gifts', { to, message })) setMessage('')
  }

  return (
    <section aria-labelledby="send" className={styles.composerWrap}>
      {viewerAvatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`avatar ${styles.composerAvatar}`} src={viewerAvatar} alt={viewerLogin} width={40} height={40} />
      )}
      <form className={`box ${styles.composer}`} onSubmit={onSubmit}>
        <div className={styles.composerHeader}>
          <h2 id="send" className={styles.tab}>
            <GiftIcon size={16} /> Send a gift to @{to}
          </h2>
        </div>
        <div className={styles.composerBody}>
          <textarea
            className={`form-control ${styles.textarea}`}
            placeholder={`Write a thank-you note to @${to}…`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            aria-label={`Message to @${to}`}
            aria-describedby="public-note"
          />
          <p id="public-note" className={styles.publicNote}>
            <GlobeIcon size={16} />
            <span>
              Gifts are public. Your message is posted as an Issue on @{to}&apos;s public GitGiftBOX under your GitHub
              account, and @{to} may commit it to the box&apos;s README.
            </span>
          </p>
        </div>
        <div className={styles.composerFooter}>
          <span className={over ? styles.over : 'text-muted text-small'}>
            {length} / {MAX_MESSAGE_LENGTH}
          </span>
          <button className="btn btn-primary" type="submit" disabled={state.status === 'pending' || length === 0 || over}>
            {state.status === 'pending' ? 'Wrapping…' : 'Send gift'}
          </button>
        </div>
      </form>

      {state.status === 'done' && (
        <div className={`flash flash-success ${styles.result}`}>
          <CheckCircleIcon size={16} />
          <p>
            Your gift is wrapped and waiting in @{to}&apos;s box.{' '}
            {state.url && (
              <a href={state.url} target="_blank" rel="noreferrer">
                View the Issue on GitHub
              </a>
            )}
          </p>
        </div>
      )}
      {state.status === 'error' && (
        <div className={`flash flash-error ${styles.result}`}>
          <StopIcon size={16} />
          <div className={styles.flashStack}>
            <p>{state.message}</p>
            {state.code === 'not-ready' && <ShareBoxLink to={to} align="start" />}
          </div>
        </div>
      )}
    </section>
  )
}
