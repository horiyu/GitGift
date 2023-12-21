import Image from 'next/image'
import styles from './page.module.css'

import { basePath } from "../../next.config"
import SearchBOX from '@/components/SearchBOX'
const BASE_PATH = basePath ? basePath : ""

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <h1>GitGift</h1>
        <p>Gift a heartfelt message to someone special through Git</p>
      </div>
      <SearchBOX placeholder='Search'></SearchBOX>
      <div className={styles.sendBoxMsg}>
        <p>Free and so easy!</p>
      </div>
    </main>
  )
}