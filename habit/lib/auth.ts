import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // The Google account subject (`sub`) is a stable per-user id. We use it as
    // the DynamoDB partition key for that user's tasks and completions.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = (profile as { sub?: string }).sub ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
