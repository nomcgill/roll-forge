'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ThemeName } from "@/lib/validation/theme";

type Props = {
    characterId: string;
    currentTheme: ThemeName;
    scopeId?: string; // id of the ThemeScope wrapper (defaults to "theme-scope")
};

const THEMES: ThemeName[] = ["ember", "azure", "verdant", "amethyst"];

export default function CharacterThemePicker({ characterId, currentTheme, scopeId = "theme-scope" }: Props) {
    const [theme, setTheme] = useState<ThemeName>(currentTheme);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    async function setServerTheme(next: ThemeName) {
        startTransition(async () => {
            // 1) Optimistic state for the UI
            setTheme(next);
            // 2) Instant CSS: flip data-theme on the wrapper now
            (document.getElementById(scopeId) ?? document.documentElement)
                .setAttribute("data-theme", next);

            // 3) Persist to server, then gently revalidate without full reload
            await fetch(`/api/characters/${characterId}/theme`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: next }),
            }).then(() => {
                // keep UI  server in sync; soft refresh avoids a full page load
                router.refresh();
            }).catch(() => { });
        });
    }

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
                    className={`btn px-3 py-0 ${theme === t ? "ring-brand" : ""} ${isPending ? "opacity-80" : ""}`}
                >
                    {capitalizeFirst(t)}
                </button>
            ))}
        </div>
    );
}
