import Image from 'next/image'
import styles from './page.module.css'

import { basePath } from "../../next.config"
const BASE_PATH = basePath ? basePath : ""

export default function Home() {
  return (
    <main className={styles.main}>
      <form className={styles.searchBox}>
        <input type="text" placeholder="Send to..." />
        <input type="submit" value="Send" />
      </form>
    </main>
  )
}
