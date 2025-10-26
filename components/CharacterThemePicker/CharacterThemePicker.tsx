'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ThemeName } from "@/lib/validation/theme";

type Props = {
    characterId: string;
    currentTheme: ThemeName;
    scopeId?: string; // id of the ThemeScope wrapper (defaults to "theme-scope")
    onChanged?: () => void; // optional callback when theme is changed
};

const THEMES: ThemeName[] = ["ember", "azure", "verdant", "amethyst"];

export default function CharacterThemePicker({
    characterId,
    currentTheme,
    scopeId = "theme-scope",
    onChanged,
}: Props) {
    const [theme, setTheme] = useState<ThemeName>(currentTheme);
    const [pending, setPending] = useState(false); // (optional)


    async function setServerTheme(next: ThemeName) {
        if (pending || next === theme) return;
        setPending(true);
        try {
            const res = await fetch(`/api/characters/${characterId}/theme`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: next }),
            });
            if (!res.ok) throw new Error("Failed to save theme");

            // Optimistically reflect it locally
            setTheme(next);

            // Notify the parent (CharacterSettingsBlock) so it can router.refresh()
            onChanged?.(); // ← NEW
        } finally {
            setPending(false);
        }
    };


    function capitalizeFirst(str: string): string {
        if (!str) return str; // handle empty string
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return (
        <div className="flex items-center gap-2">
            {THEMES.map((t) => (
                <button
                    key={t}
                    type="button"
                    aria-label={`Set theme ${t}`}
                    onClick={() => setServerTheme(t)}
                    disabled={pending}
                    className={`btn px-3 py-0 ${t === theme ? "ring-brand" : ""}`}
                >
                    {capitalizeFirst(t)}
                </button>
            ))}
        </div>
    );
}
