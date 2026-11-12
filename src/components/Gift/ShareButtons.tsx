'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, CopyIcon, ShareIcon } from '@primer/octicons-react'
import { useI18n } from '@/i18n/client'
import styles from './gift.module.css'

type Props = {
  // Path on this site to share, e.g. "/octocat".
  path: string
  // Text that goes with the link. It must not contain "@login": on X that would mention
  // whoever owns that handle there, who is not necessarily the same person.
  text: string
  align?: 'center' | 'start'
}

function openPopup(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=640')
}

// Share a GitGift page: post on X, use the system share sheet, or copy the link.
// GitGift itself never contacts anyone; the person sharing chooses where it goes.
export default function ShareButtons({ path, text, align = 'center' }: Props) {
  const { t } = useI18n()
  const [canShare, setCanShare] = useState(false)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`)
    setCanShare(typeof navigator.share === 'function')
  }, [path])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopy('copied')
    } catch {
      // Clipboard access can be denied (permissions, insecure context); let the user copy by hand.
      setCopy('manual')
    }
  }

  const onShare = async () => {
    try {
      await navigator.share({ title: 'GitGift', text, url })
    } catch {
      // Dismissed by the user, or not allowed here; nothing to do.
    }
  }

  const x = `https://x.com/intent/tweet?${new URLSearchParams({ text, url })}`

  return (
    <div className={`${styles.shareButtons} ${align === 'start' ? styles.shareStart : ''}`}>
      <div className={styles.shareRow}>
        <button type="button" className="btn" onClick={() => openPopup(x)} disabled={!url}>
          <XLogo />
          {t('share.onX')}
        </button>
        {canShare && (
          <button type="button" className="btn" onClick={onShare}>
            <ShareIcon size={16} />
            {t('share.more')}
          </button>
        )}
        <button type="button" className="btn" onClick={onCopy} disabled={!url}>
          {copy === 'copied' ? <CheckIcon size={16} className={styles.copied} /> : <CopyIcon size={16} />}
          {copy === 'copied' ? t('share.copied') : t('share.copy')}
        </button>
      </div>
      {copy === 'manual' && (
        <input
          className={`form-control ${styles.shareInput}`}
          readOnly
          value={url}
          aria-label={t('share.linkLabel')}
          onFocus={(event) => event.currentTarget.select()}
          autoFocus
        />
      )}
    </div>
  )
}

// The X mark, drawn as a single-colour glyph that follows the button's text colour.
function XLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

