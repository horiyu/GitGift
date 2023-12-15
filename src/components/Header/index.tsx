'use client'

import Link from 'next/link'
import styles from './header.module.css'
import OutlinedButton from '../Button/Outlined'
import { signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'

export default function Header({ session }: { session: Session | null }) {
  return (
    <header className={styles.header}>
      <div>GitGift</div>
      {(session) ?
        <Link href={`./${session.user?.name}`}>
          <img
            className={styles.icon}
            src={session.user?.image || ""}
            alt={session.user?.name || "icon"}
            style={{ width: "30px", height: "30px" }}
          />
        </Link> :
        // <OutlinedButton onClick={() => signOut()}>{session.user?.name}</OutlinedButton>
        <OutlinedButton onClick={() => signIn()}>Sign in</OutlinedButton>
      }
    </header>
  )
}