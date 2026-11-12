import { GiftIcon } from '@primer/octicons-react'
import styles from './logo.module.css'

// GitGift's own mark: a gift icon in a gradient badge, deliberately distinct from GitHub's logo.
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className={styles.logo} style={{ width: size, height: size }} aria-hidden="true">
      <GiftIcon size={Math.round(size * 0.55)} />
    </span>
  )
}
