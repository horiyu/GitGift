import Logo from '../Logo'
import styles from './footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>
          <Logo size={20} />
          GitGift
        </span>
        <span>Gifts are delivered as public Issues and commits on GitHub.</span>
        <span>Not affiliated with or endorsed by GitHub, Inc.</span>
      </div>
    </footer>
  )
}
