import Link from 'next/link'
import { PersonIcon } from '@primer/octicons-react'
import { getTranslator } from '@/i18n/server'

export default async function NotFound() {
  const { t } = await getTranslator()
  return (
    <div style={{ maxWidth: 560, margin: '96px auto', padding: '0 16px', textAlign: 'center' }}>
      <div className="box" style={{ padding: '40px 24px', display: 'grid', gap: 8, justifyItems: 'center' }}>
        <PersonIcon size={24} className="text-muted" />
        <h1 style={{ fontSize: 20 }}>{t('notFound.title')}</h1>
        <p className="text-muted">{t('notFound.text')}</p>
        <Link href="/" className="btn" style={{ marginTop: 8 }}>
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  )
}
