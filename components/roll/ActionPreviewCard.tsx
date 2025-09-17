// components/roll/ActionPreviewCard.tsx
"use client";

import { useRef } from "react";
import type { ActionRecord, ModifierRecord } from "./types";

/**
 * Compact, dark action preview card with three vertical tallies on the right:
 * Disadv, Normal, Adv. Tallies can be interactive or read-only.
 */
type Props = {
    action: ActionRecord;
    counts: { normal: number; adv: number; disadv: number };
    perActionModifiers: ModifierRecord[];
    perTurnModifiers: ModifierRecord[];
    interactive?: boolean; // when false, show tallies but disable interaction
    onInc?: (kind: "normal" | "adv" | "disadv") => void;
    onDec?: (kind: "normal" | "adv" | "disadv") => void;
};

export default function ActionPreviewCard({
    action,
    counts,
    perActionModifiers,
    perTurnModifiers,
    interactive = true,
    onInc,
    onDec,
}: Props) {
    const f = action.factorsJson as any;

    const toHit = f?.toHit ?? null;
    const dmgArr: any[] = Array.isArray(f?.damage) ? f.damage : [];
    const conditions = f?.conditions ?? null;

    const perActionNames = perActionModifiers.map((m) => m.name);
    const perTurnNames = perTurnModifiers.map((m) => m.name);
    const showModifiers = perActionNames.length > 0 || perTurnNames.length > 0;

    const chips = friendlyConditions(conditions);

    return (
        <div className="card w-full max-w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 p-3 sm:p-4">
            <div className="flex items-stretch justify-between gap-4">
                {/* LEFT: Name → Conditions → Hit → Damage */}
                <div className="min-w-0 flex-1 space-y-2">
                    {/* Name */}
                    <header className="flex items-center gap-2">
                        {action.favorite ? <span aria-hidden>★</span> : null}
                        <h3 className="truncate text-sm sm:text-base font-semibold leading-6" title={action.name}>
                            {action.name}
                        </h3>
                    </header>

                    {/* Conditions (chips) */}
                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {chips.map((c) => (
                                <span
                                    key={c}
                                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-200"
                                >
                                    {c}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Hit */}
                    <section>
                        <h4 className="mb-0.5 text-xs font-medium text-neutral-300">Hit</h4>
                        {toHit ? (
                            <p className="text-sm">{summarizeToHit(toHit)}</p>
                        ) : (
                            <p className="text-sm text-neutral-400">No hit roll.</p>
                        )}
                    </section>

                    {/* Damage */}
                    <section>
                        <h4 className="mb-0.5 text-xs font-medium text-neutral-300">Damage</h4>
                        {dmgArr.length ? (
                            <ul className="text-sm space-y-0.5">
                                {dmgArr.map((d, idx) => (
                                    <li key={idx}>{summarizeDamage(d)}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-neutral-400">No damage components.</p>
                        )}
                    </section>

                    {/* Modifiers (hidden when none) */}
                    {showModifiers && (
                        <section className="text-sm">
                            <div className="mb-0.5 text-xs font-medium text-neutral-300">Modifiers</div>
                            <div className="flex flex-wrap gap-2">
                                {perActionNames.length > 0 && <Tag label="Per Action" items={perActionNames} />}
                                {perTurnNames.length > 0 && <Tag label="Per Turn" items={perTurnNames} />}
                            </div>
                        </section>
                    )}
                </div>

                {/* RIGHT: Vertical tallies (Disadv, Normal, Adv) */}
                <div className={`flex flex-col items-stretch gap-2 ${interactive ? "" : "opacity-60 cursor-not-allowed"}`}>
                    <TallyButton
                        label="Disadv"
                        count={counts.disadv ?? 0}
                        onInc={interactive ? () => onInc?.("disadv") : undefined}
                        onDec={interactive ? () => onDec?.("disadv") : undefined}
                        disabled={!interactive}
                    />
                    <TallyButton
                        label="Normal"
                        count={counts.normal ?? 0}
                        onInc={interactive ? () => onInc?.("normal") : undefined}
                        onDec={interactive ? () => onDec?.("normal") : undefined}
                        disabled={!interactive}
                    />
                    <TallyButton
                        label="Adv"
                        count={counts.adv ?? 0}
                        onInc={interactive ? () => onInc?.("adv") : undefined}
                        onDec={interactive ? () => onDec?.("adv") : undefined}
                        disabled={!interactive}
                    />
                </div>
            </div>
        </div>
    );
}

/** Tally button: click/tap increments; right-click/long-press (400ms) decrements. */
function TallyButton({
    label,
    count,
    onInc,
    onDec,
    disabled = false,
}: {
    label: string;
    count: number;
    onInc?: () => void;
    onDec?: () => void;
    disabled?: boolean;
}) {
    const longPressFired = useRef(false);
    const tRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (tRef.current != null) {
            window.clearTimeout(tRef.current);
            tRef.current = null;
        }
    };

    const handleInc = () => {
        if (disabled) return;
        if (longPressFired.current) {
            longPressFired.current = false;
            return;
        }
        onInc?.();
    };

    const handleContext = (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        onDec?.();
    };

    const onTouchStart = () => {
        if (disabled) return;
        clearTimer();
        longPressFired.current = false;
        tRef.current = window.setTimeout(() => {
            longPressFired.current = true;
            onDec?.();
        }, 400); // 400ms long-press
    };

    const onTouchEnd = () => {
        clearTimer();
    };

    const active = count > 0;
    const wrap = "w-24 sm:w-28 select-none rounded-md border text-left px-2 py-2 text-sm transition";
    const bg = active ? "border-indigo-700/50 bg-indigo-500/10" : "border-neutral-700 bg-neutral-800";

    return (
        <button
            type="button"
            onClick={disabled ? undefined : handleInc}
            onContextMenu={disabled ? undefined : handleContext}
            onTouchStart={disabled ? undefined : onTouchStart}
            onTouchEnd={disabled ? undefined : onTouchEnd}
            onTouchCancel={clearTimer}
            className={`btn btn-secondary ${wrap} ${bg} ${disabled ? "pointer-events-none" : ""}`}
            aria-pressed={active}
            aria-disabled={disabled}
        >
            <div className="flex items-center justify-between">
                <span className="text-neutral-200">{label}</span>
                <span
                    className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-semibold ${active ? "bg-indigo-600 text-white" : "bg-neutral-700 text-neutral-200"
                        }`}
                    aria-label={`${label} tally`}
                >
                    {count}
                </span>
            </div>
        </button>
    );
}

/** Chip group for a labeled list. */
function Tag({ label, items }: { label: string; items: string[] }) {
    return (
        <span className="inline-flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs">
            <span className="text-neutral-300">{label}:</span>
            <span className="flex flex-wrap gap-1">
                {items.map((n) => (
                    <span key={n} className="rounded bg-neutral-900 px-1.5 py-0.5 border border-neutral-700">
                        {n}
                    </span>
                ))}
            </span>
        </span>
    );
}

/** Summary for to-hit formula (dice first). */
function summarizeToHit(toHit: any): string {
    const dice: any[] = Array.isArray(toHit?.dice) ? toHit.dice : [];
    const diceParts = dice.map((d) => diceWithSign(d?.signDice, d?.count, d?.size));
    const s = nWithSign(toHit?.signStatic, toHit?.static);
    return joinDiceFirst(diceParts, s);
}

/** Summary for a single damage component (dice first). */
function summarizeDamage(d: any): string {
    const type = d?.type ? ` ${String(d.type)}` : "";
    const dice: any[] = Array.isArray(d?.dice) ? d.dice : [];
    const diceParts = dice.map((x) => diceWithSign(x?.signDice, x?.count, x?.size));
    const s = nWithSign(d?.signStatic, d?.static);

    if (diceParts.length === 0 && !s) {
        return `—${type.trim() || "damage"}`;
    }
    return `${joinDiceFirst(diceParts, s)}${type}`;
}

function nWithSign(sign: any, n: any): string | null {
    const v = Number(n ?? 0);
    if (!v) return null;
    const s = sign === -1 ? "-" : "+";
    return `${s}${Math.abs(v)}`;
}

function diceWithSign(sign: any, count: any, size: any): string {
    const c = Math.max(1, Number(count ?? 1));
    const sz = Math.max(1, Number(size ?? 20));
    const s = sign === -1 ? "-" : "+";
    return `${s}${c}d${sz}`;
}

/** Join parts with first token shown without a leading '+' (e.g., "1d20 + 6"). */
function joinDiceFirst(diceParts: string[], staticPart: string | null): string {
    const parts = [...diceParts];
    if (staticPart) parts.push(staticPart);
    return joinSigned(parts);
}

/** Convert ["+1d20","+6","-1d4"] into "1d20 + 6 - 1d4". */
function joinSigned(parts: string[]): string {
    if (!parts.length) return "";
    const tokens = parts.map((p) => ({
        sign: p.startsWith("-") ? "-" : "+",
        value: p.replace(/^[+-]/, ""),
    }));
    let out = (tokens[0].sign === "-" ? "-" : "") + tokens[0].value;
    for (let i = 1; i < tokens.length; i++) {
        out += ` ${tokens[i].sign === "-" ? "-" : "+"} ${tokens[i].value}`;
    }
    return out;
}

/** Produces friendly chips like "Ranged Weapon", "Melee Spell" based on simple heuristics. */
function friendlyConditions(raw: any): string[] {
    if (!raw || typeof raw !== "object") return [];
    const distance = String(raw.distance ?? "").toLowerCase();
    const wielding = String(raw.wielding ?? "").toLowerCase();
    const chips: string[] = [];

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    if (distance && wielding) {
        chips.push(`${cap(distance)} ${cap(wielding)}`); // e.g., "Ranged Weapon"
    } else if (distance) {
        chips.push(cap(distance));
    } else if (wielding) {
        chips.push(cap(wielding));
    }

    Object.entries(raw).forEach(([k, v]) => {
        if (k === "distance" || k === "wielding") return;
        if (typeof v === "boolean" && v) chips.push(cap(k));
    });

    return Array.from(new Set(chips));
}
