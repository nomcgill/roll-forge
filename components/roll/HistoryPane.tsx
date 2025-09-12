// components/roll/HistoryPane.tsx
"use client";

import * as React from "react";
import type { HistoryGroup, HistoryRow } from "@/lib/roll/engine";

type Props = {
    /** groups newest-first is fine; this component won't reorder */
    history: HistoryGroup[];
    /** optional: start with rows selected; defaults to true */
    startSelected?: boolean;
    /** when a row toggles, let parent recompute totals if desired (optional) */
    onToggleRow?: (groupId: string, rowId: string, next: boolean) => void;
};

export default function HistoryPane({ history, onToggleRow }: Props) {
    return (
        <div className="min-w-full w-full max-w-full basis-full snap-start overflow-x-hidden md:min-w-0">
            {history.map((g) => (
                <section key={g.id} className="attackSet activeSection w-full max-w-full overflow-x-hidden rounded-xl border border-slate-700 p-3">
                    {g.rows.map((row) => (
                        <Row key={row.id} gId={g.id} row={row} onToggleRow={onToggleRow} />
                    ))}

                    <div className="flex items-end justify-between mt-2">
                        <p className="text-xs opacity-70">{g.timestampLabel} — newest</p>
                        <div className="damage-total-area font-extrabold">
                            <p>{g.totals.grand} DAMAGE TOTAL</p>
                            <ul className="list-none pl-0">
                                {g.totals.byType.map((t) => (
                                    <li key={t.label}>{t.total} {t.label}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}

function Row({
    gId,
    row,
    onToggleRow,
}: {
    gId: string;
    row: HistoryRow;
    onToggleRow?: (groupId: string, rowId: string, next: boolean) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState(row.selected);

    const toggleSelect = () => {
        const next = !selected;
        setSelected(next);
        onToggleRow?.(gId, row.id, next);
    };

    return (
        <section
            className={`attackSet-attack activeSection rounded-lg border border-slate-700/70 mb-2 ${selected ? "" : "opacity-60"}`}
            onContextMenu={(e) => {
                e.preventDefault();
                setOpen((v) => !v);
            }}
            onMouseDown={(e) => {
                if (e.button === 1) { // middle click to toggle
                    e.preventDefault();
                    toggleSelect();
                }
            }}
        >
            <div className="attackSet-top p-2 flex items-start gap-3">
                <div className="attack-result min-w-10 text-center font-black">
                    {row.kind === "action" ? row.successTotal : "+"}
                </div>

                <div className="flex-1 min-w-0 attack-card flex items-start justify-between gap-3">
                    <div>
                        <h2 className="font-semibold">{row.name}</h2>
                        <p className="text-xs">
                            {row.mode === "adv" ? "Advantage" : row.mode === "disadv" ? "Disadvantage" : ""}
                            {row.crit ? (row.mode ? " · " : "") + "Crit" : ""}
                        </p>
                        {row.kind === "action" && (
                            <p className="text-xs opacity-80">{row.successDetail}</p>
                        )}
                    </div>

                    <ul className="list-none p-0 m-0 flex flex-wrap gap-2 w-full">
                        {row.damage.map((d, i) => (
                            <li key={i} className="w-[130px]">
                                <span
                                    title={d.parts.join(" | ")}
                                    className="damage-result block text-sm break-words"
                                >
                                    <span className="font-semibold">{d.amount}</span> {d.typeLabel}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    type="button"
                    onClick={toggleSelect}
                    className="text-xs rounded border px-2 py-1 border-slate-600 hover:bg-slate-800"
                    aria-pressed={selected}
                >
                    {selected ? "Selected" : "Excluded"}
                </button>
            </div>

            {open && (
                <div className="card-bottom px-4 pb-2">
                    <ul className="damage-breakdown list-none pl-8 mt-1 space-y-1">
                        {row.damage.map((d, i) => (
                            <li key={i}>
                                <span className="damage-result">
                                    <span className="font-bold"> {d.amount} {d.typeLabel} |</span>{" "}
                                    {d.parts.join("  ·  ")}
                                    {d.source ? `  ·  ${d.source}` : ""}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
