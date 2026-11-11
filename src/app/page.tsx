import styles from './page.module.css'
import SearchBOX from '@/components/SearchBOX'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <h1>GitGift</h1>
        <p>Gift a heartfelt message to someone special through Git</p>
      </div>
      <SearchBOX placeholder="Send to... (GitHub username)" />
      <div className={styles.sendBoxMsg}>
        <p>Free and so easy!</p>
      </div>
    </main>
  )
}
