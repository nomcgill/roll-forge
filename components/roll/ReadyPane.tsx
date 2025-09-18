// components/roll/ReadyPane.tsx
"use client";

import React from "react";
import type {
    ActionRecord,
    ModifierRecord,
    CharacterPreferences,
    RollMode,
    Tally,
} from "@/components/roll/types";
import ActionPreviewCard from "@/components/roll/ActionPreviewCard";

type Props = {
    actions: ActionRecord[];
    modifiers: ModifierRecord[]; // split into per-action/per-turn here
    tallies: Record<string, Tally>;
    onTally: (actionId: string, mode: RollMode, delta: 1 | -1) => void;
    selectedPerActionModifierIds: Set<string>;
    selectedPerTurnModifierIds: Set<string>;
    onToggleModifier: (modifierId: string, isPerAction: boolean) => void;
    /** Optional management hooks (UI shows only when provided) */
    onEditAction?: (actionId: string) => void;
    onDeleteAction?: (actionId: string) => void;
    onEditModifier?: (modifierId: string) => void;
    onDeleteModifier?: (modifierId: string) => void;
    preferences?: CharacterPreferences;
};

const DEFAULT_PREFS: CharacterPreferences = {
    advRules: true,
    critRules: "5e-double",
    critThreshold: 20,
    uniqueDamageTypes: [],
};

