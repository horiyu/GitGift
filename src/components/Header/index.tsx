import styles from './header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div>GitGift</div>
      <button>Sign in</button>
    </header>
  )
}