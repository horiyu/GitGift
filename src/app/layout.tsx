import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NextAuthProvider from '@/providers/NextAuth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { I18nProvider } from '@/i18n/client'
import { getMessages } from '@/i18n/messages'
import { getLocale, getTranslator } from '@/i18n/server'

// Absolute URLs for Open Graph images and canonical links.
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: 'GitGift', template: '%s · GitGift' },
    description: t('meta.description'),
    applicationName: 'GitGift',
    openGraph: { type: 'website', siteName: 'GitGift', title: 'GitGift', description: t('meta.description') },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([getServerSession(authOptions), getLocale()])

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          <NextAuthProvider>
            <Header session={session} />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </NextAuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
