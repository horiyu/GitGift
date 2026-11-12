'use client'

import { useState } from 'react'
import styles from './gift.module.css'

// GitGift never notifies someone who has not set up a box, so the sender passes the link on
// themselves. The page at this link shows its owner how to set up their GitGiftBOX.
export default function ShareBoxLink({ to }: { to: string }) {
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
    <div className={styles.share}>
      <p className={styles.date}>
        Want to send @{to} a gift? Share this page with them; it shows them how to set up a box.
      </p>
      <button type="button" className={styles.secondary} onClick={copy}>
        {copied === 'copied' ? '✓ Link copied' : `Copy link to @${to}'s page`}
      </button>
      {copied === 'manual' && (
        <input
          className={styles.shareInput}
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
