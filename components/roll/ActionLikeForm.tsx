"use client";

import { useMemo, useState } from "react";
import type {
    Signed, DieSize,
    CharacterPreferences,
    ActionRecord, ActionModifierFactors, ActionFactors, ModifierRecord
} from "@/components/roll/types";
import DiceListEditor, { DiceEntry } from "./DiceListEditor";
import DamageTypeSelect from "./DamageTypeSelect";
import { actionCreateSchema, actionModifierCreateSchema } from "@/lib/validation/actionSchemas";

type Variant = "action" | "modifier";

type Props = {
    variant: Variant;
    characterId: string;
    preferences: CharacterPreferences;
    initialAction?: ActionRecord | null;     // for edit when variant="action"
    initialModifier?: ModifierRecord | null; // for edit when variant="modifier"
    onCancel: () => void;
    onSaved: () => void; // navigate back to ?mode=ready
};

const CORE_TYPES = [
    "slashing", "piercing", "bludgeoning", "fire", "cold", "acid",
    "lightning", "thunder", "psychic", "necrotic", "radiant", "force", "poison"
];

const MAX_DICE_ROWS = 10;
const MAX_DAMAGE_LINES = 10;

// --- Damage line unions (kept simple; runtime gates enforce differences) ---
type ActionDamageLine = {
    type: string | null; // null allowed for Actions ("leave blank")
    static?: number;
    signStatic?: Signed;
    dice?: DiceEntry[];
};

type ModifierDamageLine = {
    type: string | null; // null allowed ONLY when eachAttack=true
    source?: string;     // ≤18 chars; used when type is null
    static?: number;
    signStatic?: Signed;
    dice?: DiceEntry[];
};

type DLine = ActionDamageLine | ModifierDamageLine;

