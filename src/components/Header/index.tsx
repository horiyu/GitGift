'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Session } from 'next-auth'
import { SignOutIcon } from '@primer/octicons-react'
import { SignInButton, SignOutButton } from '../Button/AuthButtons'
import Logo from '../Logo'
import SearchBOX from '../SearchBOX'
import styles from './header.module.css'

export default function Header({ session }: { session: Session | null }) {
  const login = session?.user?.login
  const isHome = usePathname() === '/'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="GitGift home">
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
              <Link href={login ? `/${login}` : '/'} className={styles.me} title="Your GitGiftBOX">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="avatar"
                  src={session.user?.image || ''}
                  alt={login || session.user?.name || 'Your avatar'}
                  width={32}
                  height={32}
                />
                <span className={styles.meLabel}>Your box</span>
              </Link>
              <SignOutButton className={styles.iconButton} aria-label="Sign out" title="Sign out">
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
