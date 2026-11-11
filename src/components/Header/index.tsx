'use client'

import Link from 'next/link'
import styles from './header.module.css'
import { SignInButton } from '../Button/AuthButtons'
import { Session } from 'next-auth'

export default function Header({ session }: { session: Session | null }) {
  const login = session?.user?.login

  return (
    <header className={styles.header}>
      <Link href="/">GitGift</Link>
      {session ? (
        <Link href={login ? `/${login}` : '/'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.icon}
            src={session.user?.image || ''}
            alt={login || session.user?.name || 'icon'}
            width={32}
            height={32}
          />
        </Link>
      ) : (
        <SignInButton />
      )}
    </header>
  )
}
