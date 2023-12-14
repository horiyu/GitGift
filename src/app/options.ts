import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";

export const options: NextAuthOptions = {
  debug: true,
  session: { strategy: "jwt" },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, account, profile, isNewUser }) => {
      // 注意: トークンをログ出力してはダメです。
      // console.log('in jwt', { user, token, account, profile })

      if (user) {
        token.user = user;
        const u = user as any
        token.role = u.role;
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token;
    },
    session: ({ session, token }) => {
      // console.log("in session", { session, token });
      token.accessToken
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role,
        },
      };
    },
  }
}
  ;