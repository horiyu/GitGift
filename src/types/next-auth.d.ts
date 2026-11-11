import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      login?: string
      githubId?: number
      // True when the GitHub token behind this session has expired; the user must sign in again.
      tokenExpired?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    // Unix time (seconds) at which accessToken expires; undefined for non-expiring tokens.
    expiresAt?: number
    login?: string
    githubId?: number
  }
}
