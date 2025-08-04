import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      console.log("🔵 Session callback:", session, user);
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      console.log("🟢 Sign-in attempt:", { user, account, profile });
      return true;
    },
  },
  events: {
    async signIn(message) {
      console.log("🟡 Sign-in event:", message);
    },
  },
  // debug: true, // Optional: enables verbose server-side logging from NextAuth
});

export { handler as GET, handler as POST };