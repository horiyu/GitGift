import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NextAuthProvider from '@/providers/NextAuth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'GitGift',
  description: 'Gift a heartfelt message to someone special through Git.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <NextAuthProvider>
          <Header session={session} />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </NextAuthProvider>
      </body>
    </html>
  )
}
