import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/** Require an env var in dev/prod; return a safe placeholder in tests. */
function requiredEnv(name: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env.NODE_ENV === "test") {
    // Keeps unit tests from failing on import; fine because tests mock auth/session.
    return `test-${name.toLowerCase()}`;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

const NEXTAUTH_SECRET = requiredEnv("NEXTAUTH_SECRET");
const GOOGLE_CLIENT_ID = requiredEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = requiredEnv("GOOGLE_CLIENT_SECRET");
const FACEBOOK_CLIENT_ID = requiredEnv("FACEBOOK_CLIENT_ID");
const FACEBOOK_CLIENT_SECRET = requiredEnv("FACEBOOK_CLIENT_SECRET");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: NEXTAUTH_SECRET,

  // Use JWT sessions so getServerSession() doesn't hit the DB on each request
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
    }),
  ],

  pages: {
    signIn: "/", // the page that shows your RotatingDie + Google/Facebook buttons
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🟢 Sign-in attempt:", { user, account, profile });
      return true;
    },

    // With JWT sessions, persist the user id in the token on first sign-in
    async jwt({ token, user }) {
      if (user) {
        // user.id exists after a successful sign-in
        (token as any).uid = (user as any).id;
      }
      return token;
    },

    // Expose id on the session for convenience in server components/routes
    async session({ session, token, user }) {
      console.log("🔵 Session callback:", session, user);
      if (session.user && (token as any)?.uid) {
        (session.user as any).id = (token as any).uid as string;
      }
      return session;
    },
  },

  events: {
    async signIn(message) {
      console.log("🟡 Sign-in event:", message);
    },
  },
  // debug: true,
};
