'use client'

import { signIn, signOut } from 'next-auth/react'
import OutlinedButton from './Outlined'

export function SignInButton({ children = 'Sign in' }: { children?: React.ReactNode }) {
  return <OutlinedButton onClick={() => signIn('github')}>{children}</OutlinedButton>
}

export function SignOutButton() {
  return <OutlinedButton onClick={() => signOut({ callbackUrl: '/' })}>Sign Out</OutlinedButton>
}
