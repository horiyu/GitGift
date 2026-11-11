'use client'

import OutlinedButton from '@/components/Button/Outlined'
import styles from './user.module.css'

// Shown when GitHub cannot be reached or rate-limits the server.
export default function UserPageError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.main}>
      <p>Could not load this page from GitHub. It may be rate-limiting requests; please try again later.</p>
      <div className={styles.signOut}>
        <OutlinedButton onClick={() => reset()}>Try again</OutlinedButton>
      </div>
    </div>
  )
}
