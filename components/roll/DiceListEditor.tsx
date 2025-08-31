"use client";

import { useId } from "react";
import type { DieSize, Signed } from "@/components/roll/types";

export type DiceEntry = {
    count: number;
    size: DieSize;
    signDice?: Signed; // +1 | -1
    canCrit?: boolean; // only meaningful for Action.toHit dice (d20) when critRules != null
};

type Props = {
    label?: string;
    value: DiceEntry[];
    onChange: (next: DiceEntry[]) => void;
    allowCanCrit?: boolean;          // Action.toHit only
    canCritEnabledGlobal?: boolean;  // prefs.critRules !== null
    maxRows?: number;                // default 10

    /** Error highlighting */
    errorPaths?: Set<string>;
    /** Dot-path where this dice list lives, e.g. "factorsJson.toHit.dice" */
    pathPrefix?: string;
};

const DIE_SIZES: DieSize[] = [4, 6, 8, 10, 12, 20, 100];
const MAX = 10;

export default function DiceListEditor({
    label = "Dice",
    value,
    onChange,
    allowCanCrit = false,
    canCritEnabledGlobal = true,
    maxRows = MAX,
    errorPaths,
    pathPrefix,
}: Props) {
    const id = useId();

    function pth(idx: number, leaf: string) {
        return pathPrefix ? `${pathPrefix}.${idx}.${leaf}` : undefined;
    }
    function hasErr(idx: number, leaf: string) {
        const p = pth(idx, leaf);
        return !!(p && errorPaths?.has(p));
    }

    function update(idx: number, patch: Partial<DiceEntry>) {
        const copy = value.slice();
        copy[idx] = { ...copy[idx], ...patch };
        onChange(copy);
    }
    function remove(idx: number) {
        const copy = value.slice();
        copy.splice(idx, 1);
        onChange(copy);
    }
    function add() {
        if (value.length >= maxRows) return;
        onChange([...value, { count: 1, size: 4, signDice: 1 }]);
    }

    const disableAdd = value.length >= maxRows;

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium">{label}</div>
            <div className="space-y-2">
                {value.map((d, i) => {
                    const canShowCrit = allowCanCrit && canCritEnabledGlobal && d.size === 20;
                    return (
                        <div key={`${id}-${i}`} className="grid grid-cols-12 gap-2 items-center">
                            {/* + / - (signDice) */}
                            <div className="col-span-3 flex rounded-xl overflow-hidden border border-slate-700">
                                <button
                                    type="button"
                                    className={`px-2 py-1 text-sm ${d.signDice !== -1 ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-400"}`}
                                    onClick={() => update(i, { signDice: 1 })}
                                    aria-pressed={d.signDice !== -1}
                                >
                                    +
                                </button>
                                <button
                                    type="button"
                                    className={`px-2 py-1 text-sm border-l border-slate-700 ${d.signDice === -1 ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-400"}`}
                                    onClick={() => update(i, { signDice: -1 })}
                                    aria-pressed={d.signDice === -1}
                                >
                                    −
                                </button>
                            </div>

                            {/* count */}
                            <input
                                type="number"
                                min={1}
                                className={`col-span-3 px-2 py-1 rounded-lg bg-slate-900 border ${hasErr(i, "count") ? "border-red-500" : "border-slate-700"}`}
                                value={d.count}
                                onChange={(e) => update(i, { count: clampInt(e.target.value, 1, 99) })}
                                aria-invalid={hasErr(i, "count")}
                            />

                            {/* size */}
                            <select
                                className={`col-span-4 px-2 py-1 rounded-lg bg-slate-900 border ${hasErr(i, "size") ? "border-red-500" : "border-slate-700"}`}
                                value={d.size}
                                onChange={(e) => update(i, { size: Number(e.target.value) as DieSize })}
                                aria-invalid={hasErr(i, "size")}
                            >
                                {DIE_SIZES.map(s => <option key={s} value={s}>d{s}</option>)}
                            </select>

                            {/* canCrit */}
                            {allowCanCrit ? (
                                <label className="col-span-1 flex justify-center">
                                    <input
                                        type="checkbox"
                                        className={`size-4 ${hasErr(i, "canCrit") ? "outline-1 outline-red-500" : "accent-slate-300"}`}
                                        disabled={!canShowCrit}
                                        checked={!!d.canCrit && canShowCrit}
                                        onChange={(e) => update(i, { canCrit: e.target.checked })}
                                        title={canShowCrit ? "This die can count toward crit detection" : "Only d20 can crit (and only if Crit Rules enabled)"}
                                        aria-invalid={hasErr(i, "canCrit")}
                                    />
                                </label>
                            ) : null}

                            {/* remove */}
                            <div className="col-span-1 flex justify-end">
                                <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-slate-200">
                                    ✕
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={add}
                className={`text-sm px-3 py-1 rounded-xl border ${disableAdd ? "opacity-50 cursor-not-allowed border-slate-700" : "border-slate-700 hover:bg-slate-900"}`}
                title={disableAdd ? "Maximum dice reached!" : "Add die"}
                disabled={disableAdd}
            >
                + Add die
            </button>
        </div>
    );
}

function clampInt(v: string, min: number, max: number) {
    const n = Math.max(min, Math.min(max, parseInt(v || "0", 10) || min));
    return n;
}