export default function ReadyPane({
    actions,
    modifiers,
    tallies,
    onTally,
    selectedPerActionModifierIds,
    selectedPerTurnModifierIds,
    onToggleModifier,
    onEditAction,
    onDeleteAction,
    onEditModifier,
    onDeleteModifier,
    preferences,
}: Props) {
    const prefs = preferences ?? DEFAULT_PREFS;

    // Derive modifier buckets
    const perActionMods = React.useMemo(
        () => modifiers.filter((m) => m.factorsJson.eachAttack),
        [modifiers]
    );
    const perTurnMods = React.useMemo(
        () => modifiers.filter((m) => !m.factorsJson.eachAttack),
        [modifiers]
    );

    // Local selection for "active" actions (drives Section 3 previews)
    const [selectedActionIds, setSelectedActionIds] = React.useState<Set<string>>(
        new Set()
    );

    // Initialize selection:
    // 1) any action with non-zero tallies
    // 2) else favorites
    // 3) else if exactly one action exists, select it
    React.useEffect(() => {
        const preselected = new Set<string>();

        // from tallies
        actions.forEach((a) => {
            const t = tallies[a.id];
            if (t && ((t.normal ?? 0) + (t.adv ?? 0) + (t.disadv ?? 0)) > 0) {
                preselected.add(a.id);
            }
        });

        // favorites if nothing tallied
        if (preselected.size === 0) {
            actions.forEach((a) => {
                if (a.favorite) preselected.add(a.id);
            });
        }

        // single action convenience
        if (preselected.size === 0 && actions.length === 1) {
            preselected.add(actions[0].id);
        }

        setSelectedActionIds(preselected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions]);

    const toggleAction = (id: string) => {
        setSelectedActionIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const activeActions = React.useMemo(
        () => actions.filter((a) => selectedActionIds.has(a.id)),
        [actions, selectedActionIds]
    );

    // Selected modifier arrays for previews
    const activePerActionModifiers = React.useMemo(
        () => perActionMods.filter((m) => selectedPerActionModifierIds.has(m.id)),
        [perActionMods, selectedPerActionModifierIds]
    );
    const activePerTurnModifiers = React.useMemo(
        () => perTurnMods.filter((m) => selectedPerTurnModifierIds.has(m.id)),
        [perTurnMods, selectedPerTurnModifierIds]
    );

    // Map ActionPreviewCard's onInc/onDec to onTally
    const inc = (id: string, kind: "normal" | "adv" | "disadv") =>
        onTally(id, kind as RollMode, 1);
    const dec = (id: string, kind: "normal" | "adv" | "disadv") =>
        onTally(id, kind as RollMode, -1);

    return (
        <section className="min-w-full w-full max-w-full basis-full snap-start flex flex-col gap-4 overflow-x-hidden md:min-w-0">
            {/* Section 1: toggle-able Actions */}
            <div>
                <h3 className="font-semibold mb-2">Actions</h3>
                {actions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No actions yet. Click “New Action” to create one.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {actions.map((a) => {
                            const on = selectedActionIds.has(a.id);
                            return (
                                <div
                                    key={a.id}
                                    className="relative inline-flex items-center gap-1"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleAction(a.id)}
                                        aria-pressed={on}
                                        className={`relative inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 min-w-11 ${on
                                                ? "ring-2 ring-indigo-500 bg-indigo-50 text-indigo-900"
                                                : "bg-white"
                                            }`}
                                        title={on ? "Active" : "Inactive"}
                                    >
                                        <span className="mr-1" aria-hidden>
                                            {a.favorite ? "★" : "☆"}
                                        </span>
                                        <span className="truncate max-w-[12rem]">{a.name}</span>
                                    </button>

                                    {(onEditAction || onDeleteAction) && (
                                        <span className="flex items-center gap-1 -ml-1">
                                            {onEditAction && (
                                                <button
                                                    type="button"
                                                    aria-label={`Edit: ${a.name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditAction(a.id);
                                                    }}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    ✎
                                                </button>
                                            )}
                                            {onDeleteAction && (
                                                <button
                                                    type="button"
                                                    aria-label={`Delete: ${a.name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteAction(a.id);
                                                    }}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section 2: Modifiers pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Per Action */}
                <div>
                    <h4 className="font-semibold mb-2">Per Action Modifiers</h4>
                    <div className="flex flex-col gap-2">
                        {perActionMods.length === 0 && (
                            <p className="text-sm text-slate-400">None created yet.</p>
                        )}
                        {perActionMods.map((m) => {
                            const checked = selectedPerActionModifierIds.has(m.id);
                            const incompatible = isIncompatible(m);
                            return (
                                <div
                                    key={m.id}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <label
                                        className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                                        title={
                                            incompatible ? "Incompatible with current selections" : ""
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => onToggleModifier(m.id, true)}
                                            className="accent-slate-200"
                                        />
                                        <span>
                                            {m.name}
                                            {incompatible && (
                                                <span className="ml-2 rounded bg-rose-300 text-rose-900 px-1 py-[1px] text-[10px] font-bold">
                                                    incompatible
                                                </span>
                                            )}
                                        </span>
                                    </label>

                                    {(onEditModifier || onDeleteModifier) && (
                                        <span className="flex items-center gap-1">
                                            {onEditModifier && (
                                                <button
                                                    type="button"
                                                    aria-label={`Edit: ${m.name}`}
                                                    onClick={() => onEditModifier(m.id)}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    ✎
                                                </button>
                                            )}
                                            {onDeleteModifier && (
                                                <button
                                                    type="button"
                                                    aria-label={`Delete: ${m.name}`}
                                                    onClick={() => onDeleteModifier(m.id)}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Per Turn */}
                <div>
                    <h4 className="font-semibold mb-2">Per Turn Modifiers</h4>
                    <div className="flex flex-col gap-2">
                        {perTurnMods.length === 0 && (
                            <p className="text-sm text-slate-400">None created yet.</p>
                        )}
                        {perTurnMods.map((m) => {
                            const checked = selectedPerTurnModifierIds.has(m.id);
                            const incompatible = isIncompatible(m);
                            return (
                                <div
                                    key={m.id}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <label
                                        className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                                        title={
                                            incompatible ? "Incompatible with current selections" : ""
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => onToggleModifier(m.id, false)}
                                            className="accent-slate-200"
                                        />
                                        <span>
                                            {m.name}
                                            {incompatible && (
                                                <span className="ml-2 rounded bg-rose-300 text-rose-900 px-1 py-[1px] text-[10px] font-bold">
                                                    incompatible
                                                </span>
                                            )}
                                        </span>
                                    </label>

                                    {(onEditModifier || onDeleteModifier) && (
                                        <span className="flex items-center gap-1">
                                            {onEditModifier && (
                                                <button
                                                    type="button"
                                                    aria-label={`Edit: ${m.name}`}
                                                    onClick={() => onEditModifier(m.id)}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    ✎
                                                </button>
                                            )}
                                            {onDeleteModifier && (
                                                <button
                                                    type="button"
                                                    aria-label={`Delete: ${m.name}`}
                                                    onClick={() => onDeleteModifier(m.id)}
                                                    className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Section 3: interactive previews for ACTIVE actions */}
            <div>
                <h4 className="font-semibold mb-2">Selected</h4>
                <div className="flex flex-col gap-3">
                    {activeActions.length === 0 ? (
                        <p className="text-sm text-slate-400">No active actions selected.</p>
                    ) : (
                        activeActions.map((a) => {
                            const t = tallies[a.id] ?? { normal: 0, adv: 0, disadv: 0 };
                            return (
                                <div key={a.id} className="w-full max-w-full">
                                    <ActionPreviewCard
                                        action={a}
                                        counts={{
                                            normal: t.normal ?? 0,
                                            adv: t.adv ?? 0,
                                            disadv: t.disadv ?? 0,
                                        }}
                                        perActionModifiers={activePerActionModifiers}
                                        perTurnModifiers={activePerTurnModifiers}
                                        onInc={(kind) => inc(a.id, kind)}
                                        onDec={(kind) => dec(a.id, kind)}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
}

/* -------------------------- helpers -------------------------- */

// visual-only flag (no filtering)
function isIncompatible(_m: ModifierRecord) {
    return false;
}
