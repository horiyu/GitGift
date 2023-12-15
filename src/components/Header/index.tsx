'use client'

import styles from './header.module.css'
import OutlinedButton from '../Button/Outlined'
import { signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'

export default function Header({ session }: { session: Session | null }) {
  return (
    <header className={styles.header}>
      <div>GitGift</div>
      {(!session) ?
        <OutlinedButton onClick={() => signIn()}>Sign in</OutlinedButton> :
        <OutlinedButton onClick={() => signOut()}>Sign out</OutlinedButton>}
    </header>
  )
}