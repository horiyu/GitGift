'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@primer/octicons-react'
import styles from './gift.module.css'

// GitGift never notifies someone who has not set up a box, so the sender passes the link on
// themselves. The page at this link shows its owner how to set up their GitGiftBOX.
export default function ShareBoxLink({ to, align = 'center' }: { to: string; align?: 'center' | 'start' }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [url, setUrl] = useState('')

  const copy = async () => {
    const link = `${window.location.origin}/${to}`
    setUrl(link)
    try {
      await navigator.clipboard.writeText(link)
      setCopied('copied')
    } catch {
      // Clipboard access can be denied (permissions, insecure context); let the user copy by hand.
      setCopied('manual')
    }
  }

  return (
    <div className={`${styles.share} ${align === 'start' ? styles.shareStart : ''}`}>
      <p className="text-muted text-small">
        Share this page with @{to}; it walks them through setting up a box.
      </p>
      <button type="button" className="btn" onClick={copy}>
        {copied === 'copied' ? <CheckIcon size={16} className={styles.copied} /> : <CopyIcon size={16} />}
        {copied === 'copied' ? 'Link copied' : `Copy link to @${to}'s page`}
      </button>
      {copied === 'manual' && (
        <input
          className={`form-control ${styles.shareInput}`}
          readOnly
          value={url}
          aria-label={`Link to @${to}'s page`}
          onFocus={(event) => event.currentTarget.select()}
          autoFocus
        />
      )}
    </div>
  )
}
