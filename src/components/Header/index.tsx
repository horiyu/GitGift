import styles from './header.module.css'
import OutlinedButton from '../Button/Outlined'

export default function Header() {
  return (
    <header className={styles.header}>
      <div>GitGift</div>
      <OutlinedButton>Sign in</OutlinedButton>
    </header>
  )
}