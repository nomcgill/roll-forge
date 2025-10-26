// components/CharacterDetails/CharacterSettingsBlock.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterPreferences } from "@/components/roll/types";
import CharacterThemePicker from "@/components/CharacterThemePicker";
import { readThemeFromPreferences, type ThemeName } from "@/lib/validation/theme";


type Props = {
    characterId: string;
    initialName: string;
    initialAvatarUrl?: string | null;
    initialPreferences?: unknown | null;
    onSaved?: () => void;
    onCancel?: () => void;
};

const CRIT_OPTIONS = ["5e-double"] as const;
type CritRule = (typeof CRIT_OPTIONS)[number];

function normPrefs(p: any | null | undefined): {
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
}: Props) {
    // Snapshot for CANCEL
    const initial = useMemo(
        () => ({
            name: initialName ?? "",
            avatarUrl: initialAvatarUrl ?? "",
            prefs: normPrefs(initialPreferences),
        }),
        [initialName, initialAvatarUrl, initialPreferences]
    );
    const currentTheme: ThemeName = readThemeFromPreferences(initialPreferences as any);

    // Local state
    const [name, setName] = useState(initial.name);
    const [avatarUrl, setAvatarUrl] = useState<string>(initial.avatarUrl);
    const [advRules, setAdvRules] = useState<boolean>(initial.prefs.advRules);
    const [critRules, setCritRules] = useState<CritRule>(initial.prefs.critRules);
    const [critThreshold, setCritThreshold] = useState<number>(initial.prefs.critThreshold);

    // Debounced avatar probe (no CORS errors)
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

    // —— PATCH helpers ——

    // Debounce router.refresh() by 150ms to coalesce rapid changes into a single refresh.
    const router = useRouter();
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    function scheduleRefresh() {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
            router.refresh();
            refreshTimer.current = null;
        }, 150);
    }


    async function patch(
        payload: Partial<{
            name: string;
            avatarUrl: string | null;
            preferences: Partial<CharacterPreferences>;
        }>
    ) {
        const res = await fetch(`/api/characters/${characterId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) scheduleRefresh();
    }


    // Debounced PATCH for text/url fields
    const debounced = useRef<ReturnType<typeof setTimeout> | null>(null);
    function patchDebounced(payload: Parameters<typeof patch>[0]) {
        if (debounced.current) clearTimeout(debounced.current);
        debounced.current = setTimeout(() => {
            void patch(payload); // <- triggers scheduleRefresh() when OK
        }, 1500);
    }


    // Name (onChange → debounce PATCH)
    function onNameChange(v: string) {
        setName(v);
        const trimmed = v.trim();
        if (trimmed.length > 0) {
            patchDebounced({ name: trimmed });
        }
    }

    // Avatar (onChange → debounce PATCH, empty -> null)
    function onAvatarChange(v: string) {
        setAvatarUrl(v);
        const out = v.trim().length > 0 ? v.trim() : null;
        patchDebounced({ avatarUrl: out });
    }

    // Adv / Crit (immediate PATCH)
    async function onAdvToggle(next: boolean) {
        setAdvRules(next);
        await patch({ preferences: { advRules: next } });
    }
    async function onCritRule(next: CritRule) {
        setCritRules(next);
        await patch({ preferences: { critRules: next } });
    }
    async function onCritThreshold(next: number) {
        setCritThreshold(next);
        const clamped = Math.min(20, Math.max(1, Number(next) || 20));
        await patch({ preferences: { critThreshold: clamped } });
    }

    // Listen for modal footer events
    useEffect(() => {
        const onDefault = async () => {
            setAdvRules(true);
            setCritRules("5e-double");
            setCritThreshold(20);
            await patch({ preferences: { advRules: true, critRules: "5e-double", critThreshold: 20 } });
        };
        const onCancel = async () => {
            setName(initial.name);
            setAvatarUrl(initial.avatarUrl);
            setAdvRules(initial.prefs.advRules);
            setCritRules(initial.prefs.critRules);
            setCritThreshold(initial.prefs.critThreshold);

            await patch({
                name: initial.name,
                avatarUrl: initial.avatarUrl.trim().length > 0 ? initial.avatarUrl.trim() : null,
                preferences: {
                    advRules: initial.prefs.advRules,
                    critRules: initial.prefs.critRules,
                    critThreshold: initial.prefs.critThreshold,
                },
            });
        };

        const d1 = (e: Event) => void onDefault();
        const d2 = (e: Event) => void onCancel();

        document.addEventListener("char-settings-default", d1 as EventListener);
        document.addEventListener("char-settings-cancel", d2 as EventListener);
        return () => {
            document.removeEventListener("char-settings-default", d1 as EventListener);
            document.removeEventListener("char-settings-cancel", d2 as EventListener);
        };
    }, [characterId, initial]);

    // Validations
    const validThreshold = Number.isFinite(critThreshold) && critThreshold >= 1 && critThreshold <= 20;

    const themeNow: ThemeName = currentTheme; // rendered picker saves via its own endpoint

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.currentTarget.value)}
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
                        onChange={(e) => onAvatarChange(e.currentTarget.value)}
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
                        onChange={(e) => onAdvToggle(e.currentTarget.checked)}
                        className="accent-slate-200"
                    />
                    <span className="text-sm">Use advantage rules</span>
                </label>

                {/* Crit rule */}
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">Crit rule</span>
                    <select
                        value={critRules}
                        onChange={(e) => onCritRule(e.currentTarget.value as CritRule)}
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
                        onChange={(e) => onCritThreshold(parseInt(e.currentTarget.value || "0", 10))}
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                    />
                    {!validThreshold && (
                        <span className="text-xs text-rose-300">Enter a value between 1 and 20.</span>
                    )}
                </label>
            </div>

            {/* Theme inside settings (picker saves via its own endpoint) */}
            <div className="border-t border-slate-700/50 pt-4">
                <h2 className="text-sm font-semibold mb-2">Theme</h2>
                <CharacterThemePicker
                    characterId={characterId}
                    currentTheme={themeNow}
                    scopeId="theme-scope"
                    onChanged={() => router.refresh()}
                />
            </div>
        </div>
    );
}
