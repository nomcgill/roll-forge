"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReadyPane from "./ReadyPane";
import HistoryPane from "./HistoryPane";
import ActionLikeForm from "./ActionLikeForm";
import type {
    ActionRecord,
    ModifierRecord,
    CharacterPreferences,
    CharacterRecord,
    Tally,
} from "./types";
import { emptyTally as makeEmptyTally } from "./types";
import { useRouter, useSearchParams } from "next/navigation";

type Props = { characterId: string };

type Mode =
    | "ready"
    | "history"
    | "new-action"
    | "edit-action"
    | "new-modifier"
    | "edit-modifier";

export default function RollWorkspace({ characterId }: Props) {
    const router = useRouter();
    const search = useSearchParams();
    const mode = (search.get("mode") ?? "ready") as Mode;

    const actionId = search.get("actionId");
    const modifierId = search.get("modifierId");

    // Data
    const [character, setCharacter] = useState<CharacterRecord | null>(null);
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [modifiers, setModifiers] = useState<ModifierRecord[]>([]);

    // For edit modes
    const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);
    const [editingModifier, setEditingModifier] = useState<ModifierRecord | null>(null);

    // Selection state
    const [tallies, setTallies] = useState<Record<string, Tally>>({});
    const [selectedPerActionMods, setSelectedPerActionMods] = useState<Record<string, boolean>>({});
    const [selectedPerTurnMods, setSelectedPerTurnMods] = useState<Record<string, boolean>>({});

    const prefs: CharacterPreferences = useMemo(() => {
        const p = character?.preferences;
        return {
            followsAdvantageRules: p?.followsAdvantageRules ?? true,
            critRules: p?.critRules ?? "5e-double-damage-dice",
            critThreshold: p?.critThreshold ?? 20,
            uniqueDamageTypes: p?.uniqueDamageTypes ?? [],
        };
    }, [character]);

    // Fetch character/actions/modifiers
    useEffect(() => {
        let alive = true;
        (async () => {
            const [charRes, actRes, modRes] = await Promise.all([
                fetch(`/api/characters/${characterId}`, { cache: "no-store" }),
                fetch(`/api/characters/${characterId}/actions`, { cache: "no-store" }),
                fetch(`/api/characters/${characterId}/action-modifiers`, { cache: "no-store" }),
            ]);
            if (!alive) return;
            if (charRes.ok) setCharacter((await charRes.json()).character ?? null);
            if (actRes.ok) setActions((await actRes.json()).actions ?? []);
            if (modRes.ok) setModifiers((await modRes.json()).modifiers ?? []);
        })();
        return () => {
            alive = false;
        };
    }, [characterId]);

    // Fetch editing targets when mode/id change
    useEffect(() => {
        let alive = true;
        (async () => {
            if (mode === "edit-action" && actionId) {
                const r = await fetch(`/api/actions/${actionId}`, { cache: "no-store" });
                if (alive) setEditingAction(r.ok ? (await r.json()).action ?? null : null);
            } else {
                setEditingAction(null);
            }
            if (mode === "edit-modifier" && modifierId) {
                const r = await fetch(`/api/action-modifiers/${modifierId}`, { cache: "no-store" });
                if (alive) setEditingModifier(r.ok ? (await r.json()).modifier ?? null : null);
            } else {
                setEditingModifier(null);
            }
        })();
        return () => {
            alive = false;
        };
    }, [mode, actionId, modifierId]);

    // Initialize tallies for any new actions
    useEffect(() => {
        setTallies((prev) => {
            const next = { ...prev };
            for (const a of actions) {
                if (!(a.id in next)) next[a.id] = makeEmptyTally(prefs.followsAdvantageRules);
            }
            return next;
        });
    }, [actions, prefs.followsAdvantageRules]);

    // Scroll-snap helpers (mobile)
    const scrollerRef = useRef<HTMLDivElement>(null);
    const isBuilder =
        mode === "new-action" ||
        mode === "edit-action" ||
        mode === "new-modifier" ||
        mode === "edit-modifier";

    function setMode(
        next: Mode,
        extra?: Record<string, string | number | undefined>
    ) {
        const params = new URLSearchParams(search.toString());
        params.set("mode", next);
        if (extra?.actionId === undefined) params.delete("actionId");
        if (extra?.modifierId === undefined) params.delete("modifierId");
        for (const [k, v] of Object.entries(extra ?? {})) {
            if (v === undefined) params.delete(k);
            else params.set(k, String(v));
        }
        router.replace(`?${params.toString()}`);

        // Only perform horizontal scroll syncing when switching between ready/history.
        if (next === "ready" || next === "history") {
            const node = scrollerRef.current;
            if (!node) return;
            const index = next === "history" ? 1 : 0;
            node.scrollTo({ left: index * node.clientWidth, behavior: "smooth" });
        }
    }

    function onScrollSnap() {
        if (isBuilder) return; // ⛔ disable auto-switch while in builder modes
        const node = scrollerRef.current;
        if (!node) return;
        const idx = Math.round(node.scrollLeft / node.clientWidth);
        const next = (idx === 0 ? "ready" : "history") as Mode;
        if (next !== mode) setMode(next);
    }

    const hasAnyTallies = useMemo(() => {
        return Object.values(tallies).some((t) =>
            "add" in t ? t.add > 0 : (t as any).adv + (t as any).normal + (t as any).disadv > 0
        );
    }, [tallies]);
    const canRoll = hasAnyTallies;

    return (
        <div className="w-full">
            <div
                ref={scrollerRef}
                className={[
                    "relative w-full",
                    // In builder modes: no horizontal scroll, no snap; single-column on desktop
                    isBuilder
                        ? "overflow-x-hidden md:overflow-x-visible md:grid md:grid-cols-1"
                        : "overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none flex md:grid md:grid-cols-2",
                    "gap-0",
                ].join(" ")}
                // Only listen to scroll when not in builder mode
                onScroll={
                    isBuilder
                        ? undefined
                        : () => {
                            clearTimeout((onScrollSnap as any)._t);
                            (onScrollSnap as any)._t = setTimeout(onScrollSnap, 120);
                        }
                }
            >
                {/* Left column: Ready OR Builder */}
                <section className="snap-start shrink-0 w-full md:w-auto md:pr-4">
                    <h1 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">
                        {isBuilder
                            ? mode === "new-action"
                                ? "New Action"
                                : mode === "edit-action"
                                    ? "Edit Action"
                                    : mode === "new-modifier"
                                        ? "New Action Modifier"
                                        : "Edit Action Modifier"
                            : "Ready an Action"}
                    </h1>

                    {isBuilder ? (
                        <ActionLikeForm
                            variant={
                                mode === "new-action" || mode === "edit-action" ? "action" : "modifier"
                            }
                            characterId={characterId}
                            preferences={prefs}
                            initialAction={mode === "edit-action" ? editingAction ?? undefined : undefined}
                            initialModifier={
                                mode === "edit-modifier" ? editingModifier ?? undefined : undefined
                            }
                            onCancel={() => setMode("ready")}
                            onSaved={() => {
                                // Refresh lists after save
                                Promise.all([
                                    fetch(`/api/characters/${characterId}/actions`, {
                                        cache: "no-store",
                                    })
                                        .then((r) => (r.ok ? r.json() : null))
                                        .catch(() => null),
                                    fetch(`/api/characters/${characterId}/action-modifiers`, {
                                        cache: "no-store",
                                    })
                                        .then((r) => (r.ok ? r.json() : null))
                                        .catch(() => null),
                                ])
                                    .then(([a, m]) => {
                                        if (a?.actions) setActions(a.actions);
                                        if (m?.modifiers) setModifiers(m.modifiers);
                                    })
                                    .finally(() => setMode("ready"));
                            }}
                        />
                    ) : (
                        <>
                            <ReadyPane
                                preferences={prefs}
                                actions={actions}
                                modifiers={modifiers}
                                tallies={tallies}
                                setTallies={setTallies}
                                selectedPerActionMods={selectedPerActionMods}
                                setSelectedPerActionMods={setSelectedPerActionMods}
                                selectedPerTurnMods={selectedPerTurnMods}
                                setSelectedPerTurnMods={setSelectedPerTurnMods}
                                onCreateAction={() => setMode("new-action")}
                                onCreateModifier={() => setMode("new-modifier")}
                                onEditAction={(id) => setMode("edit-action", { actionId: id })}
                                onEditModifier={(id) => setMode("edit-modifier", { modifierId: id })}
                            />

                            {/* Sticky footer — centered & wider on desktop, full-width on mobile */}
                            <div className="sticky bottom-2 md:bottom-4 pt-2 pb-1 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent">
                                <div className="flex justify-center">
                                    <button
                                        disabled={!canRoll}
                                        onClick={() => setMode("history")}
                                        className={`rounded-2xl px-5 py-3 font-semibold border transition ${canRoll
                                                ? "bg-slate-200 text-slate-900 border-slate-300 hover:bg-white"
                                                : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                                            } w-full md:w-3/4 lg:w-1/2 max-w-xl mx-auto`}
                                        title={canRoll ? "Switch to History" : "Add at least one tally to enable"}
                                    >
                                        Roll Them Bones
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* Right column: History (HIDDEN in builder modes to avoid accidental switching) */}
                {!isBuilder && (
                    <section className="snap-start shrink-0 w-full md:w-auto md:pl-4">
                        <h1 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Roll History</h1>
                        <HistoryPane />
                    </section>
                )}
            </div>
        </div>
    );
}
