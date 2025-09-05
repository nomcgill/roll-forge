'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateDemoButton() {
    if (process.env.NODE_ENV === "production") return null;

    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const handleClick = async () => {
        setBusy(true);
        setMsg(null);
        try {
            const res = await fetch("/api/dev/seed-demo", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                setMsg(`Error: ${data?.error ?? "Unknown error"}`);
            } else {
                setMsg(`Demo ready. Character ID: ${data.characterId}`);
                // Force server components to refetch so the new character appears immediately
                router.refresh();
            }
        } catch {
            setMsg("Network error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-3 border rounded bg-gray-50 flex items-center gap-3">
            <button
                onClick={handleClick}
                disabled={busy}
                className="px-3 py-1.5 rounded border shadow-sm disabled:opacity-60"
            >
                {busy ? "Creating…" : "Create demo content"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
        </div>
    );
}
