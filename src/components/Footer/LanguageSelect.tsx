'use client'

import { useRouter } from 'next/navigation'
import { GlobeIcon } from '@primer/octicons-react'
import { useI18n } from '@/i18n/client'
import { LOCALES, LOCALE_COOKIE, isLocale } from '@/i18n/config'
import styles from './footer.module.css'

// Stores the choice in a cookie (read by the server on every request) and re-renders the page.
export default function LanguageSelect() {
  const router = useRouter()
  const { locale, t } = useI18n()

  return (
    <label className={styles.language}>
      <GlobeIcon size={14} />
      <span className="sr-only">{t('footer.language')}</span>
      <select
        className={styles.select}
        value={locale}
        aria-label={t('footer.language')}
        onChange={(event) => {
          const next = event.target.value
          if (!isLocale(next)) return
          const secure = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
          router.refresh()
        }}
      >
        {LOCALES.map(({ code, label }) => (
          <option key={code} value={code} lang={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
