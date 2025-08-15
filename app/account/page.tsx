export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/session";
import SignOutButton from "@/components/Account/SignOutButton";

export default async function AccountPage() {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
        redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/account")}`);
    }

    return (
        <main className="p-6 max-w-xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Account</h1>
            </header>

            <nav className="flex gap-3">
                <Link
                    href="/characters"
                    className="underline"
                    aria-label="Back to your character list"
                >
                    ← Back to Characters
                </Link>
            </nav>

            <section className="pt-2">
                <h2 className="text-lg font-semibold mb-2">Session</h2>
                <SignOutButton />
            </section>
        </main>
    );
}
