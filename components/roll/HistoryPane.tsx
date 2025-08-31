"use client";

import { useMemo, useState } from "react";
import type { HistoryGroup, ActionRow, PerTurnRow } from "@/components/roll/types";
import { recomputeTotals } from "@/lib/roll/engine";

type Props = {
    groups: HistoryGroup[];
    onToggleRowSelected: (groupId: string, rowIndex: number) => void;
    onClearHistory?: () => void;
};

export default function HistoryPane({ groups, onToggleRowSelected, onClearHistory }: Props) {
    const newestId = groups[0]?.id;

    return (
        <section className="flex flex-col gap-4">
            <header className="px-1">
                <h2 className="text-xl font-bold">Roll History</h2>
            </header>

            {groups.length === 0 && (
                <p className="text-sm text-slate-400 px-1">No history yet — ready when you are.</p>
            )}

            {groups.map((g) => (
                <GroupCard
                    key={g.id}
                    group={g}
                    isNewest={g.id === newestId}
                    onToggleRow={(i) => onToggleRowSelected(g.id, i)}
                />
            ))}

            {groups.length > 0 && (
                <div className="pt-2">
                    <button
                        type="button"
                        className="text-sm text-slate-300/80 hover:text-white underline"
                        onClick={onClearHistory}
                    >
                        Clear history
                    </button>
                </div>
            )}
        </section>
    );
}

function GroupCard({
    group,
    isNewest,
    onToggleRow,
}: {
    group: HistoryGroup;
    isNewest: boolean;
    onToggleRow: (rowIndex: number) => void;
}) {
    // expand state per row (UI-only)
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const totals = useMemo(() => recomputeTotals(group.rows), [group.rows]);
    const ts = formatClock(group.timestamp);

    return (
        <section className="attackSet activeSection rounded-2xl border border-slate-700/70 p-3 bg-slate-900/50">
            {/* rows */}
            {group.rows.map((row, idx) =>
                row.kind === "action" ? (
                    <ActionRowView
                        key={idx}
                        row={row}
                        expanded={!!expanded[idx]}
                        toggleExpanded={() => setExpanded((m) => ({ ...m, [idx]: !m[idx] }))}
                        toggleSelected={() => onToggleRow(idx)}
                    />
                ) : (
                    <PerTurnRowView
                        key={idx}
                        row={row}
                        expanded={!!expanded[idx]}
                        toggleExpanded={() => setExpanded((m) => ({ ...m, [idx]: !m[idx] }))}
                        toggleSelected={() => onToggleRow(idx)}
                    />
                )
            )}

            {/* footer totals */}
            <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xs text-slate-400">
                    {ts} {isNewest && <span className="ml-1">- newest</span>}
                </p>
                <div className="damage-total-area font-black text-sm">
                    <p>{totals.sum} DAMAGE TOTAL</p>
                    {totals.byType.map((t) => (
                        <li key={t.type} className="list-none">
                            {" "}{t.amount} {t.type}
                        </li>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ActionRowView({
    row,
    expanded,
    toggleExpanded,
    toggleSelected,
}: {
    row: ActionRow;
    expanded: boolean;
    toggleExpanded: () => void;
    toggleSelected: () => void;
}) {
    const advLabel = row.mode === "adv" ? "Advantage" : row.mode === "disadv" ? "Disadvantage" : "";
    const critBadge = row.crit ? <span className="ml-2 rounded bg-amber-200 text-amber-950 px-1 py-[1px] text-[10px] font-bold">CRIT</span> : null;

    return (
        <section className="attackSet-attack activeSection border-b border-slate-700/50 last:border-b-0 py-2">
            <div className="attackSet-top flex items-start justify-between gap-3">
                <div className="attack-result select-none">{row.toHitTotal === 0 ? "+" : row.toHitTotal}</div>

                <div className="space-between-horizontal attack-card grow">
                    <div>
                        <h2 className="font-semibold">{row.name}</h2>
                        <p className="text-xs mt-0.5">
                            {advLabel}{critBadge}
                            {/* to-hit detail under the label, always visible */}
                            <ul className="list-none p-0 m-0 text-slate-300">
                                <li className="text-[11px]">{row.toHitDetail}</li>
                            </ul>
                        </p>
                    </div>

                    {/* damage chips (collapsed view) */}
                    <ul className="list-none pl-4 mt-[3px]" style={{ paddingLeft: 15 }}>
                        {row.damage.map((d, i) => (
                            <li key={i} style={{ width: 115 }}>
                                <span
                                    className="damage-result oneActiveAttack"
                                    title={d.detail}
                                >
                                    <span>{d.total}</span>{" "}
                                    {d.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* expanded breakdown (right-click / long-press triggers in parent; here just click) */}
            {expanded && (
                <div className="card-bottom">
                    <ul className="damage-breakdown pl-[45px] mt-[3px]">
                        {row.damage.map((d, i) => (
                            <li key={i}>
                                <span className="damage-result">
                                    <span className="bold"> {d.total} {d.label} |</span> {d.detail}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-2 flex items-center gap-3 pl-[45px]">
                <label className="text-xs flex items-center gap-2 select-none">
                    <input
                        type="checkbox"
                        className="size-4 accent-slate-200"
                        checked={row.selected}
                        onChange={toggleSelected}
                    />
                    include in total
                </label>
                <button
                    type="button"
                    className="text-[11px] text-slate-300/80 underline hover:text-white"
                    onClick={toggleExpanded}
                >
                    {expanded ? "hide details" : "show details"}
                </button>
            </div>
        </section>
    );
}

function PerTurnRowView({
    row,
    expanded,
    toggleExpanded,
    toggleSelected,
}: {
    row: PerTurnRow;
    expanded: boolean;
    toggleExpanded: () => void;
    toggleSelected: () => void;
}) {
    return (
        <section className="attackSet-attack activeSection border-b border-slate-700/50 last:border-b-0 py-2">
            <div className="attackSet-top flex items-start justify-between gap-3">
                <div className="attack-result select-none">+</div>

                <div className="space-between-horizontal attack-card grow">
                    <div>
                        <h2 className="font-semibold">{row.name}</h2>
                        <p className="text-xs mt-0.5">
                            <ul className="list-none p-0 m-0 text-slate-300" />
                        </p>
                    </div>

                    <ul className="list-none pl-4 mt-[3px]" style={{ paddingLeft: 15 }}>
                        {row.damage.map((d, i) => (
                            <li key={i} style={{ width: 115 }}>
                                <span className="damage-result" title={d.detail}>
                                    <span>{d.total}</span>{" "}
                                    {d.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {expanded && (
                <div className="card-bottom">
                    <ul className="damage-breakdown pl-[45px] mt-[3px]">
                        {row.damage.map((d, i) => (
                            <li key={i}>
                                <span className="damage-result">
                                    <span className="bold"> {d.total} {d.label} |</span> {d.detail}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-2 flex items-center gap-3 pl-[45px]">
                <label className="text-xs flex items-center gap-2 select-none">
                    <input
                        type="checkbox"
                        className="size-4 accent-slate-200"
                        checked={row.selected}
                        onChange={toggleSelected}
                    />
                    include in total
                </label>
                <button
                    type="button"
                    className="text-[11px] text-slate-300/80 underline hover:text-white"
                    onClick={toggleExpanded}
                >
                    {expanded ? "hide details" : "show details"}
                </button>
            </div>
        </section>
    );
}

function formatClock(ts: number) {
    const s = new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    // lower-case the AM/PM to approximate "hh:mm a"
    return s.toLowerCase();
}
