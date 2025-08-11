import type { Session } from "next-auth";

/** Narrow a NextAuth Session to a string userId (or null). */
export function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
