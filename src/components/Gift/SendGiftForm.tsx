'use client'

import { FormEvent } from 'react'
import { CheckCircleIcon, CheckIcon, GiftIcon, GlobeIcon, HistoryIcon, StopIcon } from '@primer/octicons-react'
import { MAX_MESSAGE_LENGTH } from '@/lib/gift'
import { useI18n } from '@/i18n/client'
import ShareButtons from './ShareButtons'
import { useDraft } from './useDraft'
import { NOT_READY_CODES, useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

type Props = {
  to: string
  viewerLogin: string | null
  viewerAvatar: string | null
  // 'draft': the recipient cannot receive gifts yet, so the message is only saved in this browser.
  mode?: 'send' | 'draft'
}

// Comment-composer style form, modelled on GitHub's Issue comment box. The text is kept as a
// draft in this browser while typing, so it survives reloads and waits for a box that is not ready.
export default function SendGiftForm({ to, viewerLogin, viewerAvatar, mode = 'send' }: Props) {
  const { t } = useI18n()
  const draft = useDraft(to)
  const { state, run } = useGiftAction()
  const message = draft.text
  const length = Array.from(message.trim()).length
  const over = length > MAX_MESSAGE_LENGTH
  const isDraft = mode === 'draft'

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isDraft) return
    if (await run('/api/gifts', { to, message })) draft.clear()
  }

  const notReady = state.status === 'error' && !!state.code && NOT_READY_CODES.includes(state.code)

  return (
    <section aria-labelledby="send" className={styles.composerWrap}>
      {viewerAvatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`avatar ${styles.composerAvatar}`} src={viewerAvatar} alt={viewerLogin ?? ''} width={40} height={40} />
      )}

      {!isDraft && draft.restored && state.status === 'idle' && (
        <div className={`flash ${styles.restored}`}>
          <HistoryIcon size={16} />
          <p>{t('compose.restored', { to })}</p>
        </div>
      )}

      <form className={`box ${styles.composer}`} onSubmit={onSubmit}>
        <div className={styles.composerHeader}>
          <h2 id="send" className={styles.tab}>
            <GiftIcon size={16} /> {isDraft ? t('compose.draftTitle', { to }) : t('compose.title', { to })}
          </h2>
        </div>
        <div className={styles.composerBody}>
          <textarea
            className={`form-control ${styles.textarea}`}
            placeholder={t('compose.placeholder', { to })}
            value={message}
            onChange={(event) => draft.setText(event.target.value)}
            rows={6}
            aria-label={t('compose.label', { to })}
            aria-describedby="compose-note"
          />
          <p id="compose-note" className={styles.publicNote}>
            {isDraft ? <HistoryIcon size={16} /> : <GlobeIcon size={16} />}
            <span>{isDraft ? t('compose.draftNote', { to }) : t('compose.public', { to })}</span>
          </p>
        </div>
        <div className={styles.composerFooter}>
          <span className={styles.footerStatus}>
            <span className={over ? styles.over : 'text-muted text-small'}>
              {length} / {MAX_MESSAGE_LENGTH}
            </span>
            {draft.saved && (
              <span className={`text-muted text-small ${styles.savedNote}`}>
                <CheckIcon size={12} /> {t('compose.saved')}
              </span>
            )}
          </span>
          <span className={styles.footerActions}>
            {message.trim() && (isDraft || draft.restored) && (
              <button type="button" className="btn" onClick={draft.clear} disabled={state.status === 'pending'}>
                {t('compose.discard')}
              </button>
            )}
            {!isDraft && (
              <button className="btn btn-primary" type="submit" disabled={state.status === 'pending' || length === 0 || over}>
                {state.status === 'pending' ? t('compose.sending') : t('compose.send')}
              </button>
            )}
          </span>
        </div>
      </form>

      {state.status === 'done' && (
        <div className={`flash flash-success ${styles.result}`}>
          <CheckCircleIcon size={16} />
          <p>
            {t('compose.sent', { to })}{' '}
            {state.url && (
              <a href={state.url} target="_blank" rel="noreferrer">
                {t('compose.viewIssue')}
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
            {notReady && (
              <>
                <p className="text-small">{t('compose.keptOnError')}</p>
                <ShareButtons path={`/${to}`} text={t('share.inviteText', { login: to })} align="start" />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
