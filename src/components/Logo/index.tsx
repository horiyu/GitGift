import Mark from './Mark'
import styles from './logo.module.css'

// GitGift's own mark: a commit whose node is a wrapped present, in a gradient badge,
// deliberately distinct from GitHub's logo.
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className={styles.logo} style={{ width: size, height: size }} aria-hidden="true">
      <Mark size={Math.round(size * 0.66)} />
    </span>
  )
}
