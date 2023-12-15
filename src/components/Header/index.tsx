'use client'

import Link from 'next/link'
import styles from './header.module.css'
import OutlinedButton from '../Button/Outlined'
import { signIn } from 'next-auth/react'
import { Session } from 'next-auth'

export default function Header({ session }: { session: Session | null }) {
  return (
    <header className={styles.header}>
      <Link href={`./`}>GitGift</Link>
      {(session) ?
        <Link href={`./${session.user?.name}`}>
          <img
            className={styles.icon}
            src={session.user?.image || ""}
            alt={session.user?.name || "icon"}
            style={{ width: "32px", height: "32px" }}
          />
        </Link> :
        <OutlinedButton onClick={() => signIn()}>Sign in</OutlinedButton>
      }
    </header>
  )
}