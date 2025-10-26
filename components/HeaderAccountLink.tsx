// components/HeaderAccountLink.tsx
"use client";

import Link from "next/link";
import React from "react";

type Props = {
    className?: string;
};

export default function HeaderAccountLink({ className }: Props) {
    // Adjust href/text to whatever you use today
    return (
        <Link href="/account" className={className ?? ""}>
            Account
        </Link>
    );
}
