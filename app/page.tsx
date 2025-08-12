'use client';

import RotatingDie from '@/components/RotatingDie';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/characters'); // redirect if logged in
    }
  }, [status, router]);

  // Don’t render the homepage when logged in (redirect happens immediately).
  if (status === 'authenticated') return null;

  return (
    <main className="min-h-[100svh] flex flex-col items-center justify-center p-6 bg-black text-white">
      <RotatingDie height="48svh" className="w-full" />

      {/* Your existing auth buttons — centered horizontally, below the die */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => signIn()}
          className="rounded-2xl px-5 py-2 border border-orange-500 hover:bg-orange-500/10 transition"
        >
          Sign in
        </button>
      </div>
    </main>
  );
}
