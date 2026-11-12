'use client'

import { signIn, signOut } from 'next-auth/react'
import { MarkGithubIcon } from '@primer/octicons-react'
import { useI18n } from '@/i18n/client'

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>

export function SignInButton({
  children,
  primary = false,
  large = false,
  className,
  ...props
}: ButtonProps & { primary?: boolean; large?: boolean }) {
  const { t } = useI18n()
  const classes = ['btn', primary && 'btn-primary', large && 'btn-large', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={classes} onClick={() => signIn('github')} {...props}>
      <MarkGithubIcon size={16} />
      {children ?? t('auth.signIn')}
    </button>
  )
}

export function SignOutButton({ children, className, ...props }: ButtonProps) {
  const { t } = useI18n()
  return (
    <button type="button" className={`btn ${className ?? ''}`} onClick={() => signOut({ callbackUrl: '/' })} {...props}>
      {children ?? t('auth.signOut')}
    </button>
  )
}
