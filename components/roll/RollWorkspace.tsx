"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
    ActionRecord,
    ModifierRecord,
    CharacterPreferences,
    RollMode,
    Tally,
    HistoryGroup,
} from "@/components/roll/types";

import ReadyPane from "./ReadyPane";
import HistoryPane from "./HistoryPane";
import ActionLikeForm from "./ActionLikeForm";
import { executeActionGroup, recomputeTotals } from "@/lib/roll/engine";

type CharacterLike = {
    id: string;
    name?: string;
    preferences?: CharacterPreferences; // may be undefined from server
    actions?: ActionRecord[];
    actionModifiers?: ModifierRecord[];
};

type Props =
    | {
        character: CharacterLike;
        initialActions?: ActionRecord[];
        initialModifiers?: ModifierRecord[];
        characterId?: never;
        preferences?: never;
    }
    | {
        characterId: string;
        preferences?: CharacterPreferences; // may be omitted
        initialActions?: ActionRecord[];
        initialModifiers?: ModifierRecord[];
        character?: never;
    };

// guard
function hasCharacter(
    p: Props
): p is { character: CharacterLike; initialActions?: ActionRecord[]; initialModifiers?: ModifierRecord[] } {
    return (p as any).character != null;
}

// defaults so children never see undefined
function normalizePreferences(p?: CharacterPreferences): CharacterPreferences {
    return {
        advRules: p?.advRules !== false,            // default true
        critRules: p?.critRules ?? "5e-double",     // default 5e crits
        critThreshold: typeof p?.critThreshold === "number" ? p!.critThreshold : 20,
        uniqueDamageTypes: p?.uniqueDamageTypes ?? [],
    };
}

function getParamMode(sp: URLSearchParams) {
    const m = sp.get("mode");
    if (m === "new-action" || m === "new-modifier" || m === "history" || m === "ready") return m;
    return "ready";
}

export default function RollWorkspace(props: Props) {
    const router = useRouter();
    const sp = useSearchParams();
    const mode = getParamMode(sp);

    // normalize inputs
    const characterId: string = hasCharacter(props) ? props.character.id : props.characterId;
    const prefs = normalizePreferences(
        hasCharacter(props) ? props.character.preferences : props.preferences
    );

    // source data (not mutated here)
    const actions: ActionRecord[] = hasCharacter(props)
        ? props.character.actions ?? props.initialActions ?? []
        : props.initialActions ?? [];

    const modifiers: ModifierRecord[] = hasCharacter(props)
        ? props.character.actionModifiers ?? props.initialModifiers ?? []
        : props.initialModifiers ?? [];

    // tallies & selections
    const [tallies, setTallies] = useState<Record<string, Tally>>({});
    const hasAnyTallies = useMemo(
        () =>
            Object.values(tallies).some(
                (t) => (t.normal || 0) + (t.adv || 0) + (t.disadv || 0) > 0
            ),
        [tallies]
    );

    const [perActionSelected, setPerActionSelected] = useState<Set<string>>(new Set());
    const [perTurnSelected, setPerTurnSelected] = useState<Set<string>>(new Set());

    // history (client)
    const [history, setHistory] = useState<HistoryGroup[]>([]);

    // url helper
    const pushMode = useCallback(
        (m: "ready" | "history" | "new-action" | "new-modifier") => {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", m);
            router.push(`${url.pathname}?${url.searchParams.toString()}`);
        },
        [router]
    );

    // handlers
    function onTally(actionId: string, m: RollMode, delta: 1 | -1) {
        setTallies((curr) => {
            const t = curr[actionId] ?? { normal: 0, adv: 0, disadv: 0 };
            const next = { ...t };
            next[m] = Math.max(0, (t[m] || 0) + delta);
            return { ...curr, [actionId]: next };
        });
    }

    function onToggleModifier(modId: string, isPerAction: boolean) {
        if (isPerAction) {
            setPerActionSelected((s) => {
                const nx = new Set(s);
                if (nx.has(modId)) nx.delete(modId);
                else nx.add(modId);
                return nx;
            });
        } else {
            setPerTurnSelected((s) => {
                const nx = new Set(s);
                if (nx.has(modId)) nx.delete(modId);
                else nx.add(modId);
                return nx;
            });
        }
    }

    function resetTallies() {
        setTallies({});
    }

    function onRoll() {
        if (!hasAnyTallies) return;

        const group = executeActionGroup({
            actions,
            modifiers,
            preferences: prefs, // normalized
            selection: {
                actionTallies: tallies,
                perActionModifierIds: Array.from(perActionSelected),
                perTurnModifierIds: Array.from(perTurnSelected),
            },
        });

        setHistory((h) => [group, ...h]);
        resetTallies();

        if (window.matchMedia("(max-width: 1023px)").matches) {
            pushMode("history");
            setTimeout(() => {
                const el = document.querySelector(`[data-group-id="${group.id}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    }

    function onToggleRowSelected(groupId: string, rowIndex: number) {
        setHistory((groups) =>
            groups.map((g) => {
                if (g.id !== groupId) return g;
                const rows = g.rows.slice();
                rows[rowIndex] = { ...rows[rowIndex], selected: !rows[rowIndex].selected } as any;
                return { ...g, rows, totals: recomputeTotals(rows) };
            })
        );
    }

    function onClearHistory() {
        setHistory([]);
    }

    const onCancelForm = () => pushMode("ready");
    const onSavedForm = () => pushMode("ready");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT / READY */}
            <div>
                <header className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">Ready an Action</h2>

                    {/* Quick-create buttons (not tabs; only visible in ready mode) */}
                    {mode === "ready" && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded-lg bg-slate-700/70 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold"
                                onClick={() => pushMode("new-action")}
                            >
                                New Action
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-slate-700/70 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold"
                                onClick={() => pushMode("new-modifier")}
                            >
                                New Modifier
                            </button>
                        </div>
                    )}
                </header>

                {mode === "new-action" ? (
                    <ActionLikeForm
                        variant="action"
                        characterId={characterId}
                        preferences={prefs}
                        onCancel={onCancelForm}
                        onSaved={onSavedForm}
                    />
                ) : mode === "new-modifier" ? (
                    <ActionLikeForm
                        variant="modifier"
                        characterId={characterId}
                        preferences={prefs}
                        onCancel={onCancelForm}
                        onSaved={onSavedForm}
                    />
                ) : (
                    <>
                        <ReadyPane
                            actions={actions}
                            modifiers={modifiers}
                            tallies={tallies}
                            onTally={onTally}
                            selectedPerActionModifierIds={perActionSelected}
                            selectedPerTurnModifierIds={perTurnSelected}
                            onToggleModifier={onToggleModifier}
                            preferences={prefs}
                        />

                        {/* sticky roll button */}
                        <div className="sticky bottom-2 pt-3">
                            <button
                                type="button"
                                disabled={!hasAnyTallies}
                                onClick={onRoll}
                                className={`mx-auto block w-full md:w-2/3 lg:w-3/4 xl:w-2/3 rounded-2xl px-4 py-3 font-bold
                  ${hasAnyTallies
                                        ? "bg-slate-200 text-slate-900 hover:bg-white"
                                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                Roll Them Bones
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* RIGHT / HISTORY */}
            <div>
                <header className="mb-2">
                    <h2 className="text-xl font-bold lg:block hidden">Roll History</h2>
                </header>
                <HistoryPane
                    groups={history}
                    onToggleRowSelected={onToggleRowSelected}
                    onClearHistory={onClearHistory}
                />
            </div>
        </div>
    );
}
