import NextAuth from "next-auth";

export default NextAuth({
  providers: [],

  secret: process.env.SECRET,

  session: {
    strategy: "jwt",
  },

  jwt: {},

  pages: {},

  callbacks: {},

  events: {},

  debug: false,
});
