import styles from './searchbox.module.css'

export default function SearchBOX({ placeholder = "" }: { placeholder: string }) {
  return (
    <form className={styles.searchbox}>
      <input type="text" placeholder={placeholder} />
      <input type="submit" value="Send" />
    </form>
  )
}