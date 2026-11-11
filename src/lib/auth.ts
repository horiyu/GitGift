import type { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
      // GitHub now returns an `iss` parameter on the callback (RFC 9207); openid-client rejects it
      // unless the issuer is configured. next-auth >= 4.24.14 sets the same default.
      issuer: 'https://github.com/login/oauth',
      // public_repo: open Issues on other users' boxes, fork the box template, and commit opened gifts.
      authorization: { params: { scope: 'read:user public_repo' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs with `account`/`profile` only on sign-in; persist what the API routes need.
      if (account?.access_token) token.accessToken = account.access_token
      if (profile) {
        const p = profile as { login?: string; id?: number }
        if (p.login) token.login = p.login
        if (typeof p.id === 'number') token.githubId = p.id
      }
      return token
    },
    async session({ session, token }) {
      // The access token stays inside the encrypted JWT cookie and is never sent to the browser.
      if (session.user) {
        session.user.login = token.login
        session.user.githubId = token.githubId
      }
      return session
    },
  },
}
