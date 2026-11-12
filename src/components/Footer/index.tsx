import { getTranslator } from '@/i18n/server'
import Logo from '../Logo'
import LanguageSelect from './LanguageSelect'
import styles from './footer.module.css'

export default async function Footer() {
  const { t } = await getTranslator()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>
          <Logo size={20} />
          GitGift
        </span>
        <span>{t('footer.public')}</span>
        <span>{t('footer.disclaimer')}</span>
        <LanguageSelect />
      </div>
    </footer>
  )
}
