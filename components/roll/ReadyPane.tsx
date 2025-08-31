"use client";

import { useEffect, useMemo } from "react";
import { useLongPress } from "./useLongPress";
import type {
    ActionRecord,
    ModifierRecord,
    CharacterPreferences,
    Tally,
} from "./types";
import { isAddTally, isAdvTally } from "./types";

type Props = {
    preferences: CharacterPreferences;
    actions: ActionRecord[];
    modifiers: ModifierRecord[];
    tallies: Record<string, Tally>;
    setTallies: (updater: (prev: Record<string, Tally>) => Record<string, Tally>) => void;
    selectedPerActionMods: Record<string, boolean>;
    setSelectedPerActionMods: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
    selectedPerTurnMods: Record<string, boolean>;
    setSelectedPerTurnMods: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;

    onCreateAction: () => void;
    onCreateModifier: () => void;
    onEditAction: (id: string) => void;
    onEditModifier: (id: string) => void;
};

export default function ReadyPane(props: Props) {
    const {
        preferences, actions, modifiers,
        tallies, setTallies,
        selectedPerActionMods, setSelectedPerActionMods,
        selectedPerTurnMods, setSelectedPerTurnMods,
        onCreateAction, onCreateModifier, onEditAction, onEditModifier,
    } = props;

    const followsAdv = preferences.followsAdvantageRules;

    const sortedActions = useMemo(
        () => [...actions].sort((a, b) => a.name.localeCompare(b.name)),
        [actions]
    );
    const perActionMods = useMemo(
        () => modifiers.filter(m => m.factorsJson.eachAttack).sort((a, b) => a.name.localeCompare(b.name)),
        [modifiers]
    );
    const perTurnMods = useMemo(
        () => modifiers.filter(m => !m.factorsJson.eachAttack).sort((a, b) => a.name.localeCompare(b.name)),
        [modifiers]
    );

    useEffect(() => {
        setTallies(prev => {
            const next = { ...prev };
            for (const a of actions) {
                if (!(a.id in next)) next[a.id] = followsAdv ? { disadv: 0, normal: 0, adv: 0 } : { add: 0 };
            }
            return next;
        });
        setSelectedPerActionMods(prev => {
            const next = { ...prev };
            for (const m of perActionMods) if (next[m.id] === undefined) next[m.id] = !!m.favorite;
            return next;
        });
        setSelectedPerTurnMods(prev => {
            const next = { ...prev };
            for (const m of perTurnMods) if (next[m.id] === undefined) next[m.id] = !!m.favorite;
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, perActionMods, perTurnMods, followsAdv]);

    function inc(actionId: string, bucket: "disadv" | "normal" | "adv" | "add") {
        setTallies(prev => {
            const curr = prev[actionId];
            if (!curr) return prev;
            if (isAddTally(curr)) {
                const next = Math.min(10, curr.add + 1);
                return { ...prev, [actionId]: { add: bucket === "add" ? next : curr.add } };
            }
            if (isAdvTally(curr)) {
                const next = { ...curr };
                if (bucket === "disadv") next.disadv = Math.min(10, next.disadv + 1);
                if (bucket === "normal") next.normal = Math.min(10, next.normal + 1);
                if (bucket === "adv") next.adv = Math.min(10, next.adv + 1);
                return { ...prev, [actionId]: next };
            }
            return prev;
        });
    }

    function dec(actionId: string, bucket: "disadv" | "normal" | "adv" | "add") {
        setTallies(prev => {
            const curr = prev[actionId];
            if (!curr) return prev;
            if (isAddTally(curr)) {
                const next = Math.max(0, curr.add - 1);
                return { ...prev, [actionId]: { add: bucket === "add" ? next : curr.add } };
            }
            if (isAdvTally(curr)) {
                const next = { ...curr };
                if (bucket === "disadv") next.disadv = Math.max(0, next.disadv - 1);
                if (bucket === "normal") next.normal = Math.max(0, next.normal - 1);
                if (bucket === "adv") next.adv = Math.max(0, next.adv - 1);
                return { ...prev, [actionId]: next };
            }
            return prev;
        });
    }

    const LongPressBtn = ({
        onClick,
        onLongPress,
        children,
        className = "",
        title,
    }: {
        onClick: () => void;
        onLongPress: () => void;
        children: React.ReactNode;
        className?: string;
        title?: string;
    }) => {
        const lp = useLongPress({ onLongPress, delay: 400 });
        return (
            <button
                className={`rounded-2xl px-3 py-2 shadow-sm border border-slate-600/60 bg-slate-800/60 hover:bg-slate-800 ${className}`}
                onClick={onClick}
                onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
                title={title}
                {...lp}
            >
                {children}
            </button>
        );
    };

    return (
        <div className="min-h-full flex flex-col">
            {/* Actions */}
            <section className="mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold mb-2">Actions</h2>
                    <button onClick={onCreateAction} className="text-sm px-3 py-1 rounded-xl border border-slate-700 hover:bg-slate-900">+ New</button>
                </div>
                <ul className="space-y-3">
                    {sortedActions.map((a) => {
                        const t = tallies[a.id];
                        const subtitle = buildActionSubtitle(a);
                        return (
                            <li key={a.id} className="border border-slate-700 rounded-2xl p-3 bg-slate-900/40">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-base font-medium">{a.name}</div>
                                        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
                                        {/* Conditions badges */}
                                        <div className="mt-1 flex gap-2 flex-wrap text-[11px] text-slate-300">
                                            {a.factorsJson.conditions?.wielding && (
                                                <span className="px-2 py-0.5 rounded-full border border-slate-700">
                                                    {a.factorsJson.conditions.wielding === "weapon" ? "Weapon" : "Unarmed"}
                                                </span>
                                            )}
                                            {a.factorsJson.conditions?.distance && (
                                                <span className="px-2 py-0.5 rounded-full border border-slate-700 capitalize">
                                                    {a.factorsJson.conditions.distance}
                                                </span>
                                            )}
                                            {a.factorsJson.conditions?.spell && (
                                                <span className="px-2 py-0.5 rounded-full border border-slate-700">Spell</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tally buttons + Edit */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {!t ? null : isAddTally(t) ? (
                                            <LongPressBtn
                                                onClick={() => inc(a.id, "add")}
                                                onLongPress={() => dec(a.id, "add")}
                                                title="Tap to add; long-press or right-click to remove"
                                            >
                                                Add {t.add}
                                            </LongPressBtn>
                                        ) : isAdvTally(t) ? (
                                            <>
                                                <LongPressBtn
                                                    onClick={() => inc(a.id, "disadv")}
                                                    onLongPress={() => dec(a.id, "disadv")}
                                                    title="Tap to add; long-press or right-click to remove"
                                                >
                                                    Disadv {t.disadv}
                                                </LongPressBtn>
                                                <LongPressBtn
                                                    onClick={() => inc(a.id, "normal")}
                                                    onLongPress={() => dec(a.id, "normal")}
                                                    title="Tap to add; long-press or right-click to remove"
                                                >
                                                    Normal {t.normal}
                                                </LongPressBtn>
                                                <LongPressBtn
                                                    onClick={() => inc(a.id, "adv")}
                                                    onLongPress={() => dec(a.id, "adv")}
                                                    title="Tap to add; long-press or right-click to remove"
                                                >
                                                    Adv {t.adv}
                                                </LongPressBtn>
                                            </>
                                        ) : null}
                                        <button onClick={() => onEditAction(a.id)} className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-900">
                                            Edit
                                        </button>
                                    </div>
                                </div>

                                {/* Damage preview (verbose list, no grouping/totals) */}
                                {a.factorsJson.damage?.length > 0 && (
                                    <ul className="mt-3 text-sm text-slate-200 space-y-1">
                                        {a.factorsJson.damage.map((d, i) => (
                                            <li key={i}>
                                                <span className="font-medium">{formatDamageLineType(d.type)}</span>{" "}
                                                {formatDamageDetails(d)}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Modifiers */}
            <section className="mb-32">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold mb-2">Action Modifiers</h2>
                    <button onClick={onCreateModifier} className="text-sm px-3 py-1 rounded-xl border border-slate-700 hover:bg-slate-900">+ New</button>
                </div>

                <h3 className="text-sm text-slate-300 mb-1">Per Action</h3>
                <ul className="space-y-2 mb-4">
                    {perActionMods.map((m) => (
                        <li key={m.id} className="flex items-center justify-between border border-slate-700 rounded-xl p-2 bg-slate-900/40">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox" className="size-4 accent-slate-300"
                                    checked={!!selectedPerActionMods[m.id]}
                                    onChange={(e) => setSelectedPerActionMods(prev => ({ ...prev, [m.id]: e.target.checked }))}
                                />
                                <span className="text-sm">{m.name}</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">each attack</span>
                                <button onClick={() => onEditModifier(m.id)} className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-900">
                                    Edit
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>

                <h3 className="text-sm text-slate-300 mb-1">Per Turn</h3>
                <ul className="space-y-2">
                    {perTurnMods.map((m) => (
                        <li key={m.id} className="flex items-center justify-between border border-slate-700 rounded-xl p-2 bg-slate-900/40">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox" className="size-4 accent-slate-300"
                                    checked={!!selectedPerTurnMods[m.id]}
                                    onChange={(e) => setSelectedPerTurnMods(prev => ({ ...prev, [m.id]: e.target.checked }))}
                                />
                                <span className="text-sm">{m.name}</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">per turn</span>
                                <button onClick={() => onEditModifier(m.id)} className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-900">
                                    Edit
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

function buildActionSubtitle(a: ActionRecord): string {
    const th = a.factorsJson.toHit;
    const parts: string[] = [];
    if (th) {
        const stat = th.static ?? 0;
        const sign = th.signStatic ?? 1;
        const dice = th.dice?.map(d => `${d.count}d${d.size}`).join(" + ");
        const hitBits = [dice ? dice : null, stat ? `${sign > 0 ? "+" : "-"} ${Math.abs(stat)}` : null].filter(Boolean);
        if (hitBits.length) parts.push(`Attack: ${hitBits.join(" + ")}`);
    }
    const dmg = a.factorsJson.damage ?? [];
    for (const d of dmg) {
        const dice = d.dice?.map(x => `${x.count}d${x.size}`).join(" + ");
        const stat = d.static ?? 0;
        const sign = d.signStatic ?? 1;
        const bits = [dice ? dice : null, stat ? `${sign > 0 ? "+" : "-"} ${Math.abs(stat)}` : null].filter(Boolean);
        const type = formatDamageLineType(d.type);
        if (bits.length) parts.push(`${bits.join(" + ")} ${type}`);
    }
    return parts.join(" | ");
}

function formatDamageLineType(type: string | null) {
    return type === null ? "leave blank" : type;
}

function formatDamageDetails(d: NonNullable<ActionRecord["factorsJson"]["damage"]>[number]) {
    const dice = d.dice?.map(x => `${x.count}d${x.size}`).join(" + ");
    const stat = d.static ?? 0;
    const sign = d.signStatic ?? 1;
    const bits = [dice ? dice : null, stat ? `${sign > 0 ? "+" : "-"} ${Math.abs(stat)}` : null].filter(Boolean);
    return bits.length ? bits.join(" + ") : "—";
}
