"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReadyPane from "./ReadyPane";
import HistoryPane from "./HistoryPane";
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

export default function RollWorkspace({ characterId }: Props) {
    const router = useRouter();
    const search = useSearchParams();
    const mode = (search.get("mode") ?? "ready") as "ready" | "history" | string;

    // Data
    const [character, setCharacter] = useState<CharacterRecord | null>(null);
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [modifiers, setModifiers] = useState<ModifierRecord[]>([]);

    // Selection state
    const [tallies, setTallies] = useState<Record<string, Tally>>({});
    const [selectedPerActionMods, setSelectedPerActionMods] = useState<Record<string, boolean>>({});
    const [selectedPerTurnMods, setSelectedPerTurnMods] = useState<Record<string, boolean>>({});

    // History presence (enables button even when no tallies)
    const [hasHistory, setHasHistory] = useState(false);

    const prefs: CharacterPreferences = useMemo(() => {
        const p = character?.preferences;
        return {
            followsAdvantageRules: p?.followsAdvantageRules ?? true,
            critRules: p?.critRules ?? "5e-double-damage-dice",
            critThreshold: p?.critThreshold ?? 20,
            uniqueDamageTypes: p?.uniqueDamageTypes ?? [],
        };
    }, [character]);

    // Fetch
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
        return () => { alive = false; };
    }, [characterId]);

    // Initialize tallies for any new actions
    useEffect(() => {
        setTallies(prev => {
            const next = { ...prev };
            for (const a of actions) {
                if (!(a.id in next)) next[a.id] = makeEmptyTally(prefs.followsAdvantageRules);
            }
            return next;
        });
    }, [actions, prefs.followsAdvantageRules]);

    // Scroll-snap: switch mode when the visible pane changes (mobile)
    const scrollerRef = useRef<HTMLDivElement>(null);
    function setMode(next: "ready" | "history") {
        const params = new URLSearchParams(search.toString());
        params.set("mode", next);
        router.replace(`?${params.toString()}`);
        const node = scrollerRef.current;
        if (!node) return;
        const index = next === "ready" ? 0 : 1;
        node.scrollTo({ left: index * node.clientWidth, behavior: "smooth" });
    }

    function onScrollSnap() {
        const node = scrollerRef.current;
        if (!node) return;
        const idx = Math.round(node.scrollLeft / node.clientWidth);
        const next = idx === 0 ? "ready" : "history";
        if (next !== mode) setMode(next);
    }

    // Enable button if any tallies OR if History reports content
    const hasAnyTallies = useMemo(() => {
        return Object.values(tallies).some(t => ("add" in t ? t.add : (t as any).adv + (t as any).normal + (t as any).disadv) > 0);
    }, [tallies]);
    const canRoll = hasHistory || hasAnyTallies;

    return (
        <div className="w-full">
            <div
                ref={scrollerRef}
                className="relative w-full overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none flex md:grid md:grid-cols-2 gap-0"
                onScroll={() => {
                    clearTimeout((onScrollSnap as any)._t);
                    (onScrollSnap as any)._t = setTimeout(onScrollSnap, 120);
                }}
            >
                {/* Ready column */}
                <section className="snap-start shrink-0 w-full md:w-auto md:pr-4">
                    <h1 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Ready an Action</h1>

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
                                title={
                                    canRoll
                                        ? "Switch to History"
                                        : "Add at least one tally to enable (or view History when rolls exist)"
                                }
                            >
                                Roll Them Bones
                            </button>
                        </div>
                    </div>
                </section>

                {/* History column */}
                <section className="snap-start shrink-0 w-full md:w-auto md:pl-4">
                    <h1 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Roll History</h1>
                    <HistoryPane onHasHistoryChange={setHasHistory} />
                </section>
            </div>
        </div>
    );
}
