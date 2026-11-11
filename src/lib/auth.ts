import type { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import { isTokenExpired } from './token'

// GitHub App user access tokens expire after 8 hours; keep sessions no longer than that.
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

// Revokes the user access token at GitHub so that a signed-out session cannot be replayed.
async function revokeGitHubToken(accessToken: string) {
  const clientId = process.env.GITHUB_ID
  const clientSecret = process.env.GITHUB_SECRET
  if (!clientId || !clientSecret) return
  try {
    const res = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ access_token: accessToken }),
      cache: 'no-store',
    })
    // 404: already revoked or expired.
    if (!res.ok && res.status !== 404) console.warn(`Failed to revoke GitHub token (${res.status}).`)
  } catch (error) {
    console.warn('Failed to revoke GitHub token', error)
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [
    // GITHUB_ID / GITHUB_SECRET are the client ID and secret of the GitGift *GitHub App*.
    // A GitHub App's user token can only touch repositories where the app is installed
    // (each user's GitGiftBOX), unlike an OAuth App token with the broad public_repo scope.
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs with `account`/`profile` only on sign-in; persist what the API routes need.
      if (account?.access_token) {
        token.accessToken = account.access_token
        token.expiresAt = account.expires_at
      }
      if (profile) {
        const p = profile as { login?: string; id?: number }
        if (p.login) token.login = p.login
        if (typeof p.id === 'number') token.githubId = p.id
      }
      return token
    },
    async session({ session, token }) {
      // The access token stays inside the encrypted, httpOnly JWT cookie and is never sent to the browser.
      if (session.user) {
        session.user.login = token.login
        session.user.githubId = token.githubId
        session.user.tokenExpired = !token.accessToken || isTokenExpired(token.expiresAt)
      }
      return session
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.accessToken && !isTokenExpired(token.expiresAt)) await revokeGitHubToken(token.accessToken)
    },
  },
}
