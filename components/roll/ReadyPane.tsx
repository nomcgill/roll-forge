"use client";

import React from "react";
import type {
    ActionRecord,
    ModifierRecord,
    CharacterPreferences,
    RollMode,
    Tally,
    DiceEntryToHit,
    DiceEntry,
} from "@/components/roll/types";

type Props = {
    actions: ActionRecord[];
    modifiers: ModifierRecord[]; // we split into per-action/per-turn here
    tallies: Record<string, Tally>;
    onTally: (actionId: string, mode: RollMode, delta: 1 | -1) => void;
    selectedPerActionModifierIds: Set<string>;
    selectedPerTurnModifierIds: Set<string>;
    onToggleModifier: (modifierId: string, isPerAction: boolean) => void;
    preferences?: CharacterPreferences; // ✅ tolerate undefined, we’ll default
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
    preferences,
}: Props) {
    const prefs = preferences ?? DEFAULT_PREFS;
    const advEnabled = prefs.advRules !== false;

    const perActionMods = React.useMemo(
        () => modifiers.filter((m) => m.factorsJson.eachAttack),
        [modifiers]
    );
    const perTurnMods = React.useMemo(
        () => modifiers.filter((m) => !m.factorsJson.eachAttack),
        [modifiers]
    );

    return (
        <section className="flex flex-col gap-4">
            {/* Section 1: Actions list */}
            <div>
                <h3 className="font-semibold mb-2">Actions</h3>
                <div className="flex flex-col gap-3">
                    {actions.length === 0 && (
                        <p className="text-sm text-slate-400">
                            No actions yet. Click “New Action” to create one.
                        </p>
                    )}

                    {actions.map((a) => (
                        <ActionPreviewCard
                            key={a.id}
                            action={a}
                            tally={tallies[a.id] ?? { normal: 0, adv: 0, disadv: 0 }}
                            onTally={onTally}
                            advEnabled={advEnabled}
                        />
                    ))}
                </div>
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
                                <label
                                    key={m.id}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                    title={incompatible ? "Incompatible with current selections" : ""}
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
                                <label
                                    key={m.id}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                    title={incompatible ? "Incompatible with current selections" : ""}
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
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -------------------------- subcomponents -------------------------- */

function ActionPreviewCard({
    action,
    tally,
    onTally,
    advEnabled,
}: {
    action: ActionRecord;
    tally: Tally;
    onTally: (actionId: string, mode: RollMode, delta: 1 | -1) => void;
    advEnabled: boolean;
}) {
    const toHit = action.factorsJson.toHit ?? { static: 0, signStatic: 1, dice: [] };
    const dmg = action.factorsJson.damage ?? [];
    const cond = action.factorsJson.conditions ?? {};

    const hitPreview = formatToHitPreview(toHit.dice ?? [], toHit.static ?? 0, toHit.signStatic ?? 1);
    const damagePreview = dmg.map((d) => formatDamagePreview(d.dice ?? [], d.static ?? 0, d.signStatic ?? 1, d.type));

    const handleClick = (mode: RollMode) => onTally(action.id, mode, 1);
    const handleContext = (e: React.MouseEvent, mode: RollMode) => {
        e.preventDefault();
        onTally(action.id, mode, -1);
    };

    return (
        <div className="rounded-2xl border border-slate-700/70 p-3 bg-slate-900/40">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h5 className="font-semibold">{action.name}</h5>
                    <div className="text-xs mt-1 space-y-0.5">
                        <div>Attack: {hitPreview}</div>
                        {damagePreview.map((s, i) => (
                            <div key={i}>{s}</div>
                        ))}
                        <div className="text-[11px] text-slate-400">
                            {formatConditions(cond)}
                        </div>
                    </div>
                </div>

                {/* Tally buttons */}
                <div className="flex flex-col items-end gap-1">
                    {advEnabled ? (
                        <>
                            <TallyButton
                                label={`Adv (${tally.adv || 0})`}
                                onClick={() => handleClick("adv")}
                                onContextMenu={(e) => handleContext(e, "adv")}
                            />
                            <TallyButton
                                label={`Normal (${tally.normal || 0})`}
                                onClick={() => handleClick("normal")}
                                onContextMenu={(e) => handleContext(e, "normal")}
                            />
                            <TallyButton
                                label={`Disadv (${tally.disadv || 0})`}
                                onClick={() => handleClick("disadv")}
                                onContextMenu={(e) => handleContext(e, "disadv")}
                            />
                        </>
                    ) : (
                        <TallyButton
                            label={`Add (${tally.normal || 0})`}
                            onClick={() => handleClick("normal")}
                            onContextMenu={(e) => handleContext(e, "normal")}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function TallyButton({
    label,
    onClick,
    onContextMenu,
}: {
    label: string;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) {
    return (
        <button
            type="button"
            className="rounded-lg bg-slate-700/70 hover:bg-slate-600 px-2 py-1 text-xs"
            onClick={onClick}
            onContextMenu={onContextMenu}
            title="Right-click to decrement"
        >
            {label}
        </button>
    );
}

/* -------------------------- helpers -------------------------- */

function formatToHitPreview(dice: DiceEntryToHit[], staticVal: number, signStatic: 1 | -1) {
    const diceStr = dice && dice.length
        ? dice.map((d) => `${d.count}d${d.size}${d.canCrit ? "*" : ""}${d.signDice === -1 ? " (−)" : ""}`).join(" + ")
        : "—";
    const staticStr = staticVal ? ` ${signStatic === -1 ? "−" : "+"} ${Math.abs(staticVal)}` : "";
    return `${diceStr}${staticStr}`;
}

function formatDamagePreview(dice: DiceEntry[], staticVal: number, signStatic: 1 | -1, type: string | null | undefined) {
    const diceStr = dice && dice.length
        ? dice.map((d) => `${d.count}d${d.size}${d.signDice === -1 ? " (−)" : ""}`).join(" + ")
        : staticVal ? "Flat" : "—";
    const staticStr = staticVal ? ` ${signStatic === -1 ? "−" : "+"} ${Math.abs(staticVal)}` : "";
    const t = type == null ? "Undefined" : type;
    return `${diceStr}${staticStr} ${t}`;
}

function formatConditions(c?: {
    wielding?: "weapon" | "unarmed";
    distance?: "melee" | "ranged";
    spell?: boolean;
}) {
    if (!c) return "";
    const bits: string[] = [];
    if (c.distance) bits.push(cap(c.distance));
    if (c.wielding) bits.push(cap(c.wielding));
    if (c.spell) bits.push("Spell");
    return bits.length ? bits.join(" ") : "";
}

function cap(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// visual-only flag (no filtering)
function isIncompatible(_m: ModifierRecord) {
    return false;
}
