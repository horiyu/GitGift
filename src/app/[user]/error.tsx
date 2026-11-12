'use client'

import { AlertIcon, SyncIcon } from '@primer/octicons-react'
import { useI18n } from '@/i18n/client'
import styles from './user.module.css'

// Shown when GitHub cannot be reached or rate-limits the server.
export default function UserPageError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n()
  return (
    <div className={styles.layout} style={{ display: 'block', maxWidth: 720 }}>
      <div className="flash flash-warn">
        <AlertIcon size={16} />
        <div className={styles.flashBody}>
          <p>{t('error.load')}</p>
          <button type="button" className="btn" onClick={() => reset()}>
            <SyncIcon size={16} /> {t('error.retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
