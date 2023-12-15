import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

// export const dynamic = 'force-static'
// export const dynamicParams = false

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
  ],
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }