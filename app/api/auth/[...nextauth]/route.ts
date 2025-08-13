import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Pass typed options into NextAuth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
