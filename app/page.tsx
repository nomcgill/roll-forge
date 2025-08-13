'use client';

import RotatingDie from '@/components/RotatingDie';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // If a protected page redirected the user here, it should append ?callbackUrl=...
  // Default to /characters if none was provided.
  const callbackUrl = useMemo(
    () => searchParams.get('callbackUrl') || '/characters',
    [searchParams]
  );

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/characters'); // already logged in → go straight to characters
    }
  }, [status, router]);

  if (status === 'authenticated') return null;

  return (
    <main className="relative min-h-[100svh] bg-black text-white">
      {/* Fullscreen background animation */}
      <RotatingDie fullScreen />

      {/* Centered provider buttons overlay */}
      <section className="relative z-10 min-h-[100svh] flex items-center justify-center">
        <div className="flex flex-col items-stretch gap-4 w-[min(90vw,340px)]">
          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="flex items-center justify-center gap-3 rounded-2xl px-5 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition font-medium"
          >
            {/* simple G icon (svg) */}
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
              <path d="M21.35 11.1h-9.18v2.98h5.28c-.23 1.33-1.6 3.9-5.28 3.9-3.18 0-5.78-2.63-5.78-5.87s2.6-5.87 5.78-5.87c1.82 0 3.04.77 3.74 1.44l2.56-2.47C17.09 3.7 15.02 2.8 12.17 2.8 6.99 2.8 2.8 7.01 2.8 12.11s4.19 9.31 9.37 9.31c5.41 0 8.98-3.8 8.98-9.17 0-.62-.07-1.1-.2-1.15z" fill="currentColor" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => signIn('facebook', { callbackUrl })}
            className="flex items-center justify-center gap-3 rounded-2xl px-5 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition font-medium"
          >
            {/* simple Facebook icon (svg) */}
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
              <path d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.5 1.7-1.5h1.5V5.1C16.3 5 15.4 5 14.4 5 12 5 10.5 6.3 10.5 8.8V11H8v3h2.5v8h3z" fill="currentColor" />
            </svg>
            Continue with Facebook
          </button>
        </div>
      </section>
    </main>
  );
}
