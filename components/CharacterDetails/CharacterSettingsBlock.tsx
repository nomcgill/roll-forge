// components/CharacterDetails/CharacterSettingsBlock.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterPreferences } from "@/components/roll/types";
import CharacterThemePicker from "@/components/CharacterThemePicker"; // uses same API as on the page
import { readThemeFromPreferences, type ThemeName } from "@/lib/validation/theme";

/**
 * Minimal character settings editor for v1:
 * - name
 * - avatarUrl (with debounced image probe validation to avoid CORS noise)
 * - preferences: advRules, critRules ("5e-double" only in v1), critThreshold (1..20)
 * - theme: shown inline via CharacterThemePicker (submits via its own endpoint)
 *
 * NOTE: We intentionally DO NOT surface "unique damage types" in v1.
 */

type Props = {
    characterId: string;
    initialName: string;
    initialAvatarUrl?: string | null;
    initialPreferences?: unknown | null; // Prisma JSON -> unknown on the client
    onSaved?: () => void;
    onCancel?: () => void;
};

// Your current schema narrows critRules to a single literal in practice.
const CRIT_OPTIONS = ["5e-double"] as const;
type CritRule = (typeof CRIT_OPTIONS)[number];

function normalizePreferences(p: any | null | undefined): {
    advRules: boolean;
    critRules: CritRule;
    critThreshold: number;
} {
    const raw = p ?? {};
    const crit =
        CRIT_OPTIONS.includes(raw?.critRules) ? (raw.critRules as CritRule) : "5e-double";
    const threshold =
        typeof raw?.critThreshold === "number" && Number.isFinite(raw.critThreshold)
            ? raw.critThreshold
            : 20;
    return {
        advRules: raw?.advRules !== false,
        critRules: crit,
        critThreshold: threshold,
    };
}

type UrlStatus = "idle" | "checking" | "ok" | "bad" | "unknown";

export default function CharacterSettingsBlock({
    characterId,
    initialName,
    initialAvatarUrl,
    initialPreferences,
    onSaved,
    onCancel,
}: Props) {
    const prefs = useMemo(() => normalizePreferences(initialPreferences), [initialPreferences]);
    const currentTheme: ThemeName = readThemeFromPreferences(initialPreferences as any);

    // Local form state
    const [name, setName] = useState(initialName ?? "");
    const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl ?? "");
    const [advRules, setAdvRules] = useState<boolean>(prefs.advRules);
    const [critRules, setCritRules] = useState<CritRule>(prefs.critRules);
    const [critThreshold, setCritThreshold] = useState<number>(prefs.critThreshold);

    // Debounced image probe validation (no CORS console errors)
    const [avatarStatus, setAvatarStatus] = useState<UrlStatus>("idle");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const probeRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!avatarUrl) {
            setAvatarStatus("idle");
            return;
        }
        setAvatarStatus("checking");

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (probeRef.current) {
                probeRef.current.onload = null;
                probeRef.current.onerror = null;
                probeRef.current = null;
            }
            const img = new Image();
            probeRef.current = img;
            img.onload = () => {
                setAvatarStatus("ok");
                img.onload = null;
                img.onerror = null;
                probeRef.current = null;
            };
            img.onerror = () => {
                // Allow save: many CDNs block probes/hotlinking
                setAvatarStatus("unknown");
                img.onload = null;
                img.onerror = null;
                probeRef.current = null;
            };
            img.src = avatarUrl;
        }, 450);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (probeRef.current) {
                probeRef.current.onload = null;
                probeRef.current.onerror = null;
                probeRef.current = null;
            }
        };
    }, [avatarUrl]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>("");

    const validThreshold =
        Number.isFinite(critThreshold) && critThreshold >= 1 && critThreshold <= 20;

    const canSave =
        !submitting &&
        name.trim().length > 0 &&
        validThreshold &&
        avatarStatus !== "bad";

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSave) return;

        setSubmitting(true);
        setError("");

        // Convert empty string -> null for avatarUrl
        const avatarPatch =
            avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl.trim() : null;

        // v1 prefs only (no unique damage types UI)
        const preferencesPatch: Partial<CharacterPreferences> = {
            advRules,
            critRules,
            critThreshold: Math.min(20, Math.max(1, Number(critThreshold) || 20)),
            // NOTE: no uniqueDamageTypes here in v1 UI
            // NOTE: theme is edited via CharacterThemePicker below (its own endpoint)
        };

        try {
            const res = await fetch(`/api/characters/${characterId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                // Server will MERGE preferences with existing instead of replacing
                body: JSON.stringify({
                    name: name.trim(),
                    avatarUrl: avatarPatch,
                    preferences: preferencesPatch,
                }),
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || "Failed to save character settings.");
            }

            // Refresh page data; we keep this lightweight.
            if (typeof window !== "undefined") {
                // eslint-disable-next-line no-restricted-globals
                location.reload();
            }
            onSaved?.();
        } catch (err: any) {
            setError(err?.message ?? "Save failed.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6" data-testid="character-settings-block">
            {error && (
                <p className="text-sm rounded bg-rose-100/10 border border-rose-300/30 text-rose-200 px-2 py-1">
                    {error}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                        placeholder="Character name"
                        required
                    />
                </label>

                {/* Avatar URL */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Avatar URL (optional)</span>
                    <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.currentTarget.value)}
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                        placeholder="https://…"
                    />
                    {avatarUrl && (
                        <span className="mt-1 text-xs">
                            {avatarStatus === "checking" && "Checking…"}
                            {avatarStatus === "ok" && "Looks good!"}
                            {avatarStatus === "bad" && "URL appears unreachable."}
                            {avatarStatus === "unknown" && "Could not verify (CORS). You may still save."}
                        </span>
                    )}
                </label>

                {/* Advantage rules */}
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={advRules}
                        onChange={(e) => setAdvRules(e.currentTarget.checked)}
                        className="accent-slate-200"
                    />
                    <span className="text-sm">Use advantage rules</span>
                </label>

                {/* Crit rule */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Crit rule</span>
                    <select
                        value={critRules}
                        onChange={(e) => setCritRules(e.currentTarget.value as CritRule)}
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                    >
                        {CRIT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Crit threshold */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Crit threshold (1–20)</span>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={critThreshold}
                        onChange={(e) =>
                            setCritThreshold(parseInt(e.currentTarget.value || "0", 10))
                        }
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                    />
                    {!validThreshold && (
                        <span className="text-xs text-rose-300">
                            Enter a value between 1 and 20.
                        </span>
                    )}
                </label>
            </div>

            {/* Inline theme editing (uses existing endpoint & ThemeScope) */}
            <div className="border-t border-slate-700/50 pt-4">
                <h2 className="text-sm font-semibold mb-2">Theme</h2>
                <CharacterThemePicker
                    characterId={characterId}
                    currentTheme={currentTheme}
                    scopeId="theme-scope"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={!canSave}
                    className={`rounded-lg px-4 py-2 font-semibold ${canSave
                            ? "bg-slate-200 text-slate-900 hover:bg-white"
                            : "bg-slate-700 text-slate-400 cursor-not-allowed"
                        }`}
                >
                    Save
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
