'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Session } from 'next-auth'
import { SignOutIcon } from '@primer/octicons-react'
import { SignInButton, SignOutButton } from '../Button/AuthButtons'
import { useI18n } from '@/i18n/client'
import Logo from '../Logo'
import SearchBOX from '../SearchBOX'
import styles from './header.module.css'

export default function Header({ session }: { session: Session | null }) {
  const login = session?.user?.login
  const isHome = usePathname() === '/'
  const { t } = useI18n()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={t('header.home')}>
          <Logo size={32} />
          <span>GitGift</span>
        </Link>

        {!isHome && (
          <div className={styles.search}>
            <SearchBOX variant="compact" />
          </div>
        )}

        <nav className={styles.actions}>
          {session ? (
            <>
              <Link href={login ? `/${login}` : '/'} className={styles.me} title={t('header.yourBox')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="avatar"
                  src={session.user?.image || ''}
                  alt={login || session.user?.name || ''}
                  width={32}
                  height={32}
                />
                <span className={styles.meLabel}>{t('header.yourBox')}</span>
              </Link>
              <SignOutButton className={styles.iconButton} aria-label={t('auth.signOut')} title={t('auth.signOut')}>
                <SignOutIcon size={16} />
              </SignOutButton>
            </>
          ) : (
            <SignInButton />
          )}
        </nav>
      </div>
    </header>
  )
}
