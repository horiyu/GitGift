'use client'

import { signIn, signOut } from 'next-auth/react'
import { MarkGithubIcon } from '@primer/octicons-react'

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>

export function SignInButton({
  children = 'Sign in with GitHub',
  primary = false,
  large = false,
  className,
  ...props
}: ButtonProps & { primary?: boolean; large?: boolean }) {
  const classes = ['btn', primary && 'btn-primary', large && 'btn-large', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={classes} onClick={() => signIn('github')} {...props}>
      <MarkGithubIcon size={16} />
      {children}
    </button>
  )
}

export function SignOutButton({ children = 'Sign out', className, ...props }: ButtonProps) {
  return (
    <button type="button" className={`btn ${className ?? ''}`} onClick={() => signOut({ callbackUrl: '/' })} {...props}>
      {children}
    </button>
  )
}
