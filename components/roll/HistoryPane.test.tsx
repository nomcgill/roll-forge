/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react"; import HistoryPane from "./HistoryPane";

// Cast to any to relax prop checking for test-only object shapes.
const HistoryPaneAny: any = HistoryPane;

function sampleHistory() {
    return [
        {
            id: "g1",
            timestamp: Date.now(),
            timestampLabel: "Just now",
            tz: "America/Chicago",
            rows: [
                {
                    id: "r1",
                    kind: "action",
                    actionId: "a1",
                    name: "Shortsword",
                    mode: "normal",
                    crit: false,
                    successTotal: 15,
                    successDetail: "9 or 15 (+6)",
                    damage: [
                        {
                            amount: 12,
                            typeLabel: "slashing",
                            parts: ["2d6 → 3, 3", "+6"],
                            source: "",
                        },
                    ],
                    selected: true,
                },
            ],
            totals: { grand: 12, byType: [{ label: "slashing", total: 12 }] },
        },
    ];
}

describe("HistoryPane", () => {
    it("renders a history group and totals", () => {
        render(<HistoryPaneAny history={sampleHistory()} />);

        expect(screen.getByText(/Shortsword/i)).toBeInTheDocument();
        expect(screen.getByText(/12 DAMAGE TOTAL/i)).toBeInTheDocument();
        // Scope to the totals block so we don't collide with the per-row damage label.
        const totalsArea = screen.getByText(/DAMAGE TOTAL/i).closest("div") as HTMLElement;
        expect(totalsArea).toBeInTheDocument();
        expect(within(totalsArea).getByText(/slashing/i)).toBeInTheDocument();
    });

    it("calls onToggleRow when a row is middle-clicked", () => {
        const onToggleRow = jest.fn();
        render(<HistoryPaneAny history={sampleHistory()} onToggleRow={onToggleRow} />);

        // Find the row's section via its name then walk up to the section element
        const nameEl = screen.getByText(/Shortsword/i);
        const rowSection = nameEl.closest("section");
        if (!rowSection) throw new Error("Expected a section for the row");

        // Middle-click (button === 1) toggles selection
        fireEvent.mouseDown(rowSection, { button: 1 });

        expect(onToggleRow).toHaveBeenCalledWith("g1", "r1", false);
    });
});
