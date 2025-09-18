/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReadyPane from "./ReadyPane";

const actions = [
    { id: "a1", characterId: "c1", name: "Shortsword", favorite: false, factorsJson: { toHit: { signStatic: 1, static: 0, dice: [] }, damage: [] } },
];

const modifiers = [
    { id: "m1", characterId: "c1", name: "Rage", favorite: false, factorsJson: { eachAttack: true, attackImpact: { signStatic: 1, static: 0, dice: [] }, damage: [] } },
];

describe("ReadyPane management hooks", () => {
    it("renders Edit/Delete controls when callbacks are provided", () => {
        const onEditAction = jest.fn();
        const onDeleteAction = jest.fn();
        const onEditModifier = jest.fn();
        const onDeleteModifier = jest.fn();

        render(
            <ReadyPane
                actions={actions as any}
                modifiers={modifiers as any}
                tallies={{}}
                onTally={jest.fn()}
                selectedPerActionModifierIds={new Set()}
                selectedPerTurnModifierIds={new Set()}
                onToggleModifier={jest.fn()}
                onEditAction={onEditAction}
                onDeleteAction={onDeleteAction}
                onEditModifier={onEditModifier}
                onDeleteModifier={onDeleteModifier}
                preferences={{ critRules: "5e-double", critThreshold: 20, advRules: true, uniqueDamageTypes: [] }}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Edit: Shortsword/i }));
        fireEvent.click(screen.getByRole("button", { name: /Delete: Shortsword/i }));
        fireEvent.click(screen.getByRole("button", { name: /Edit: Rage/i }));
        fireEvent.click(screen.getByRole("button", { name: /Delete: Rage/i }));

        expect(onEditAction).toHaveBeenCalledWith("a1");
        expect(onDeleteAction).toHaveBeenCalledWith("a1");
        expect(onEditModifier).toHaveBeenCalledWith("m1");
        expect(onDeleteModifier).toHaveBeenCalledWith("m1");
    });
});
