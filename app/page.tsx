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

  if (status === 'authenticated') return null;

  return (
    <main className="relative min-h-[100svh] bg-black text-white">
      {/* Fullscreen background animation */}
      <RotatingDie fullScreen />

      {/* Sign-In overlay, centered */}
      <section className="relative z-10 min-h-[100svh] flex items-center justify-center">
        <button
          onClick={() => signIn()}
          className="rounded-2xl px-5 py-2 border border-orange-500 hover:bg-orange-500/10 transition"
        >
          Sign in
        </button>
      </section>
    </main>
  );
}
