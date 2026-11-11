'use client'

import OutlinedButton from '@/components/Button/Outlined'
import { useGiftAction } from './useGiftAction'
import styles from './gift.module.css'

// Creates the viewer's GitGiftBOX, or re-enables Issues on an existing one.
export default function BoxButton({ label }: { label: string }) {
  const { state, run } = useGiftAction()

  return (
    <div className={styles.boxButton}>
      <OutlinedButton onClick={() => run('/api/box')} disabled={state.status === 'pending'}>
        {state.status === 'pending' ? 'Preparing...' : label}
      </OutlinedButton>
      {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
    </div>
  )
}
