"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main>
      {session ? (
        <>
          <p>Welcome, {session.user?.name}!</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </>
      ) : (
        <button onClick={() => signIn()}>Sign In</button>
      )}
    </main>
  );
}