export default function ActionLikeForm({
    variant,
    characterId,
    preferences,
    initialAction,
    initialModifier,
    onCancel,
    onSaved,
}: Props) {
    const isAction = variant === "action";
    const initial = isAction ? initialAction ?? null : initialModifier ?? null;

    const damageOptions = useMemo(() => {
        const set = new Set<string>([...CORE_TYPES, ...(preferences.uniqueDamageTypes ?? [])]);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [preferences]);

    // Common fields
    const [name, setName] = useState(initial?.name ?? "");
    const [favorite, setFavorite] = useState<boolean>(initial?.favorite ?? false);
    const [wielding, setWielding] = useState<"weapon" | "unarmed" | "">((initial as any)?.factorsJson?.conditions?.wielding ?? "");
    const [distance, setDistance] = useState<"melee" | "ranged" | "">((initial as any)?.factorsJson?.conditions?.distance ?? "");
    const [spell, setSpell] = useState<boolean>((initial as any)?.factorsJson?.spell ?? (initial as any)?.factorsJson?.conditions?.spell ?? false);

    // Action-only: toHit
    const [toHitStatic, setToHitStatic] = useState<number>(isAction ? (initialAction?.factorsJson.toHit?.static ?? 0) : 0);
    const [toHitSign, setToHitSign] = useState<Signed>(isAction ? (initialAction?.factorsJson.toHit?.signStatic ?? 1 as Signed) : 1);
    const [toHitDice, setToHitDice] = useState<DiceEntry[]>(
        isAction
            ? (initialAction?.factorsJson.toHit?.dice
                ?? [{ count: 1, size: 20 as DieSize, signDice: 1, canCrit: true }])
            : []
    );

    // Modifier-only: eachAttack + attackImpact
    const [eachAttack, setEachAttack] = useState<boolean>(!isAction ? (initialModifier?.factorsJson.eachAttack ?? true) : true);
    const [impactStatic, setImpactStatic] = useState<number>(!isAction ? (initialModifier?.factorsJson.attackImpact?.static ?? 0) : 0);
    const [impactSign, setImpactSign] = useState<Signed>(!isAction ? (initialModifier?.factorsJson.attackImpact?.signStatic ?? 1 as Signed) : 1);
    const [impactDice, setImpactDice] = useState<DiceEntry[]>(
        !isAction
            ? (initialModifier?.factorsJson.attackImpact?.dice ?? []).map(x => ({ count: x.count, size: x.size, signDice: x.signDice }))
            : []
    );

    // Damage lines
    const initialDamage = (): DLine[] => {
        if (isAction) {
            return (initialAction?.factorsJson.damage ?? []).map(d => ({
                type: d.type ?? null,
                static: d.static ?? 0,
                signStatic: (d.signStatic ?? 1) as Signed,
                dice: (d.dice ?? []).map(x => ({ count: x.count, size: x.size, signDice: x.signDice })),
            }));
        } else {
            return (initialModifier?.factorsJson.damage ?? []).map(d => ({
                type: d.type ?? null,
                source: d.source ?? "",
                static: d.static ?? 0,
                signStatic: (d.signStatic ?? 1) as Signed,
                dice: (d.dice ?? []).map(x => ({ count: x.count, size: x.size, signDice: x.signDice })),
            }));
        }
    };
    const [damage, setDamage] = useState<DLine[]>(initialDamage());

    function addDamageLine() {
        if (damage.length >= MAX_DAMAGE_LINES) return;
        setDamage(d => [
            ...d,
            isAction
                ? ({ type: null, static: 0, signStatic: 1, dice: [] } as ActionDamageLine)
                : ({ type: eachAttack ? null : (damageOptions[0] ?? "slashing"), source: "", static: 0, signStatic: 1, dice: [] } as ModifierDamageLine),
        ]);
    }

    function updateDamage(idx: number, patch: Partial<DLine>) {
        setDamage(prev => {
            const copy = prev.slice();
            copy[idx] = { ...(copy[idx] as any), ...(patch as any) } as DLine;
            return copy;
        });
    }

    function removeDamage(idx: number) {
        setDamage(prev => prev.filter((_, i) => i !== idx));
    }

    // Detailed errors + per-field paths
    const [errors, setErrors] = useState<string[]>([]);
    const [errorPaths, setErrorPaths] = useState<Set<string>>(new Set());
    const disableAddDamage = damage.length >= MAX_DAMAGE_LINES;

    // Common per-field flags from errorPaths
    const nameHasErr = errorPaths.has("name");
    const toHitStaticErr = errorPaths.has("factorsJson.toHit.static");
    const impactStaticErr = errorPaths.has("factorsJson.attackImpact.static");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrors([]);
        setErrorPaths(new Set());

        try {
            if (isAction) {
                const factorsJson: ActionFactors = {
                    conditions: {
                        wielding: wielding || undefined,
                        distance: distance || undefined,
                        spell: !!spell || undefined,
                    },
                    toHit: {
                        static: toHitStatic || 0,
                        signStatic: toHitSign,
                        dice: toHitDice.map(d => ({ count: d.count, size: d.size, signDice: d.signDice, canCrit: d.canCrit })),
                    },
                    // Actions allow type: null (user-facing "Undefined" in sums later)
                    damage: (damage as ActionDamageLine[]).map((d) => ({
                        type: d.type,
                        static: d.static || 0,
                        signStatic: d.signStatic,
                        dice: (d.dice ?? []).map((x) => ({ count: x.count, size: x.size, signDice: x.signDice })),
                    })),
                    favorite,
                };

                const payload = { name, favorite, factorsJson };

                // preflight
                const pre = preflightIssuesForAction(payload, toHitDice, damage as ActionDamageLine[]);
                if (pre.messages.length) {
                    setErrors(pre.messages);
                    setErrorPaths(pre.paths);
                    console.warn("Action preflight failed", { payload, pre });
                    return;
                }

                const parsed = actionCreateSchema.safeParse(payload);
                if (!parsed.success) {
                    const zr = zodIssuesToUi(parsed.error.issues as any);
                    setErrors(zr.messages);
                    setErrorPaths(zr.paths);
                    console.error("Action validation failed", { payload, issues: parsed.error.issues });
                    return;
                }

                const method = initialAction ? "PATCH" : "POST";
                const url = initialAction ? `/api/actions/${initialAction.id}` : `/api/characters/${characterId}/actions`;

                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const srv = await readServerErrors(res);
                    setErrors(srv.messages.length ? srv.messages : [`Save failed (${res.status}).`]);
                    if (srv.paths.size) setErrorPaths(srv.paths);
                    console.error("Action save failed", { payload, server: srv });
                    return;
                }
            } else {
                const factorsJson: ActionModifierFactors = {
                    eachAttack,
                    conditions: {
                        wielding: wielding || undefined,
                        distance: distance || undefined,
                        spell: !!spell || undefined,
                    },
                    attackImpact: {
                        static: impactStatic || 0,
                        signStatic: impactSign,
                        dice: impactDice.map(d => ({ count: d.count, size: d.size, signDice: d.signDice })),
                    },
                    damage: (damage as ModifierDamageLine[]).map((d) => ({
                        type: d.type, // may be null ONLY when eachAttack=true
                        source: d.source ? String(d.source).slice(0, 18) : undefined,
                        static: d.static || 0,
                        signStatic: d.signStatic,
                        dice: (d.dice ?? []).map((x) => ({ count: x.count, size: x.size, signDice: x.signDice })),
                    })),
                    favorite,
                };

                const payload = { name, favorite, factorsJson };

                const pre = preflightIssuesForModifier(payload, eachAttack, impactDice, damage as ModifierDamageLine[]);
                if (pre.messages.length) {
                    setErrors(pre.messages);
                    setErrorPaths(pre.paths);
                    console.warn("Modifier preflight failed", { payload, pre });
                    return;
                }

                const parsed = actionModifierCreateSchema.safeParse(payload);
                if (!parsed.success) {
                    const zr = zodIssuesToUi(parsed.error.issues as any);
                    setErrors(zr.messages);
                    setErrorPaths(zr.paths);
                    console.error("Modifier validation failed", { payload, issues: parsed.error.issues });
                    return;
                }

                const method = initialModifier ? "PATCH" : "POST";
                const url = initialModifier ? `/api/action-modifiers/${initialModifier.id}` : `/api/characters/${characterId}/action-modifiers`;

                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const srv = await readServerErrors(res);
                    setErrors(srv.messages.length ? srv.messages : [`Save failed (${res.status}).`]);
                    if (srv.paths.size) setErrorPaths(srv.paths);
                    console.error("Modifier save failed", { payload, server: srv });
                    return;
                }
            }
            onSaved();
        } catch (err: any) {
            const msg = err?.message ?? "Unexpected error.";
            setErrors([msg]);
            console.error("Submit crashed", err);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label className="text-sm">Name</label>
                <input
                    className={`mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border ${nameHasErr ? "border-red-500" : "border-slate-700"}`}
                    value={name}
                    maxLength={25}
                    onChange={e => setName(e.target.value)}
                    required
                    aria-invalid={nameHasErr}
                />
                <div className="mt-2 flex items-center gap-2">
                    <input id="fav" type="checkbox" className="size-4 accent-slate-300" checked={favorite} onChange={e => setFavorite(e.target.checked)} />
                    <label htmlFor="fav" className="text-sm">Favorite (preselect in Ready)</label>
                </div>
            </div>

            {/* Conditions */}
            <fieldset className="border border-slate-700 rounded-xl p-3">
                <legend className="px-2 text-sm text-slate-300">Conditions</legend>
                <div className="grid grid-cols-3 gap-2">
                    <select className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700" value={wielding} onChange={e => setWielding((e.target.value as any) || "")}>
                        <option value="">— wielding —</option>
                        <option value="weapon">weapon</option>
                        <option value="unarmed">unarmed</option>
                    </select>
                    <select className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700" value={distance} onChange={e => setDistance((e.target.value as any) || "")}>
                        <option value="">— distance —</option>
                        <option value="melee">melee</option>
                        <option value="ranged">ranged</option>
                    </select>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" className="size-4 accent-slate-300" checked={!!spell} onChange={e => setSpell(e.target.checked)} />
                        <span className="text-sm">spell</span>
                    </label>
                </div>
            </fieldset>

            {/* Action-only: toHit */}
            {isAction && (
                <fieldset className="border border-slate-700 rounded-xl p-3 space-y-3">
                    <legend className="px-2 text-sm text-slate-300">To-Hit</legend>
                    <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3 flex rounded-xl overflow-hidden border border-slate-700">
                            <button type="button" className={`px-2 py-1 text-sm ${toHitSign !== -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => setToHitSign(1)}>+</button>
                            <button type="button" className={`px-2 py-1 text-sm border-l border-slate-700 ${toHitSign === -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => setToHitSign(-1)}>−</button>
                        </div>
                        <input
                            type="number"
                            className={`col-span-9 px-2 py-1 rounded-lg bg-slate-900 border ${toHitStaticErr ? "border-red-500" : "border-slate-700"}`}
                            value={toHitStatic}
                            onChange={e => setToHitStatic(parseInt(e.target.value || "0", 10))}
                            aria-invalid={toHitStaticErr}
                        />
                    </div>

                    <DiceListEditor
                        label="To-hit dice"
                        value={toHitDice}
                        onChange={(v) => setToHitDice(v.slice(0, MAX_DICE_ROWS))}
                        allowCanCrit={true}
                        canCritEnabledGlobal={preferences.critRules !== null}
                        maxRows={MAX_DICE_ROWS}
                        errorPaths={errorPaths}
                        pathPrefix="factorsJson.toHit.dice"
                    />
                </fieldset>
            )}

            {/* Modifier-only: eachAttack + attackImpact */}
            {!isAction && (
                <>
                    <div className="flex items-center gap-3">
                        <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" className="size-4 accent-slate-300" checked={eachAttack} onChange={e => setEachAttack(e.target.checked)} />
                            Per Action (unchecked = Per Turn)
                        </label>
                    </div>

                    <fieldset className="border border-slate-700 rounded-xl p-3 space-y-3">
                        <legend className="px-2 text-sm text-slate-300">Attack Impact (to-hit)</legend>
                        <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3 flex rounded-xl overflow-hidden border border-slate-700">
                                <button type="button" className={`px-2 py-1 text-sm ${impactSign !== -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => setImpactSign(1)}>+</button>
                                <button type="button" className={`px-2 py-1 text-sm border-l border-slate-700 ${impactSign === -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => setImpactSign(-1)}>−</button>
                            </div>
                            <input
                                type="number"
                                className={`col-span-9 px-2 py-1 rounded-lg bg-slate-900 border ${impactStaticErr ? "border-red-500" : "border-slate-700"}`}
                                value={impactStatic}
                                onChange={e => setImpactStatic(parseInt(e.target.value || "0", 10))}
                                aria-invalid={impactStaticErr}
                            />
                        </div>

                        <DiceListEditor
                            label="To-hit impact dice"
                            value={impactDice}
                            onChange={(v) => setImpactDice(v.slice(0, MAX_DICE_ROWS))}
                            allowCanCrit={false}
                            maxRows={MAX_DICE_ROWS}
                            errorPaths={errorPaths}
                            pathPrefix="factorsJson.attackImpact.dice"
                        />
                    </fieldset>
                </>
            )}

            {/* Damage (both variants) */}
            <fieldset className="border border-slate-700 rounded-xl p-3 space-y-3">
                <legend className="px-2 text-sm text-slate-300">Damage</legend>

                {damage.map((line, i) => {
                    const typeErr = errorPaths.has(`factorsJson.damage.${i}.type`);
                    const staticErr = errorPaths.has(`factorsJson.damage.${i}.static`);
                    return (
                        <div key={i} className="border border-slate-700 rounded-xl p-3 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                <DamageTypeSelect
                                    value={line.type}
                                    onChange={(v) => updateDamage(i, { type: v })}
                                    options={damageOptions}
                                    allowNull={true}
                                    nullLabel={isAction ? "leave blank" : "None (base)"}
                                    helperWhenNullText={isAction ? undefined : (eachAttack ? "Inherits the first damage type chosen for this action." : undefined)}
                                    hasError={typeErr}
                                />
                                <div className="flex rounded-xl overflow-hidden border border-slate-700">
                                    <button type="button" className={`px-2 py-1 text-sm ${line.signStatic !== -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => updateDamage(i, { signStatic: 1 })}>+</button>
                                    <button type="button" className={`px-2 py-1 text-sm border-l border-slate-700 ${line.signStatic === -1 ? "bg-slate-800" : "bg-slate-900 text-slate-400"}`} onClick={() => updateDamage(i, { signStatic: -1 })}>−</button>
                                </div>
                                <input
                                    type="number"
                                    className={`px-2 py-1 rounded-lg bg-slate-900 border ${staticErr ? "border-red-500" : "border-slate-700"}`}
                                    value={(line as any).static ?? 0}
                                    onChange={(e) => updateDamage(i, { static: parseInt(e.target.value || "0", 10) })}
                                    aria-invalid={staticErr}
                                />
                            </div>

                            {/* source (modifier only) */}
                            {variant === "modifier" && (
                                <input
                                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700"
                                    placeholder="Source (optional, ≤18 chars)"
                                    maxLength={18}
                                    value={(line as ModifierDamageLine).source ?? ""}
                                    onChange={(e) => updateDamage(i, { source: e.target.value })}
                                />
                            )}

                            <DiceListEditor
                                label="Damage dice"
                                value={(line as any).dice ?? []}
                                onChange={(v) => updateDamage(i, { dice: v.slice(0, MAX_DICE_ROWS) })}
                                allowCanCrit={false}
                                maxRows={MAX_DICE_ROWS}
                                errorPaths={errorPaths}
                                pathPrefix={`factorsJson.damage.${i}.dice`}
                            />

                            <div className="flex justify-end">
                                <button type="button" onClick={() => removeDamage(i)} className="text-sm text-red-300 hover:text-red-200">Remove damage line</button>
                            </div>
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={addDamageLine}
                    className={`text-sm px-3 py-1 rounded-xl border ${disableAddDamage ? "opacity-50 cursor-not-allowed border-slate-700" : "border-slate-700 hover:bg-slate-900"}`}
                    title={disableAddDamage ? "Maximum damage sources reached!" : "Add damage line"}
                    disabled={disableAddDamage}
                >
                    + Add damage line
                </button>
            </fieldset>

            {/* Error panel */}
            {errors.length > 0 && (
                <div className="rounded-xl border border-red-500/50 bg-red-950/40 p-3">
                    <p className="text-sm font-semibold text-red-200 mb-1">Please fix the following:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-red-200">
                        {errors.map((msg, idx) => <li key={idx}>{msg}</li>)}
                    </ul>
                </div>
            )}

            <div className="pt-2 flex gap-2">
                <button
                    type="submit"
                    className="rounded-2xl px-4 py-2 font-semibold bg-slate-200 text-slate-900 hover:bg-white"
                >
                    {initial ? "Save" : isAction ? "Create Action" : "Create Modifier"}
                </button>
                <button
                    type="button"
                    className="rounded-2xl px-4 py-2 font-semibold border border-slate-700 hover:bg-slate-900"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

/* ---------- helpers: zod + server error → UI messages + path set ---------- */

function zodIssuesToUi(
    issues: ReadonlyArray<{ path?: ReadonlyArray<PropertyKey>; message?: unknown }>
): { messages: string[]; paths: Set<string> } {
    const messages: string[] = [];
    const paths = new Set<string>();
    for (const i of issues ?? []) {
        const pathArr = Array.isArray(i?.path) ? [...i.path] : [];
        const pathStr = pathArr.length ? pathArr.map(seg => String(seg)).join(".") : "(form)";
        const msg = typeof i?.message === "string" ? i.message : "Invalid";
        messages.push(`${pathStr}: ${msg}`);
        if (pathStr !== "(form)") paths.add(pathStr);
    }
    return { messages, paths };
}

async function readServerErrors(
    res: Response
): Promise<{ messages: string[]; paths: Set<string> }> {
    const messages: string[] = [];
    const paths = new Set<string>();
    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
        try {
            const j = await res.json();

            if (Array.isArray(j?.issues)) {
                for (const it of j.issues as ReadonlyArray<{
                    path?: ReadonlyArray<PropertyKey>;
                    message?: unknown;
                }>) {
                    const pArr = Array.isArray(it?.path) ? [...it.path] : [];
                    const p = pArr.length ? pArr.map(seg => String(seg)).join(".") : "(server)";
                    const m = typeof it?.message === "string" ? it.message : "Invalid";
                    messages.push(`${p}: ${m}`);
                    if (p && p !== "(server)") paths.add(p);
                }
                return { messages, paths };
            }

            if (typeof j?.error === "string") messages.push(j.error);
            if (typeof j?.message === "string") messages.push(j.message);
            return { messages, paths };
        } catch { /* fall through */ }
    }

    try {
        const t = await res.text();
        if (t) messages.push(t);
    } catch { }
    return { messages, paths };
}

/* ---------- helpers: preflight checks with precise paths ---------- */

function preflightIssuesForAction(
    payload: { name: string; favorite: boolean; factorsJson: ActionFactors },
    toHitDice: DiceEntry[],
    damage: ActionDamageLine[],
): { messages: string[]; paths: Set<string> } {
    const messages: string[] = [];
    const paths = new Set<string>();
    if (!payload.name?.trim()) { messages.push("name: required"); paths.add("name"); }
    if (payload.name.length > 25) { messages.push("name: must be ≤ 25 characters"); paths.add("name"); }

    if (toHitDice.length > MAX_DICE_ROWS) { messages.push(`factorsJson.toHit.dice: maximum ${MAX_DICE_ROWS} entries`); paths.add("factorsJson.toHit.dice"); }
    if (damage.length > MAX_DAMAGE_LINES) { messages.push(`factorsJson.damage: maximum ${MAX_DAMAGE_LINES} lines`); paths.add("factorsJson.damage"); }

    // canCrit only allowed on d20 (UI enforces, but guard anyway)
    toHitDice.forEach((d, idx) => {
        if (d.canCrit && d.size !== 20) {
            messages.push(`factorsJson.toHit.dice.${idx}.canCrit: only allowed for d20`);
            paths.add(`factorsJson.toHit.dice.${idx}.canCrit`);
        }
        if (!Number.isFinite(d.count) || d.count < 1) {
            messages.push(`factorsJson.toHit.dice.${idx}.count: must be ≥ 1`);
            paths.add(`factorsJson.toHit.dice.${idx}.count`);
        }
    });

    return { messages, paths };
}

function preflightIssuesForModifier(
    payload: { name: string; favorite: boolean; factorsJson: ActionModifierFactors },
    eachAttack: boolean,
    impactDice: DiceEntry[],
    damage: ModifierDamageLine[],
): { messages: string[]; paths: Set<string> } {
    const messages: string[] = [];
    const paths = new Set<string>();
    if (!payload.name?.trim()) { messages.push("name: required"); paths.add("name"); }
    if (payload.name.length > 25) { messages.push("name: must be ≤ 25 characters"); paths.add("name"); }

    if (impactDice.length > MAX_DICE_ROWS) { messages.push(`factorsJson.attackImpact.dice: maximum ${MAX_DICE_ROWS} entries`); paths.add("factorsJson.attackImpact.dice"); }
    if (damage.length > MAX_DAMAGE_LINES) { messages.push(`factorsJson.damage: maximum ${MAX_DAMAGE_LINES} lines`); paths.add("factorsJson.damage"); }

    // "None (base)" (type:null) only allowed when Per Action
    if (!eachAttack) {
        damage.forEach((d, i) => {
            if (d.type === null) {
                messages.push(`factorsJson.damage.${i}.type: cannot be "None (base)" for Per Turn; pick a type`);
                paths.add(`factorsJson.damage.${i}.type`);
            }
        });
    }

    impactDice.forEach((d, idx) => {
        if (!Number.isFinite(d.count) || d.count < 1) {
            messages.push(`factorsJson.attackImpact.dice.${idx}.count: must be ≥ 1`);
            paths.add(`factorsJson.attackImpact.dice.${idx}.count`);
        }
    });

    return { messages, paths };
}
