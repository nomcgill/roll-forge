"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

type CreateBody = {
    name: string;
    avatarUrl?: string; // empty string allowed; server will coerce "" -> null
};

export default function CharacterForm(): ReactElement {
    const router = useRouter();
    const [name, setName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const body: CreateBody = { name, avatarUrl };
            const res = await fetch("/api/characters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.status === 201) {
                const location = res.headers.get("Location");
                if (location) {
                    router.push(location);
                } else {
                    const data = await res.json().catch(() => null);
                    if (data?.id) router.push(`/characters/${data.id}`);
                    else router.push("/characters");
                }
                return;
            }

            if (res.status === 422) {
                const data = await res.json().catch(() => null);
                const msg =
                    data?.issues?.fieldErrors?.name?.[0] ??
                    data?.issues?.formErrors?.[0] ??
                    "Please fix the highlighted fields.";
                setError(msg);
                return;
            }

            if (res.status === 401) {
                router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent("/characters/new")}`);
                return;
            }

            const data = await res.json().catch(() => null);
            setError(data?.error ?? `Unexpected error (status ${res.status})`);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {error && (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            )}
            <div className="space-y-1">
                <label htmlFor="name" className="block font-medium">
                    Name
                </label>
                <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Eg. Aria Quickstep"
                    required
                />
            </div>
            <div className="space-y-1">
                <label htmlFor="avatarUrl" className="block font-medium">
                    Avatar URL (optional)
                </label>
                <input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="https://…"
                />
            </div>
            <button disabled={submitting} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
                {submitting ? "Creating…" : "Create"}
            </button>
        </form>
    );
}
