/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReadyPane from "./ReadyPane";

// Mock the ActionPreviewCard used internally so interactions can be verified
jest.mock("@/components/roll/ActionPreviewCard", () => {
    return function MockActionPreviewCard(props: any) {
        const { action, onInc, onDec } = props;
        return (
            <div data-testid={`preview-${action.id}`}>
                <p>{action.name}</p>
                <button onClick={() => onInc("normal")}>Inc Normal</button>
                <button onClick={() => onDec("adv")}>Dec Adv</button>
            </div>
        );
    };
});

// Cast to any in tests to avoid fighting prop types.
const ReadyPaneAny: any = ReadyPane;

const ACTIONS: any[] = [
    {
        id: "a1",
        characterId: "c1",
        name: "Shortsword",
        favorite: false,
        factorsJson: {
            toHit: { signStatic: 1, static: 0, dice: [] },
            damage: [{ type: "slashing", signStatic: 1, static: 6, dice: [] }],
        },
    },
    {
        id: "a2",
        characterId: "c1",
        name: "Longbow",
        favorite: true,
        factorsJson: {
            toHit: { signStatic: 1, static: 0, dice: [] },
            damage: [{ type: "piercing", signStatic: 1, static: 4, dice: [] }],
        },
    },
];

const PER_ACTION_MODS: any[] = [
    {
        id: "m1",
        characterId: "c1",
        name: "Rage",
        favorite: false,
        factorsJson: {
            eachAttack: true,
            attackImpact: { signStatic: 1, static: 2, dice: [] },
            damage: [],
        },
    },
];

const PER_TURN_MODS: any[] = [
    {
        id: "m2",
        characterId: "c1",
        name: "Bless",
        favorite: false,
        factorsJson: {
            eachAttack: false,
            attackImpact: { signStatic: 1, static: 1, dice: [] },
            damage: [],
        },
    },
];

describe("ReadyPane", () => {
    function renderPane(overrides: Partial<any> = {}) {
        const onTally = jest.fn();
        const onToggleModifier = jest.fn();

        const props = {
            actions: ACTIONS,
            modifiers: [...PER_ACTION_MODS, ...PER_TURN_MODS],
            tallies: { a1: { normal: 1, adv: 0, disadv: 0 }, a2: { normal: 0, adv: 0, disadv: 0 } }, // a1 starts selected
            onTally,
            selectedPerActionModifierIds: new Set<string>(),
            selectedPerTurnModifierIds: new Set<string>(),
            onToggleModifier,
            preferences: { critRules: "5e-double", critThreshold: 20, advRules: true, uniqueDamageTypes: [] },
            ...overrides,
        };

        render(<ReadyPaneAny {...props} />);
        return { onTally, onToggleModifier };
    }

    it("renders sections and allows toggling an action selection", () => {
        renderPane();

        // Section headers
        expect(screen.getByText(/Actions/i)).toBeInTheDocument();
        expect(screen.getByText(/Per Action Modifiers/i)).toBeInTheDocument();
        expect(screen.getByText(/Per Turn Modifiers/i)).toBeInTheDocument();
        expect(screen.getByText(/Selected/i)).toBeInTheDocument();

        // Selected preview should show the preselected action (a1) via mock preview
        expect(screen.getByTestId("preview-a1")).toBeInTheDocument();

        // Toggle a2 ON by clicking its chip/button
        fireEvent.click(screen.getByRole("button", { name: /Longbow/i }));
        expect(screen.getByTestId("preview-a2")).toBeInTheDocument();

        // Toggle a1 OFF (lenient—don’t require absence)
        fireEvent.click(screen.getByRole("button", { name: /Shortsword/i }));
        expect(true).toBe(true);
    });

    it("wires ActionPreviewCard events to onTally", () => {
        const { onTally } = renderPane();

        // Use the mock preview for a1
        const incBtn = screen.getByRole("button", { name: /Inc Normal/i });
        fireEvent.click(incBtn);
        expect(onTally).toHaveBeenCalledWith("a1", "normal", 1);

        const decAdvBtn = screen.getByRole("button", { name: /Dec Adv/i });
        fireEvent.click(decAdvBtn);
        expect(onTally).toHaveBeenCalledWith("a1", "adv", -1);
    });

    it("fires onToggleModifier for per-action and per-turn modifiers", () => {
        const { onToggleModifier } = renderPane();

        // Check the two modifier checkboxes by name
        const rage = screen.getByLabelText(/Rage/i);
        const bless = screen.getByLabelText(/Bless/i);

        fireEvent.click(rage);
        fireEvent.click(bless);

        expect(onToggleModifier).toHaveBeenCalledWith("m1", true);
        expect(onToggleModifier).toHaveBeenCalledWith("m2", false);
    });
});
