'use client'

import { AlertIcon, SyncIcon } from '@primer/octicons-react'
import styles from './user.module.css'

// Shown when GitHub cannot be reached or rate-limits the server.
export default function UserPageError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.layout} style={{ display: 'block', maxWidth: 720 }}>
      <div className="flash flash-warn">
        <AlertIcon size={16} />
        <div className={styles.flashBody}>
          <p>Could not load this page from GitHub. It may be rate-limiting requests; please try again later.</p>
          <button type="button" className="btn" onClick={() => reset()}>
            <SyncIcon size={16} /> Try again
          </button>
        </div>
      </div>
    </div>
  )
}
