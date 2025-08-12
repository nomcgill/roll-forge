"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

type Character = {
    id: string;
    name: string;
    avatarUrl?: string | null;
    preferences?: unknown | null;
};

type Props = {
    character: Character;
};

export default function EditCharacterDropdown({ character }: Props): ReactElement {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(character.name ?? "");
    const [avatarUrl, setAvatarUrl] = useState(character.avatarUrl ?? "");
    const [preferencesText, setPreferencesText] = useState(
        character.preferences ? JSON.stringify(character.preferences, null, 2) : ""
    );
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function resetForm() {
        setName(character.name ?? "");
        setAvatarUrl(character.avatarUrl ?? "");
        setPreferencesText(character.preferences ? JSON.stringify(character.preferences, null, 2) : "");
        setError(null);
    }

    async function onSave() {
        setError(null);

        // Client-side JSON validation for preferences
        let preferences: unknown | null = null;
        const raw = preferencesText.trim();
        if (raw.length > 0) {
            try {
                preferences = JSON.parse(raw);
            } catch {
                setError("Preferences must be valid JSON.");
                return;
            }
        } else {
            preferences = null; // allow clearing preferences
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/characters/${character.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    avatarUrl, // server will coerce "" -> null
                    preferences, // null or JSON
                }),
            });

            if (res.status === 200) {
                setOpen(false);
                router.refresh();
                return;
            }

            if (res.status === 401) {
                const callbackUrl = `/characters/${character.id}`;
                router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                return;
            }

            if (res.status === 422) {
                const data = await res.json().catch(() => null);
                const msg =
                    data?.issues?.fieldErrors?.name?.[0] ??
                    data?.issues?.formErrors?.[0] ??
                    "Validation failed. Please review your inputs.";
                setError(msg);
                return;
            }

            const data = await res.json().catch(() => null);
            setError(data?.error ?? `Unexpected error (status ${res.status}).`);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="relative">
            {error && (
                <p role="alert" className="mb-2 text-sm text-red-600">
                    {error}
                </p>
            )}

            <button
                type="button"
                onClick={() => {
                    if (!open) resetForm();
                    setOpen(!open);
                }}
                className="px-3 py-2 rounded border shadow-sm"
                aria-expanded={open}
                aria-controls="edit-character-panel"
            >
                {open ? "Close Edit" : "Edit Character ▾"}
            </button>

            {open && (
                <div
                    id="edit-character-panel"
                    // Anchor panel to the right edge so it opens leftward
                    className="absolute right-0 z-10 mt-2 w-[28rem] max-w-[90vw] rounded-2xl border bg-white p-4 shadow-lg"
                >
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label htmlFor="edit-name" className="block text-sm font-medium">
                                Name
                            </label>
                            <input
                                id="edit-name"
                                className="w-full border rounded p-2"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Eg. Aria Quickstep"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="edit-avatar" className="block text-sm font-medium">
                                Avatar URL (optional)
                            </label>
                            <input
                                id="edit-avatar"
                                className="w-full border rounded p-2"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://…"
                            />
                            <p className="text-xs text-gray-500">Leave blank to clear avatar.</p>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="edit-preferences" className="block text-sm font-medium">
                                Preferences (JSON, optional)
                            </label>
                            <textarea
                                id="edit-preferences"
                                className="w-full border rounded p-2 font-mono text-sm"
                                rows={6}
                                value={preferencesText}
                                onChange={(e) => setPreferencesText(e.target.value)}
                                placeholder='e.g. { "theme": "dark", "dice": { "advantage": true } }'
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saving}
                                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setOpen(false);
                                }}
                                className="px-3 py-2 rounded border"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
