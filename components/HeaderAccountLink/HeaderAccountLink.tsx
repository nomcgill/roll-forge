"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

export default function HeaderAccountLink(): ReactElement | null {
    const { status } = useSession();
    const pathname = usePathname() || "/";

    // Only show when authenticated
    if (status !== "authenticated") return null;

    // Hide on root and on /account (and any subpaths)
    const isRoot = pathname === "/";
    const isAccount = pathname === "/account" || pathname.startsWith("/account/");
    if (isRoot || isAccount) return null;

    return (
        <div className="fixed top-4 right-4 z-50">
            <Link
                href="/account"
                className="text-sm underline bg-white/80 backdrop-blur px-2 py-1 rounded"
                aria-label="Go to account settings"
            >
                Account
            </Link>
        </div>
    );
}
