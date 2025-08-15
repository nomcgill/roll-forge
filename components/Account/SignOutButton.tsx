"use client";

import { signOut } from "next-auth/react";
import type { ReactElement } from "react";

export default function SignOutButton(): ReactElement {
    return (
        <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-3 py-2 rounded border shadow-sm"
            aria-label="Sign out"
        >
            Sign Out
        </button>
    );
}
